# Database Schema (Multi-Tier + Paywall)

---
title: Database Schema (Multi-Tier + Paywall)
category: technical
status: active
phase: 1
priority: P0
updated: 2026-05-22
load_order: 5
tags: [database, schema, sqlite, supabase, srs, paywall, entitlements, sync, soft-delete, append-only, scheduler, words, tiers, cloud-sync]
---

> Load order: 5 of 14. Load when touching database schema, migrations, or SQLite queries. Required reading before Schema Reviewer checklist in AGENTS_MOBILE_CONVENTIONS.md.

## Table of Contents

- [Schema Overview](#schema-overview)
- [Core Tables](#core-tables)
  - [1. content_tiers](#1-content_tiers)
  - [2. words](#2-words)
  - [3. user_entitlements](#3-user_entitlements)
  - [4. user_progress (SRS hot state)](#4-user_progress-srs-hot-state)
  - [5. quiz_sessions](#5-quiz_sessions)
  - [6. quiz_attempts (immutable review log)](#6-quiz_attempts-immutable-review-log)
- [Teacher Referral Tables (Supabase)](#teacher-referral-tables-supabase-backend)
- [Query Functions](#query-functions)
- [Migration Strategy](#migration-strategy)
- [Edge Cases](#edge-cases)
- [Performance Notes](#performance-notes)
- [Cloud Sync Tables (Supabase)](#cloud-sync-tables-supabase-backend)
- [Sync Strategy](#sync-strategy)
- [Sync Edge Cases](#sync-edge-cases)
- [Changelog](#changelog)

---

**Version:** v2.1 (updated 2026-05-22 — see Changelog at bottom)

**Database:** SQLite via expo-sqlite (mobile) + Supabase Postgres (sync + teacher backend)

**Migration Strategy:** Versioned, append-only migrations in `src/db/migrations/`

---

## Schema Overview

Supports:

1. Multi-tier content — free Foundation/Advanced + paid launch wave (TOEFL/IELTS/Business/Common 3K) + post-launch drops (GRE/GMAT/Idioms/Phrasal Verbs). **Multi-word units (idioms, phrasal verbs) are flat entries in the same `words` table** — no separate chunking schema. Productive/family lexical-chunk modeling (word families, productive patterns, collocation-strength scoring) is deferred to Year 2.
2. Paywall/entitlement tracking
3. Spaced repetition across all tiers (hot state in `user_progress` + immutable log in `quiz_attempts`)
4. Progress/mastery per word (or per multi-word entry, treated identically)
5. Gamification (streaks, unlocks) — timezone-aware
6. **☁️ Cloud sync (FREE for all users)**
7. Teacher referral system
8. Promo codes (free unlocks)
9. Local event log (audit / replay) — append-only, device-only
10. Soft-delete on shipped content + scheduler_version tag (forward-compat)

---

## Core Tables

### 1. `content_tiers`

Metadata about each content tier. Static, populated at install.

```sql
CREATE TABLE content_tiers (
  id TEXT PRIMARY KEY,              -- e.g., "foundation", "toefl"
  name TEXT NOT NULL,               -- "Foundation (CEFR A2-B1)"
  description TEXT,
  is_free INTEGER NOT NULL,         -- 1 if free, 0 if paid
  price_usd REAL,                   -- NULL if free
  sku TEXT,                         -- Apple/Google IAP product ID: 'com.lexitap.toefl', 'com.lexitap.ielts', etc.
  word_count INTEGER NOT NULL,
  display_order INTEGER NOT NULL,
  is_active INTEGER DEFAULT 1
);
```

**Example rows (word counts populated by content tool at build time from actual sourced content — not pre-committed):**

- `('foundation', 'LexiTap Foundation (CEFR A2-B1)', '...', 1, NULL, NULL, <built>, 1, 1)`
- `('advanced', 'LexiTap Advanced (CEFR B2-C1)', '...', 1, NULL, NULL, <built>, 2, 1)`
- `('toefl', 'TOEFL Vocabulary', '...', 0, 14.99, 'com.lexitap.toefl', <built>, 3, 1)`
- `('ielts', 'IELTS Vocabulary', '...', 0, 14.99, 'com.lexitap.ielts', <built>, 4, 1)`
- `('business', 'Business English', '...', 0, 9.99, 'com.lexitap.business', <built>, 5, 1)`
- `('common3k', 'Common 3000', '...', 0, 2.99, 'com.lexitap.common3k', <built>, 6, 1)`
- `('gre', 'GRE Vocabulary', '...', 0, 14.99, 'com.lexitap.gre', <built>, 7, 0)` *(is_active=0 until Phase 6 content drop)*
- `('gmat', 'GMAT Vocabulary', '...', 0, 14.99, 'com.lexitap.gmat', <built>, 8, 0)`
- `('idioms', 'Idioms & Expressions', '...', 0, 9.99, 'com.lexitap.idioms', <built>, 9, 0)`
- `('phrasal_verbs', 'Phrasal Verbs', '...', 0, 9.99, 'com.lexitap.phrasal', <built>, 10, 0)`

---

### 2. `words`

All vocabulary across all tiers.

```sql
CREATE TABLE words (
  id TEXT PRIMARY KEY,              -- "word_foundation_001"
  word TEXT NOT NULL,
  definition TEXT NOT NULL,
  tier_id TEXT NOT NULL,
  pos TEXT,                         -- Part of speech
  cefr_level TEXT,                  -- "A2", "B1", "B2", "C1", etc.
  grade_level INTEGER,              -- 6-12 (for future Schools app)
  word_type TEXT,                   -- "vocabulary", "expression", "idiom", "phrasal_verb"
  difficulty INTEGER,               -- 1-5 scale
  theme TEXT,                       -- "Daily Life", "Academic Study"
  example_sentence TEXT NOT NULL,   -- "The ___ accelerated the reaction."
  image_path TEXT,                  -- "assets/images/catalyst.png"
  audio_path TEXT,                  -- "assets/audio/catalyst.mp3"
  synonyms TEXT,                    -- JSON array: '["accelerator"]'
  antonyms TEXT,                    -- JSON array: '["inhibitor"]'
  usage_notes TEXT,
  created_at INTEGER NOT NULL,
  deleted_at INTEGER,               -- Soft-delete (NULL = active). Removing a word would break review history.
  FOREIGN KEY (tier_id) REFERENCES content_tiers(id)
);

CREATE INDEX idx_words_tier ON words(tier_id);
CREATE INDEX idx_words_cefr ON words(cefr_level);
CREATE INDEX idx_words_active ON words(deleted_at) WHERE deleted_at IS NULL;
```

**Invariants:**

- `example_sentence` must contain exactly one `_` (the blank)
- `synonyms`/`antonyms` are JSON arrays
- `audio_path` only for premium-audio tiers (launch: TOEFL; post-launch: re-evaluate per tier)
- **Multi-word entries** (idioms, phrasal verbs): `word` field contains the full multi-word string (e.g., `"look up to"`, `"a piece of cake"`). `word_type` flags it for widget rendering. Existing widgets (MultipleChoice, DragDrop, ImageMatch, Classification) operate on the multi-word unit unchanged — no schema or widget refactor required. Tokenization for DragDrop on a multi-word entry splits on whitespace within the entry.

---

### 3. `user_entitlements`

Tracks purchased paid tiers.

```sql
CREATE TABLE user_entitlements (
  tier_id TEXT PRIMARY KEY,
  purchased_at INTEGER NOT NULL,
  expires_at INTEGER,               -- NULL for one-time, set for annual
  receipt_token TEXT,
  FOREIGN KEY (tier_id) REFERENCES content_tiers(id)
);
```

**Logic:**

- Free tiers NOT in this table (implicitly unlocked)
- Premium Pass unlocks all paid tiers (checked in app logic)

---

### 4. `user_progress` (SRS hot state)

Spaced repetition + mastery tracking. **Role:** mutable hot state read every time the user opens the app. Pairs with `quiz_attempts` (immutable review log, §6) — the split lets future scheduler upgrades (e.g., FSRS) replay history.

```sql
CREATE TABLE user_progress (
  word_id TEXT PRIMARY KEY,
  mastery_level INTEGER NOT NULL DEFAULT 0,  -- 0-5
  next_review_date INTEGER NOT NULL,
  last_reviewed_at INTEGER,
  consecutive_correct INTEGER DEFAULT 0,
  total_attempts INTEGER DEFAULT 0,
  total_correct INTEGER DEFAULT 0,
  first_seen_at INTEGER,
  scheduler_version TEXT NOT NULL DEFAULT 'v1-fixed',  -- Tag the scheduler that produced this state. Cheap forward-compat insurance.
  FOREIGN KEY (word_id) REFERENCES words(id)
);

CREATE INDEX idx_progress_next_review ON user_progress(next_review_date);
```

**Spaced repetition intervals:**

- 0→1: +1 day
- 1→2: +3 days
- 2→3: +7 days
- 3→4: +14 days
- 4→5: +30 days
- Incorrect: mastery -=1 (min 0), next_review = now + 1 day

---

### 5. `quiz_sessions`

Audit log of quiz sessions.

```sql
CREATE TABLE quiz_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tier_id TEXT,
  started_at INTEGER NOT NULL,
  completed_at INTEGER,             -- NULL if abandoned
  total_questions INTEGER,
  total_correct INTEGER,
  duration_seconds INTEGER,
  quiz_mode TEXT,                   -- "review" or "learn"
  FOREIGN KEY (tier_id) REFERENCES content_tiers(id)
);
```

---

### 6. `quiz_attempts` (immutable review log)

Granular question log. **Role:** append-only event log of every review. Pairs with `user_progress` (mutable hot state, §4). **Never UPDATE or DELETE.** If a review needs correction, insert a compensating event rather than mutating history. This is what makes future scheduler migration safe (e.g., FSRS retraining can replay the log).

```sql
CREATE TABLE quiz_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  word_id TEXT NOT NULL,
  assessment_type TEXT NOT NULL,    -- "multiple_choice", "drag_drop", etc.
  user_answer TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  is_correct INTEGER NOT NULL,
  answered_at INTEGER NOT NULL,
  time_to_answer_ms INTEGER,
  pre_mastery_level INTEGER,        -- mastery_level BEFORE this attempt (for replay / audit)
  scheduled_review_date INTEGER,    -- next_review_date the scheduler had set (for replay)
  scheduler_version TEXT,           -- which scheduler produced the schedule above
  FOREIGN KEY (session_id) REFERENCES quiz_sessions(id),
  FOREIGN KEY (word_id) REFERENCES words(id)
);
```

---

## Teacher Referral Tables (Supabase Backend)

These live in Supabase, not mobile app:

### 7. `teachers`

```sql
CREATE TABLE teachers (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  referral_code TEXT UNIQUE NOT NULL,
  total_referrals INTEGER DEFAULT 0,
  total_earnings DECIMAL DEFAULT 0,
  current_tier INTEGER DEFAULT 1,   -- 1-4
  paypal_email TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 8. `referrals`

```sql
CREATE TABLE referrals (
  id UUID PRIMARY KEY,
  teacher_id UUID REFERENCES teachers(id),
  teacher_code TEXT NOT NULL,
  product_id TEXT NOT NULL,
  product_price DECIMAL NOT NULL,
  student_discount DECIMAL NOT NULL,
  student_paid DECIMAL NOT NULL,
  teacher_commission_rate DECIMAL NOT NULL,
  teacher_commission DECIMAL NOT NULL,
  tier_at_purchase INTEGER NOT NULL,
  purchased_at TIMESTAMP DEFAULT NOW(),
  receipt_id TEXT UNIQUE
);
```

### 9. `promo_codes`

```sql
CREATE TABLE promo_codes (
  id UUID PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,               -- "free_module" or "free_premium"
  free_product_id TEXT,
  uses_remaining INTEGER DEFAULT 1,
  uses_count INTEGER DEFAULT 0,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);
```

---

## Query Functions

Export named functions for all DB interactions (no raw SQL in components).

### Core Queries

```tsx
// Get words due for review
export async function getWordsDueForReview(
  tierId: string,
  limit: number = 20
): Promise<WordWithProgress[]>;

// Get new words never seen
export async function getNewWords(
  tierId: string,
  limit: number = 10
): Promise<Word[]>;

// Check tier access (free or purchased)
export async function hasAccessToTier(
  tierId: string
): Promise<boolean>;

// Record quiz attempt + update mastery
export async function recordQuizAttempt(
  sessionId: number,
  wordId: string,
  isCorrect: boolean,
  assessmentType: string
): Promise<void>;

// Get current streak
export async function getCurrentStreak(): Promise<number>;
```

---

## Migration Strategy

**Version 1:** `001_initial_schema.sql`

- All CREATE TABLE statements

**Future migrations:**

- Append-only (never DROP)
- Increment `PRAGMA user_version`
- Run on app launch via expo-sqlite

**Example:**

```sql
-- 002_add_idiom_support.sql
ALTER TABLE words ADD COLUMN word_type TEXT DEFAULT 'vocabulary';
```

**v2 migration (this revision):**

```sql
-- 003_v2_review_log_and_event_log.sql
-- Soft-delete on words
ALTER TABLE words ADD COLUMN deleted_at INTEGER;
CREATE INDEX idx_words_active ON words(deleted_at) WHERE deleted_at IS NULL;

-- Scheduler version tag on SRS hot state
ALTER TABLE user_progress ADD COLUMN scheduler_version TEXT NOT NULL DEFAULT 'v1-fixed';

-- SRS replay context on review log
ALTER TABLE quiz_attempts ADD COLUMN pre_mastery_level INTEGER;
ALTER TABLE quiz_attempts ADD COLUMN scheduled_review_date INTEGER;
ALTER TABLE quiz_attempts ADD COLUMN scheduler_version TEXT;

-- Local event log
CREATE TABLE event_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  payload TEXT,
  occurred_at INTEGER NOT NULL
);
CREATE INDEX idx_event_log_occurred ON event_log(occurred_at);
CREATE INDEX idx_event_log_type ON event_log(event_type);
```

**Supabase-side (v2):**

```sql
ALTER TABLE user_accounts ADD COLUMN timezone TEXT NOT NULL DEFAULT 'UTC';
```

---

## Edge Cases

1. **Missing word in user_progress:** Auto-insert with mastery=0, next_review=now
2. **Clock skew:** Use `Date.now()` in JS, not SQL `CURRENT_TIMESTAMP`
3. **Abandoned quizzes:** `completed_at = NULL`, prompt resume on next open
4. **Premium Pass:** Single row in entitlements unlocks all paid tiers
5. **Refunds:** Validate receipts on launch, delete invalid entitlements
6. **Soft-deleted words in review history:** `quiz_attempts` and `user_progress` may reference a `word_id` where `words.deleted_at IS NOT NULL`. UI must handle this gracefully (show the historical record; offer to remove from future review queue). **Query convention:** every "active words" query filters `WHERE deleted_at IS NULL`; every "history / audit" query does NOT filter (it needs the historical row to render).
7. **Timezone change (user travels or moves):** No retroactive re-anchoring. Use whatever timezone is set in AsyncStorage at the moment of streak evaluation. Trade-off: an east-bound traveler can lose a day, a west-bound traveler can gain one. Documented behavior, not a bug.
8. **Scheduler version mismatch on replay:** When `quiz_attempts.scheduler_version` ≠ `user_progress.scheduler_version`, replay must use the older scheduler logic for that event. Keep old scheduler implementations addressable by version string (e.g., `src/srs/v1-fixed.ts`, `src/srs/v2-fsrs.ts`).
9. **Multi-word entries in quizzes:** for `word_type IN ('idiom', 'phrasal_verb')`, the `word` field is multi-token (e.g., `"look up to"`). Widgets treat the entry as an atomic unit for tap/match purposes; DragDrop tokenizes on whitespace within the entry when building draggable pieces. Distractors for multi-word entries are sampled from the same `tier_id` (e.g., other phrasal verbs as distractors for a phrasal-verb question), not from the general word pool.

---

## Performance Notes

- All foreign keys have indexes
- `next_review_date` index critical for quiz queries
- Limit quiz queries to 20-50 words max
- Batch-insert user_progress on tier unlock
- Expected DB size: <10MB for 10K words + 1 year usage

---

## Cloud Sync Tables (Supabase Backend)

These tables enable FREE cloud sync for all users.

### 10. `user_accounts`

User authentication and profile.

```sql
CREATE TABLE user_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  auth_provider TEXT NOT NULL,      -- 'email' or 'google'
  timezone TEXT NOT NULL DEFAULT 'UTC',  -- IANA tz, e.g., 'America/Los_Angeles'. Critical for streak boundary logic.
  created_at TIMESTAMP DEFAULT NOW(),
  last_synced_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_user_email ON user_accounts(email);
```

**Notes:**

- Supabase Auth handles authentication (password hashing, OAuth)
- This table stores additional user metadata
- `last_synced_at` tracks last successful sync
- **`timezone`** — stored client-side in AsyncStorage (source of truth), so streak logic works pre-auth and offline. Synced to this row on sign-in; cloud is mirror, not authority. Default at install = `Intl.DateTimeFormat().resolvedOptions().timeZone`. User-changeable in Settings.

---

### 11. `user_progress_sync` (Cloud Mirror)

Cloud copy of mobile `user_progress` table.

```sql
CREATE TABLE user_progress_sync (
  user_id UUID NOT NULL REFERENCES user_accounts(id),
  word_id TEXT NOT NULL,
  mastery_level INTEGER NOT NULL,
  next_review_date BIGINT NOT NULL,
  last_reviewed_at BIGINT,
  consecutive_correct INTEGER,
  total_attempts INTEGER,
  total_correct INTEGER,
  first_seen_at BIGINT,
  synced_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, word_id)
);

CREATE INDEX idx_sync_user ON user_progress_sync(user_id);
CREATE INDEX idx_sync_updated ON user_progress_sync(synced_at);
```

**Sync logic:**

- Mobile app pushes `user_progress` on app close
- Mobile app pulls on app open
- Conflict resolution: Last-write-wins (compare `last_reviewed_at`)

---

### 12. `user_entitlements_sync` (Cloud Mirror)

Cloud copy of mobile `user_entitlements` table.

```sql
CREATE TABLE user_entitlements_sync (
  user_id UUID NOT NULL REFERENCES user_accounts(id),
  tier_id TEXT NOT NULL,
  purchased_at BIGINT NOT NULL,
  expires_at BIGINT,
  receipt_token TEXT,
  synced_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, tier_id)
);

CREATE INDEX idx_entitlements_user ON user_entitlements_sync(user_id);
```

**Notes:**

- Syncs purchased tiers across devices
- Enables "restore purchases" on new device
- Receipt validation happens server-side

---

### 13. `user_stats_sync` (Gamification Data)

Sync streak, total sessions, and other stats.

```sql
CREATE TABLE user_stats_sync (
  user_id UUID PRIMARY KEY REFERENCES user_accounts(id),
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date BIGINT,
  total_sessions INTEGER DEFAULT 0,
  total_words_mastered INTEGER DEFAULT 0,
  synced_at TIMESTAMP DEFAULT NOW()
);
```

**Sync frequency:**

- Pushed on app close
- Pulled on app open
- Streak calculation uses `last_activity_date` evaluated in the **user's timezone** (from AsyncStorage / `user_accounts.timezone`). A day boundary in Tokyo ≠ NYC; compute against the user's tz, not UTC and not device-current tz at travel time.
- **Timezone change policy:** use whatever timezone is set in AsyncStorage at the moment of evaluation. No retroactive re-anchoring of past streak boundaries. Travel can cause a streak day to feel short or long — acceptable; revisit only if users report.

---

## Sync Strategy

### On App Open (Pull from Cloud):

```tsx
async function syncFromCloud(userId: string) {
  // 1. Fetch user_progress_sync
  const cloudProgress = await supabase
    .from('user_progress_sync')
    .select('*')
    .eq('user_id', userId);
  
  // 2. Merge into local SQLite
  for (const row of cloudProgress) {
    await mergeProgress(row); // Last-write-wins
  }
  
  // 3. Fetch entitlements
  const cloudEntitlements = await supabase
    .from('user_entitlements_sync')
    .select('*')
    .eq('user_id', userId);
  
  // 4. Sync entitlements
  for (const row of cloudEntitlements) {
    await mergeEntitlement(row);
  }
  
  // 5. Fetch stats (streak, etc.)
  const cloudStats = await supabase
    .from('user_stats_sync')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  // 6. Update local stats
  await updateLocalStats(cloudStats);
}
```

---

### On App Close (Push to Cloud):

```tsx
async function syncToCloud(userId: string) {
  // 1. Get local progress
  const localProgress = await db.query(
    'SELECT * FROM user_progress WHERE last_reviewed_at > ?',
    [lastSyncTimestamp]
  );
  
  // 2. Upsert to cloud
  await supabase
    .from('user_progress_sync')
    .upsert(
      localProgress.map(row => ({
        user_id: userId,
        ...row,
        synced_at: new Date()
      }))
    );
  
  // 3. Sync entitlements
  const localEntitlements = await db.query(
    'SELECT * FROM user_entitlements'
  );
  
  await supabase
    .from('user_entitlements_sync')
    .upsert(
      localEntitlements.map(row => ({
        user_id: userId,
        ...row
      }))
    );
  
  // 4. Update stats
  const stats = await calculateLocalStats();
  await supabase
    .from('user_stats_sync')
    .upsert({
      user_id: userId,
      ...stats,
      synced_at: new Date()
    });
}
```

---

### Conflict Resolution:

**Rule:** Last-write-wins (based on `last_reviewed_at` timestamp)

```tsx
async function mergeProgress(cloudRow: ProgressRow) {
  const localRow = await db.query(
    'SELECT * FROM user_progress WHERE word_id = ?',
    [cloudRow.word_id]
  );
  
  if (!localRow) {
    // No local data, insert cloud data
    await db.insert('user_progress', cloudRow);
    return;
  }
  
  // Compare timestamps
  if (cloudRow.last_reviewed_at > localRow.last_reviewed_at) {
    // Cloud is newer, overwrite local
    await db.update('user_progress', cloudRow);
  } else {
    // Local is newer, keep local (will push on next sync)
    // No action needed
  }
}
```

---

## Sync Edge Cases

1. **User offline for weeks:**
    - Local progress accumulates
    - On next sync, push all changes (upsert handles this)
2. **User edits on 2 devices while offline:**
    - Last-write-wins (device that syncs last overwrites)
    - Acceptable trade-off (rare case, simple logic)
3. **Sync fails mid-operation:**
    - Transaction-based sync (all-or-nothing)
    - Retry on next app open
4. **User deletes account:**
    - Cascade delete all cloud data
    - Local data remains (user can export first)

---

## Changelog

### v2.1 — 2026-05-22 (audience-split + tier expansion update)

**What changed:** non-schema updates triggered by the audience-split decision (LexiTap = ESL-only) and tier-list expansion (GRE, GMAT, Idioms, Phrasal Verbs added as post-launch content drops). No DDL changes — the schema already supports everything needed.

- Schema Overview §1 expanded to enumerate all tiers and explicitly note multi-word units (idioms, phrasal verbs) are flat entries in `words`.
- `content_tiers` example rows expanded to 10 tiers; word_count noted as built-from-sourced-content (not pre-committed).
- `words.word_type` enum comment extended with `"phrasal_verb"`.
- `words` invariants updated: audio is launch-TOEFL only, re-evaluate per post-launch tier.
- Edge Case §9 added: multi-word entries in quizzes (tokenization + distractor sourcing rules).

**Cross-reference:** Session State Decision Log entry 2026-05-22 — "Audience Split: LexiTap = ESL-Only."

### v2 — 2026-05-22

**What changed:** adopted 5 patterns from a TOEFL-app reference schema reviewed in the 2026-05-22 planning session.

1. **`cards` vs `review_log` role split** — clarified that `user_progress` is the mutable hot state and `quiz_attempts` is the immutable append-only log. Added `pre_mastery_level`, `scheduled_review_date`, `scheduler_version` to `quiz_attempts` so a future scheduler upgrade can replay history.
2. **`scheduler_version` on `user_progress`** — forward-compat tag so we can migrate users gradually (e.g., to FSRS in Year 2) without breaking existing review state.
3. **Local `event_log` table** — append-only audit / replay log. **No async worker** — stats still written synchronously on each event (right-sized for 1,000-user target). The log exists so the path to async-aggregation is clean if scale demands it later.
4. **Timezone on `user_accounts`** — streak boundary logic uses the user's IANA tz, not UTC or device time. Stored client-side in AsyncStorage as source of truth; cloud is mirror.
5. **Soft-delete on `words`** — added `deleted_at`. Hard-delete would break historical `quiz_attempts` rows. Query convention enforced via [AGENTS_MOBILE_CONVENTIONS.md](./AGENTS_MOBILE_CONVENTIONS.md).

**What was deliberately rejected:**

- **FSRS scheduler now** — premature at current scale. Keeping fixed intervals (1, 3, 7, 14, 30 days); `scheduler_version` tag makes future migration possible.
- **Morphological word families** (`lexical_families` → `lexemes` → `definitions`) — over-modeled for 800-1,200 free + 600 TOEFL words. Flat `words` table is sufficient; revisit if data shows learners frustrated by redundant variants.
- **Synonyms-with-strength junction for distractor selection** — overkill for tap / drag / match. Distractors come from same-tier word pool or are hand-authored.
- **TOEFL Reading passages + 9 question-type exam tables** — out of LexiTap scope (vocab app, not exam-prep app).
- **Async worker for event_log → summary tables** — premature; synchronous writes work fine at target scale.

**Migration:** see `003_v2_review_log_and_event_log.sql` sketch in §Migration Strategy.

**Cross-reference:** decision captured in Session State Decision Log entry 2026-05-22.