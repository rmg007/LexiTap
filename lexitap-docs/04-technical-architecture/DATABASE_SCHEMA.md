---
title: Database Schema
category: technical
status: active
updated: 2026-05-31
priority: P0
tags: [database, schema, sqlite, supabase, srs, soft-delete, append-only, migrations, two-db, attach, blob-backup, many-to-many, word-tiers]
---

# Database Schema

Canonical v3.1 schema reference for the LexiTap data model. Documents every table, columns, indexes, invariants, and rationale for soft-delete, append-only logs, the two-DB ATTACH strategy, and the encrypted blob backup approach for cloud sync. The operational invariants are mirrored as the Schema Reviewer checklist in [../05-engineering-process/AGENTS_CLAUDE.md](../05-engineering-process/AGENTS_CLAUDE.md).

> **v3.1 — word↔category is many-to-many.** `words.tier_id` (single-FK) was replaced by a `word_tiers(word_id, tier_id)` junction, and word IDs are now category-independent (`word_${sha1(normalize(word))}`). One word is one `words` row and one `user_progress` row across every category it is tagged into. Rationale: a word like *feature* legitimately belongs to Foundation **and** Most Common 3000 **and** an exam list at once; a per-category id would split its review history. See [REVENUE_MODEL_PRICING.md](../08-financial-legal/REVENUE_MODEL_PRICING.md) (content category vs. store product).

## Table of Contents

