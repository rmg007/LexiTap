// Forward-only migration 001 for user.db. Creates every read-write table in a
// single step at the current target schema (v2.1): the v1 tables plus the v2
// replay columns (scheduler_version / pre_mastery_level / scheduled_review_date)
// and event_log already folded in, plus the SRS_FORGIVENESS_MECHANICS.md
// additive stats columns. We collapse the historical 001..003 sequence into one
// CREATE-from-scratch step because a fresh install has no rows to preserve;
// migrations remain forward-only and never DROP (DATABASE_SCHEMA.md "Migration
// Strategy"). content_tiers/words live in the read-only words.db and are NOT
// created here.
//
// SQL is exported as a string constant (not a bundled .sql asset) so it ships
// without extra Metro asset config and the migration runner can apply it via
// execAsync. This is the only place these DDL statements live.

export const MIGRATION_001_INITIAL_SCHEMA = `
CREATE TABLE IF NOT EXISTS user_progress (
  word_id             TEXT PRIMARY KEY,
  mastery_level       INTEGER NOT NULL DEFAULT 0,
  next_review_date    INTEGER NOT NULL,
  last_reviewed_at    INTEGER,
  consecutive_correct INTEGER DEFAULT 0,
  total_attempts      INTEGER DEFAULT 0,
  total_correct       INTEGER DEFAULT 0,
  first_seen_at       INTEGER,
  scheduler_version   TEXT NOT NULL DEFAULT 'v1-fixed'
);

CREATE INDEX IF NOT EXISTS idx_progress_next_review ON user_progress(next_review_date);

CREATE TABLE IF NOT EXISTS quiz_sessions (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  tier_id          TEXT,
  started_at       INTEGER NOT NULL,
  completed_at     INTEGER,
  total_questions  INTEGER,
  total_correct    INTEGER,
  duration_seconds INTEGER,
  quiz_mode        TEXT
);

-- Append-only: never UPDATE/DELETE; corrections are compensating inserts.
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id            INTEGER NOT NULL,
  word_id               TEXT NOT NULL,
  assessment_type       TEXT NOT NULL,
  user_answer           TEXT NOT NULL,
  correct_answer        TEXT NOT NULL,
  is_correct            INTEGER NOT NULL,
  answered_at           INTEGER NOT NULL,
  time_to_answer_ms     INTEGER,
  pre_mastery_level     INTEGER,
  scheduled_review_date INTEGER,
  scheduler_version     TEXT
);

-- Append-only device audit/replay log; written in the same local transaction
-- as the state change it accompanies.
CREATE TABLE IF NOT EXISTS event_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type  TEXT NOT NULL,
  payload     TEXT,
  occurred_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_event_log_occurred ON event_log(occurred_at);
CREATE INDEX IF NOT EXISTS idx_event_log_type     ON event_log(event_type);

-- Local mirror of user_stats. Streak/freeze state is durable here (the
-- forgiveness machine needs it offline). last_activity_local_date is YYYYMMDD
-- in the user's IANA tz (NOT epoch) per SRS_FORGIVENESS_MECHANICS.md; a single
-- row keyed by a constant id. onboarding_state is a JSON blob tracking
-- completion of language selection, CEFR placement, notification permissions,
-- and intro flows.
CREATE TABLE IF NOT EXISTS user_stats (
  id                       INTEGER PRIMARY KEY CHECK (id = 1),
  current_streak           INTEGER NOT NULL DEFAULT 0,
  longest_streak           INTEGER NOT NULL DEFAULT 0,
  last_activity_local_date INTEGER,
  total_sessions           INTEGER NOT NULL DEFAULT 0,
  total_words_mastered     INTEGER NOT NULL DEFAULT 0,
  freeze_count             INTEGER NOT NULL DEFAULT 0,
  freezes_granted_total    INTEGER NOT NULL DEFAULT 0,
  last_catchup_anchor_date INTEGER,
  onboarding_state         TEXT
);

-- Anchors SRS reminder delivery. Prevents per-due-word notification flooding.
CREATE TABLE IF NOT EXISTS notification_schedule (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  next_notify_at     INTEGER NOT NULL,
  type               TEXT NOT NULL,
  delivered_at       INTEGER,
  quiet_hours_start  INTEGER,
  quiet_hours_end    INTEGER
);

-- Migration runner anchor. Required before first public release.
CREATE TABLE IF NOT EXISTS schema_version (
  version    INTEGER PRIMARY KEY,
  applied_at INTEGER NOT NULL
);
`;;
