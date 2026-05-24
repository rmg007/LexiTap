---
title: Database Schema
category: technical
status: active
updated: 2026-05-24
priority: P0
tags: [database, schema, sqlite, supabase, srs, soft-delete, append-only, sync, migrations, two-db, attach]
---

# Database Schema

Comprehensive v2.1 schema reference. The operating summary is [../../notion-docs/DATABASE_SCHEMA.md](../../notion-docs/DATABASE_SCHEMA.md); this document expands every table with columns, indexes, invariants, and the rationale behind soft-delete, append-only logs, the two-DB ATTACH strategy, the Supabase sync mirrors, and migrations. Do not contradict the operating summary; this is its superset.

## Table of Contents

- [Version and Engines](#version-and-engines)
- [Two-Database Layout](#two-database-layout)
- [Content DB: words.db (read-only)](#content-db-wordsdb-read-only)
  - [content_tiers](#content_tiers)
  - [words](#words)
- [User DB: user.db (read-write)](#user-db-userdb-read-write)
  - [user_entitlements](#user_entitlements)
  - [user_progress](#user_progress-srs-hot-state)
  - [quiz_sessions](#quiz_sessions)
  - [quiz_attempts](#quiz_attempts-append-only)
  - [event_log](#event_log-append-only)
- [Cross-DB Queries (ATTACH)](#cross-db-queries-attach)
- [Supabase: Sync Mirror Tables](#supabase-sync-mirror-tables)
- [Supabase: Teacher / Referral / Promo](#supabase-teacher--referral--promo)
- [Soft-Delete Rationale](#soft-delete-rationale)
- [Append-Only Rationale](#append-only-rationale)
- [Migration Strategy](#migration-strategy)
- [Invariants and Query Conventions](#invariants-and-query-conventions)
- [Open Questions](#open-questions)

---

## Version and Engines

**Schema version:** v2.1. **Mobile:** SQLite via `expo-sqlite`. **Cloud:** Supabase Postgres (sync mirrors + teacher backend). Migrations are versioned, forward-only, and live in `src/infrastructure/db/migrations/` (mobile) and Supabase migration files (cloud).

## Two-Database Layout

| Database | Mode | Owner | Tables |
|----------|------|-------|--------|
| `words.db` | read-only, bundled in binary | Track A content CLI | `content_tiers`, `words` |
| `user.db` | read-write, on device | mobile app | `user_entitlements`, `user_progress`, `quiz_sessions`, `quiz_attempts`, `event_log` |
| Supabase | cloud Postgres | mobile app + portal | sync mirrors + `user_accounts`, `teachers`, `referrals`, `promo_codes` |

Rationale and ATTACH mechanics: [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md#two-database-strategy).

## Content DB: words.db (read-only)

### content_tiers

Static tier metadata, populated at build time by the content CLI.

```sql
CREATE TABLE content_tiers (
  id            TEXT PRIMARY KEY,     -- "foundation", "toefl"
  name          TEXT NOT NULL,        -- "LexiTap Foundation (CEFR A2-B1)"
  description   TEXT,
  is_free       INTEGER NOT NULL,     -- 1 free, 0 paid
  price_usd     REAL,                 -- NULL if free
  sku           TEXT,                 -- IAP product id, e.g. 'com.lexitap.toefl'
  word_count    INTEGER NOT NULL,     -- built from sourced content, NOT pre-committed
  display_order INTEGER NOT NULL,
  is_active     INTEGER DEFAULT 1     -- 0 for post-launch drops not yet released
);
```

Launch-wave tiers: `foundation`/`advanced` (free), `toefl`/`ielts` ($14.99), `business` ($9.99), `common3k` ($2.99). Post-launch (`is_active=0` until released): `gre`, `gmat`, `idioms`, `phrasal_verbs`. `word_count` is populated from actual sourced content — never hardcoded at planning time.

### words

Every vocabulary entry across all tiers, including multi-word units (idioms, phrasal verbs) as flat rows.

```sql
CREATE TABLE words (
  id               TEXT PRIMARY KEY,   -- "word_foundation_001"
  word             TEXT NOT NULL,      -- multi-word for idioms: "look up to"
  definition       TEXT NOT NULL,
  tier_id          TEXT NOT NULL,
  pos              TEXT,
  cefr_level       TEXT,               -- A2..C2
  grade_level      INTEGER,            -- reserved for future Schools app
  word_type        TEXT,               -- vocabulary|expression|idiom|phrasal_verb
  difficulty       INTEGER,            -- 1-5
  theme            TEXT,               -- "Daily Life" (thematic, not alphabetical)
  example_sentence TEXT NOT NULL,      -- exactly one "_" blank
  image_path       TEXT,
  audio_path       TEXT,               -- launch: TOEFL only
  synonyms         TEXT,               -- JSON array
  antonyms         TEXT,               -- JSON array
  usage_notes      TEXT,
  created_at       INTEGER NOT NULL,
  deleted_at       INTEGER,            -- soft-delete; NULL = active
  FOREIGN KEY (tier_id) REFERENCES content_tiers(id)
);

CREATE INDEX idx_words_tier   ON words(tier_id);
CREATE INDEX idx_words_cefr   ON words(cefr_level);
CREATE INDEX idx_words_active ON words(deleted_at) WHERE deleted_at IS NULL;
```

**Invariants:** `example_sentence` contains exactly one `_`; `synonyms`/`antonyms` are valid JSON arrays; multi-word entries set `word_type` and are treated atomically by widgets (DragDrop tokenizes on whitespace within the entry; distractors are sampled from the same `tier_id`).

## User DB: user.db (read-write)

### user_entitlements

Purchased paid tiers. Free tiers are implicitly unlocked and never stored here.

```sql
CREATE TABLE user_entitlements (
  tier_id       TEXT PRIMARY KEY,
  purchased_at  INTEGER NOT NULL,
  expires_at    INTEGER,            -- NULL one-time, set for annual
  receipt_token TEXT,
  FOREIGN KEY (tier_id) REFERENCES content_tiers(id)
);
```

Premium Pass unlocks all paid tiers (current and future, including ones whose `content_tiers.is_active` flips on later) — checked in the application layer, not encoded as one row per tier.

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

**SRS v1-fixed intervals** (mastery 0-5): 0→1 +1d, 1→2 +3d, 2→3 +7d, 3→4 +14d, 4→5 +30d. Incorrect: `mastery -= 1` (min 0), `next_review = now + 1d`. Algorithm lives in `src/domain/srs/v1-fixed.ts`. FSRS is deliberately deferred; `scheduler_version` makes a future migration safe via replay.

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
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id           INTEGER NOT NULL,
  word_id              TEXT NOT NULL,
  assessment_type      TEXT NOT NULL,  -- multiple_choice|drag_drop|image_match|classification
  user_answer          TEXT NOT NULL,
  correct_answer       TEXT NOT NULL,
  is_correct           INTEGER NOT NULL,
  answered_at          INTEGER NOT NULL,
  time_to_answer_ms    INTEGER,
  pre_mastery_level    INTEGER,        -- mastery BEFORE this attempt
  scheduled_review_date INTEGER,       -- next_review_date the scheduler set
  scheduler_version    TEXT,           -- scheduler that produced the schedule
  FOREIGN KEY (session_id) REFERENCES quiz_sessions(id),
  FOREIGN KEY (word_id)    REFERENCES words(id)
);
```

If a recorded attempt is wrong, insert a compensating row — do not mutate.

### event_log (append-only)

Device-only audit/replay log. Written **synchronously** in the same local transaction as the stats update it accompanies — no background worker, no queue.

```sql
CREATE TABLE event_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type  TEXT NOT NULL,         -- review_completed|session_ended|tier_unlocked|...
  payload     TEXT,                  -- JSON
  occurred_at INTEGER NOT NULL
);
CREATE INDEX idx_event_log_occurred ON event_log(occurred_at);
CREATE INDEX idx_event_log_type     ON event_log(event_type);
```

## Cross-DB Queries (ATTACH)

`words.db` is the main connection; `user.db` is attached as `userdb`. Active-word queries filter `deleted_at IS NULL`; history/audit queries do not (they must render rows for words since removed).

```sql
ATTACH DATABASE 'file:user.db' AS userdb;

-- Review queue (active filter)
SELECT w.*, p.mastery_level, p.next_review_date
FROM words w
JOIN userdb.user_progress p ON w.id = p.word_id
WHERE w.tier_id = ? AND w.deleted_at IS NULL AND p.next_review_date <= ?
ORDER BY p.next_review_date ASC LIMIT ?;

-- History render (NO active filter — soft-deleted words still shown)
SELECT a.*, w.word
FROM userdb.quiz_attempts a
JOIN words w ON a.word_id = w.id
WHERE a.session_id = ?;
```

## Supabase: Sync Mirror Tables

Cloud mirrors of `user.db` state. **Cloud is a mirror, not authority.** Last-write-wins by `last_reviewed_at`. Pushed on app close, pulled on app open.

```sql
CREATE TABLE user_accounts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  display_name  TEXT,
  auth_provider TEXT NOT NULL,          -- 'email' | 'google'
  timezone      TEXT NOT NULL DEFAULT 'UTC',  -- IANA tz; AsyncStorage is source of truth
  created_at    TIMESTAMP DEFAULT NOW(),
  last_synced_at TIMESTAMP,
  is_active     BOOLEAN DEFAULT TRUE
);
CREATE INDEX idx_user_email ON user_accounts(email);

CREATE TABLE user_progress_sync (
  user_id          UUID NOT NULL REFERENCES user_accounts(id),
  word_id          TEXT NOT NULL,
  mastery_level    INTEGER NOT NULL,
  next_review_date BIGINT NOT NULL,
  last_reviewed_at BIGINT,
  consecutive_correct INTEGER,
  total_attempts   INTEGER,
  total_correct    INTEGER,
  first_seen_at    BIGINT,
  synced_at        TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, word_id)
);
CREATE INDEX idx_sync_user ON user_progress_sync(user_id);

CREATE TABLE user_entitlements_sync (
  user_id       UUID NOT NULL REFERENCES user_accounts(id),
  tier_id       TEXT NOT NULL,
  purchased_at  BIGINT NOT NULL,
  expires_at    BIGINT,
  receipt_token TEXT,
  synced_at     TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, tier_id)
);

CREATE TABLE user_stats_sync (
  user_id              UUID PRIMARY KEY REFERENCES user_accounts(id),
  current_streak       INTEGER DEFAULT 0,
  longest_streak       INTEGER DEFAULT 0,
  last_activity_date   BIGINT,
  total_sessions       INTEGER DEFAULT 0,
  total_words_mastered INTEGER DEFAULT 0,
  synced_at            TIMESTAMP DEFAULT NOW()
);
```

Streak boundaries are evaluated in the user's IANA timezone (AsyncStorage source of truth, mirrored to `user_accounts.timezone`), never UTC or device-current tz at travel time. No retroactive re-anchoring.

## Supabase: Teacher / Referral / Promo

```sql
CREATE TABLE teachers (
  id UUID PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
  referral_code TEXT UNIQUE NOT NULL, total_referrals INTEGER DEFAULT 0,
  total_earnings DECIMAL DEFAULT 0, current_tier INTEGER DEFAULT 1,  -- 1-4
  paypal_email TEXT, created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE referrals (
  id UUID PRIMARY KEY, teacher_id UUID REFERENCES teachers(id),
  teacher_code TEXT NOT NULL, product_id TEXT NOT NULL,
  product_price DECIMAL NOT NULL, student_discount DECIMAL NOT NULL,
  student_paid DECIMAL NOT NULL, teacher_commission_rate DECIMAL NOT NULL,
  teacher_commission DECIMAL NOT NULL, tier_at_purchase INTEGER NOT NULL,
  purchased_at TIMESTAMP DEFAULT NOW(), receipt_id TEXT UNIQUE
);

CREATE TABLE promo_codes (
  id UUID PRIMARY KEY, code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,                 -- 'free_module' | 'free_premium'
  free_product_id TEXT, uses_remaining INTEGER DEFAULT 1,
  uses_count INTEGER DEFAULT 0, expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(), is_active BOOLEAN DEFAULT TRUE
);
```

RLS policies for these are in [SECURITY_MODEL.md](./SECURITY_MODEL.md); the RPC surface is in [API_CONTRACT.md](./API_CONTRACT.md).

## Soft-Delete Rationale

`words.deleted_at` is a soft-delete. Hard-deleting a word would orphan `quiz_attempts` and `user_progress` rows that reference it, breaking history rendering and any future scheduler replay. Convention: learn/review queue queries filter `WHERE deleted_at IS NULL`; history/stats/replay queries do not filter so they can still render the historical word. Enforced by the Schema Reviewer checklist in [../../notion-docs/AGENTS_MOBILE_CONVENTIONS.md](../../notion-docs/AGENTS_MOBILE_CONVENTIONS.md).

## Append-Only Rationale

`quiz_attempts` and `event_log` are append-only. This preserves an immutable audit trail and — critically — lets a future scheduler (e.g., FSRS in Year 2) be trained by replaying every historical review with the original `scheduler_version` and `pre_mastery_level`. Mutating history would make replay produce wrong schedules. Corrections are compensating inserts.

## Migration Strategy

Forward-only, versioned, never DROP. Mobile migrations in `src/infrastructure/db/migrations/`, applied on launch via `PRAGMA user_version`.

```sql
-- 001_initial_schema.sql       all CREATE TABLE for user.db
-- 002_add_idiom_support.sql    ALTER TABLE words ADD COLUMN word_type ...
-- 003_v2_review_log_and_event_log.sql
ALTER TABLE words ADD COLUMN deleted_at INTEGER;
CREATE INDEX idx_words_active ON words(deleted_at) WHERE deleted_at IS NULL;
ALTER TABLE user_progress ADD COLUMN scheduler_version TEXT NOT NULL DEFAULT 'v1-fixed';
ALTER TABLE quiz_attempts ADD COLUMN pre_mastery_level INTEGER;
ALTER TABLE quiz_attempts ADD COLUMN scheduled_review_date INTEGER;
ALTER TABLE quiz_attempts ADD COLUMN scheduler_version TEXT;
-- + CREATE TABLE event_log (...)
```

Supabase-side v2 migration: `ALTER TABLE user_accounts ADD COLUMN timezone TEXT NOT NULL DEFAULT 'UTC';`. On content updates, a newer bundled `words.db` (higher `PRAGMA user_version`) replaces the on-device content DB; `user.db` is never dropped.

## Invariants and Query Conventions

1. Parameterized queries only — no raw SQL string interpolation, no raw SQL in components.
2. Active-word queries filter `deleted_at IS NULL`; history/audit queries do not.
3. Never UPDATE/DELETE `quiz_attempts` or `event_log` — insert compensating rows.
4. Every SRS write tags `scheduler_version`.
5. Timestamps from JS `Date.now()` (avoid SQL `CURRENT_TIMESTAMP` to dodge clock-skew issues).
6. Missing `user_progress` row auto-inserts with `mastery=0`, `next_review=now`.

## Open Questions

- Whether `user.db` should also keep a local mirror of `user_stats` or recompute from `event_log` on demand (currently recompute; revisit if perf demands a cached table).
- RLS-enforced delete cascade on account deletion vs Edge Function cleanup — leaning RLS cascade.