- [Version and Engines](#version-and-engines)
- [Two-Database Layout](#two-database-layout)
- [Content DB: words.db (read-only)](#content-db-wordsdb-read-only)
  - [content_tiers](#content_tiers)
  - [words](#words)
  - [word_tiers](#word_tiers-word--category-junction)
- [User DB: user.db (read-write)](#user-db-userdb-read-write)
  - [user_progress](#user_progress-srs-hot-state)
  - [quiz_sessions](#quiz_sessions)
  - [quiz_attempts](#quiz_attempts-append-only)
  - [event_log](#event_log-append-only)
  - [user_stats](#user_stats-streak--forgiveness-state)
  - [notification_schedule](#notification_schedule)
  - [schema_version](#schema_version)
- [Cross-DB Queries (ATTACH)](#cross-db-queries-attach)
- [Supabase: Cloud Layer](#supabase-cloud-layer)
- [Soft-Delete Rationale](#soft-delete-rationale)
- [Append-Only Rationale](#append-only-rationale)
- [Migration Strategy](#migration-strategy)
- [Invariants and Query Conventions](#invariants-and-query-conventions)

---

## Version and Engines

**Schema version:** v3.0. **Mobile:** SQLite via `expo-sqlite`. **Cloud:** Supabase Postgres (auth + content-error reports + encrypted `user.db` blob backups). Migrations are versioned, forward-only, and live in `src/infrastructure/db/migrations/` (mobile) and Supabase migration files (cloud).

## Two-Database Layout

| Database | Mode | Owner | Tables |
|----------|------|-------|--------|
| `words.db` | read-only, bundled in binary | Track A content CLI | `content_tiers`, `words`, `word_tiers` |
| `user.db` | read-write, on device | mobile app | `user_progress`, `quiz_sessions`, `quiz_attempts`, `event_log`, `user_stats`, `notification_schedule`, `schema_version` |
| Supabase | cloud Postgres | mobile app | `user_accounts`, `content_errors`, `user_db_backups` |

Device is always authoritative. Cloud is never queried for live game state. Rationale and ATTACH mechanics: [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md#two-database-strategy).

## Content DB: words.db (read-only)

### content_tiers

Static tier metadata, populated at build time by the content CLI.

```sql
CREATE TABLE content_tiers (
  id            TEXT PRIMARY KEY,     -- "foundation", "toefl"
  name          TEXT NOT NULL,        -- "LexiTap Foundation (CEFR A2-B1)"
  description   TEXT,
  is_free       INTEGER NOT NULL,     -- 1 free, 0 paid
  sku           TEXT,                 -- IAP product id; NULL for free tiers
  word_count    INTEGER NOT NULL,     -- built from sourced content, NOT pre-committed
  display_order INTEGER NOT NULL,
  is_active     INTEGER DEFAULT 1     -- 0 for post-launch drops not yet released
);
```

`price_usd` was removed from this table in v3.0. Pricing is owned by the IAP provider (RevenueCat), not the content DB. A tier's `sku` is its store product id for paid exam packs (`com.lexitap.exam.{name}`) or `NULL` for free tiers. Tiers: free frequency/CEFR categories `foundation`/`advanced`/`common3k`/`common9k` (`sku` NULL), and paid one-time exam packs `toefl`/`ielts`/`gre`/`gmat`/`business`. A tier (content **category**) is not a store **product**; the All-Exams bundle/upgrade SKUs are not tier-level (they grant `all_exams`) and live only in the app's store catalog. See [REVENUE_MODEL_PRICING.md](../08-financial-legal/REVENUE_MODEL_PRICING.md).

### words

Every vocabulary entry, including multi-word units (idioms, phrasal verbs) as flat rows. **One row per unique word** — category membership is NOT here, it lives in [`word_tiers`](#word_tiers-word--category-junction). The `id` is category-independent: `word_${sha1(normalize(word)).slice(0,16)}` (16 hex). The same surface form always resolves to the same row (and therefore one `user_progress` row) no matter how many categories tag it. Editing meaning is done via `definition`/`usage_notes`, never by changing `word` (that re-keys the row and orphans history).

```sql
CREATE TABLE words (
  id               TEXT PRIMARY KEY,   -- "word_0117691d0201f04a" (category-independent hash)
  word             TEXT NOT NULL,      -- multi-word for idioms: "look up to"
  definition       TEXT NOT NULL,
  pos              TEXT,
  cefr_level       TEXT,               -- A2..C2
  grade_level      INTEGER,            -- reserved for future Schools app
  word_type        TEXT,               -- vocabulary|expression|idiom|phrasal_verb
  difficulty       INTEGER,            -- 1-5
  theme            TEXT,               -- "Daily Life" (thematic, not alphabetical)
  example_sentence TEXT NOT NULL,      -- exactly one "_" blank
  image_path       TEXT,
  audio_path       TEXT,               -- universal (word + sentence audio is free, all tiers)
  synonyms         TEXT,               -- JSON array
  antonyms         TEXT,               -- JSON array
  usage_notes      TEXT,
  created_at       INTEGER NOT NULL,
  deleted_at       INTEGER             -- soft-delete; NULL = active
);

CREATE INDEX idx_words_cefr         ON words(cefr_level);
CREATE INDEX idx_words_active       ON words(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_words_alphabetical ON words(word) WHERE deleted_at IS NULL;  -- keyset browse
```

**Invariants:** `example_sentence` contains exactly one `_`; `synonyms`/`antonyms` are valid JSON arrays; multi-word entries set `word_type` and are treated atomically by widgets; every word has ≥1 `word_tiers` membership.

### word_tiers (word ↔ category junction)

Many-to-many membership tagging each word into one or more content categories (tiers). A word with rows for `foundation` + `common3k` + `toefl` appears in all three. Membership is a read-only content tag built by Track A — **not** a store product or entitlement.

```sql
CREATE TABLE word_tiers (
  word_id TEXT NOT NULL,
  tier_id TEXT NOT NULL,
  PRIMARY KEY (word_id, tier_id),
  FOREIGN KEY (word_id) REFERENCES words(id),
  FOREIGN KEY (tier_id) REFERENCES content_tiers(id)
);

-- PRIMARY KEY (word_id, tier_id) serves word -> tiers lookups;
-- this index serves the reverse (tier -> words) browse.
CREATE INDEX idx_word_tiers_tier ON word_tiers(tier_id, word_id);
```

`content_tiers.word_count` is the observed count of `word_tiers` rows for that tier, computed at export — never hardcoded.

## User DB: user.db (read-write)

Entitlement state is intentionally absent. Access control is owned by RevenueCat; the app queries RevenueCat at session start and caches the result in memory only — nothing is persisted to `user.db`.

### user_progress (SRS hot state)

Mutable hot state read on every app open. Pairs with the immutable `quiz_attempts` log.

```sql
CREATE TABLE user_progress (
  word_id             TEXT PRIMARY KEY,
  mastery_level       INTEGER NOT NULL DEFAULT 0,   -- 0-5
  next_review_date    INTEGER NOT NULL,
  last_reviewed_at    INTEGER,
  consecutive_correct INTEGER DEFAULT 0,
  total_attempts      INTEGER DEFAULT 0,
  total_correct       INTEGER DEFAULT 0,
  first_seen_at       INTEGER,
  scheduler_version   TEXT NOT NULL DEFAULT 'v1-fixed',
  FOREIGN KEY (word_id) REFERENCES words(id)
);

CREATE INDEX idx_progress_next_review ON user_progress(next_review_date);
```

**SRS v1-fixed intervals** (mastery 0-5): 0→1 +1d, 1→2 +3d, 2→3 +7d, 3→4 +14d, 4→5 +30d. Incorrect: `mastery -= 1` (min 0), `next_review = now + 1d`. Algorithm lives in `src/domain/srs/v1-fixed.ts`.

### quiz_sessions

One row per quiz session (audit).

```sql
CREATE TABLE quiz_sessions (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  tier_id          TEXT,
  started_at       INTEGER NOT NULL,
  completed_at     INTEGER,         -- NULL = abandoned (prompt resume)
  total_questions  INTEGER,
  total_correct    INTEGER,
  duration_seconds INTEGER,
  quiz_mode        TEXT,            -- "review" | "learn"
  FOREIGN KEY (tier_id) REFERENCES content_tiers(id)
);
```

### quiz_attempts (append-only)

Immutable per-question review log. **Never UPDATE or DELETE.** Carries the replay context (`pre_mastery_level`, `scheduled_review_date`, `scheduler_version`) that lets a future scheduler retrain by replaying history.

```sql
CREATE TABLE quiz_attempts (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id            INTEGER NOT NULL,
  word_id               TEXT NOT NULL,
  assessment_type       TEXT NOT NULL,  -- multiple_choice|drag_drop|image_match|classification
  user_answer           TEXT NOT NULL,
  correct_answer        TEXT NOT NULL,
  is_correct            INTEGER NOT NULL,
  answered_at           INTEGER NOT NULL,
  time_to_answer_ms     INTEGER,
  pre_mastery_level     INTEGER,        -- mastery BEFORE this attempt
  scheduled_review_date INTEGER,       -- next_review_date the scheduler set
  scheduler_version     TEXT,           -- scheduler that produced the schedule
  FOREIGN KEY (session_id) REFERENCES quiz_sessions(id),
  FOREIGN KEY (word_id)    REFERENCES words(id)
);
```

### event_log (append-only)

Offline pending-writes buffer (e.g., `content_errors` awaiting sync). **Not** a general analytics sink — use PostHog/Amplitude for analytics.

```sql
CREATE TABLE event_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type  TEXT NOT NULL,
  payload     TEXT,                  -- JSON
  occurred_at INTEGER NOT NULL
);
CREATE INDEX idx_event_log_occurred ON event_log(occurred_at);
CREATE INDEX idx_event_log_type     ON event_log(event_type);
```

### user_stats (streak + forgiveness state)

Single-row local mirror of the user's streak, freeze, and lifetime totals. `last_activity_local_date` is a `YYYYMMDD` integer in the user's IANA timezone (civil date, **not** epoch) so streak gaps are computed in local calendar days, never UTC. `onboarding_state` is a JSON blob for persisting onboarding progress across sessions.

```sql
CREATE TABLE user_stats (
  id                       INTEGER PRIMARY KEY CHECK (id = 1),  -- single row
  current_streak           INTEGER NOT NULL DEFAULT 0,
  longest_streak           INTEGER NOT NULL DEFAULT 0,
  last_activity_local_date INTEGER,        -- YYYYMMDD in user's IANA tz (civil date)
  total_sessions           INTEGER NOT NULL DEFAULT 0,
  total_words_mastered     INTEGER NOT NULL DEFAULT 0,
  freeze_count             INTEGER NOT NULL DEFAULT 0,
  freezes_granted_total    INTEGER NOT NULL DEFAULT 0,
  last_catchup_anchor_date INTEGER,        -- YYYYMMDD; catch-up window anchor
  onboarding_state         TEXT             -- JSON blob; nullable
);
```

Freeze state is **device-only** — not included in cloud backups. Freeze earning/consumption rules live in [SRS_FORGIVENESS_MECHANICS.md](../02-product-definition/SRS_FORGIVENESS_MECHANICS.md).

### notification_schedule

Stores scheduled local notification metadata so the app can cancel/update them on reschedule without querying the OS notification center.

```sql
CREATE TABLE notification_schedule (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  trigger_date INTEGER NOT NULL,   -- epoch ms
  payload      TEXT,               -- JSON
  created_at   INTEGER NOT NULL
);
CREATE INDEX idx_notification_trigger ON notification_schedule(trigger_date);
```

### schema_version

Tracks applied migration versions. The app checks this on launch against the expected version and runs outstanding migrations in order.

```sql
CREATE TABLE schema_version (
  version     INTEGER PRIMARY KEY,
  applied_at  INTEGER NOT NULL
);
```

## Cross-DB Queries (ATTACH)

`words.db` is the main connection; `user.db` is attached as `userdb`. Active-word queries filter `deleted_at IS NULL`; history/audit queries do not.

```sql
ATTACH DATABASE 'file:user.db' AS userdb;

-- Review queue (active filter). Category filter via the word_tiers junction.
SELECT w.*, p.mastery_level, p.next_review_date
FROM words w
JOIN word_tiers wt ON wt.word_id = w.id
JOIN userdb.user_progress p ON w.id = p.word_id
WHERE wt.tier_id = ? AND w.deleted_at IS NULL AND p.next_review_date <= ?
ORDER BY p.next_review_date ASC LIMIT ?;

-- History render (NO active filter — soft-deleted words still shown)
SELECT a.*, w.word
FROM userdb.quiz_attempts a
JOIN words w ON a.word_id = w.id
WHERE a.session_id = ?;
```

## Keyset Pagination & Performance Indexes

LexiTap uses keyset pagination everywhere (never `OFFSET`, which degrades at O(N)):

### Alphabetical Keyset (words.db)

The order key is `idx_words_alphabetical ON words(word) WHERE deleted_at IS NULL` (defined with the `words` table). The category filter is applied through the `word_tiers` join.

```sql
SELECT w.id, w.word, w.definition, COALESCE(p.mastery_level, 0) AS mastery_level
FROM words w
JOIN word_tiers wt ON wt.word_id = w.id
LEFT JOIN userdb.user_progress p ON w.id = p.word_id
WHERE wt.tier_id = ? AND w.deleted_at IS NULL
  AND (? IS NULL OR w.word > ?)
ORDER BY w.word ASC LIMIT 50;
```

### Review-Date Keyset (user.db)

```sql
CREATE INDEX idx_progress_keyset ON user_progress(next_review_date, word_id);

SELECT w.id, w.word, p.next_review_date
FROM userdb.user_progress p
JOIN words w ON p.word_id = w.id
JOIN word_tiers wt ON wt.word_id = w.id
WHERE wt.tier_id = ? AND w.deleted_at IS NULL
  AND (? IS NULL OR (p.next_review_date > ? OR (p.next_review_date = ? AND p.word_id > ?)))
ORDER BY p.next_review_date ASC, p.word_id ASC LIMIT 50;
```

## Supabase: Cloud Layer

Supabase holds auth, content-error reports, and encrypted `user.db` blob backups. **It is not a row-level sync mirror.** The device is always authoritative; cloud is never queried for live game state.

```sql
-- Auth anchor for cross-device restore
CREATE TABLE user_accounts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email          TEXT UNIQUE NOT NULL,
  display_name   TEXT,
  auth_provider  TEXT NOT NULL,       -- 'email' | 'google' | 'apple'
  timezone       TEXT NOT NULL DEFAULT 'UTC',  -- IANA tz
  created_at     TIMESTAMP DEFAULT NOW(),
  last_synced_at TIMESTAMP,
  is_active      BOOLEAN DEFAULT TRUE
);

-- User-reported content errors (queued in event_log, flushed on sync)
CREATE TABLE content_errors (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES user_accounts(id),
  word_id    TEXT NOT NULL,
  issue_type TEXT NOT NULL,           -- 'wrong_definition' | 'wrong_example' | 'wrong_audio' | 'other'
  note       TEXT,                    -- max 200 chars
  created_at TIMESTAMP DEFAULT NOW(),
  status     TEXT NOT NULL DEFAULT 'pending'
);
CREATE INDEX idx_content_errors_word ON content_errors(word_id);

-- Encrypted user.db blob (Phase 3+)
-- user.db is AES-256 encrypted client-side before upload. Supabase Storage holds the blob;
-- this table stores metadata only. Key is derived from user's auth token, never stored.
CREATE TABLE user_db_backups (
  user_id     UUID PRIMARY KEY REFERENCES user_accounts(id),
  storage_key TEXT NOT NULL,          -- path in Supabase Storage bucket
  backup_size INTEGER,                -- bytes
  backed_up_at TIMESTAMP DEFAULT NOW()
);
```

Streak boundaries are always evaluated in the user's IANA timezone (AsyncStorage source of truth, mirrored to `user_accounts.timezone`). Per-table sync mirrors (`user_progress_sync`, `user_entitlements_sync`, `user_stats_sync`) were removed in v3.0.

## Soft-Delete Rationale

`words.deleted_at` is a soft-delete. Hard-deleting orphans `quiz_attempts` and `user_progress` rows, breaking history rendering and scheduler replay. Learn/review queries filter `WHERE deleted_at IS NULL`; history/stats/replay queries do not.

## Append-Only Rationale

`quiz_attempts` and `event_log` are append-only, preserving an immutable audit trail and enabling future scheduler replay (e.g., FSRS in Year 2). Corrections are compensating inserts, never mutations.

## Migration Strategy

Forward-only, versioned, never DROP. Mobile migrations in `src/infrastructure/db/migrations/`, applied on launch via `schema_version` table.

```sql
-- 001_initial_schema.ts    all CREATE TABLE for user.db (v3.0 schema)
```

On content updates, a newer bundled `words.db` replaces the on-device content DB; `user.db` is never dropped.

## Invariants and Query Conventions

1. Parameterized queries only — no raw SQL string interpolation anywhere.
2. Active-word queries filter `deleted_at IS NULL`; history/audit queries do not.
3. Never UPDATE/DELETE `quiz_attempts` or `event_log` — insert compensating rows.
4. Every SRS write tags `scheduler_version`.
5. Timestamps from JS `Date.now()` (not SQL `CURRENT_TIMESTAMP`).
6. Missing `user_progress` row auto-inserts with `mastery=0`, `next_review=now`.
7. Entitlement state is never persisted to `user.db` — RevenueCat is the source of truth.
