// Forward-only migration 003 for user.db. ADDITIVE ONLY — a new table, a new
// nullable column, and a new single-row table. Never edits or DROPs 001/002
// (DATABASE_SCHEMA.md "Migration Strategy"). Applied via execAsync so multiple
// statements run in one step; SQL is a string constant (the only place this DDL
// lives) so it ships without Metro asset config.
//
// Three feature-driven additions, bundled into one version bump (2 -> 3):
//   1. saved_words        — WORD_FEEDBACK_PLAN §2 "Save word to review later".
//      word_id PK => save is idempotent, unsave = DELETE by PK. No soft-delete:
//      a bookmark is a mutable personal list, not replay/audit state.
//   2. quiz_attempts.user_ease — WORD_FEEDBACK_PLAN §F1-light "Too easy"
//      accelerator. Nullable, no default => metadata-only rewrite; NULL on every
//      pre-003 row and on every non-accelerated answer. 'easy' | NULL. Recorded
//      on the append-only attempt so a future FSRS replays the learner's intent
//      (scheduler_version stays 'v1-fixed' — interval math is unchanged).
//   3. active_session     — SESSION_RESUME_PLAN Part B. Single-row (id CHECK = 1,
//      like user_stats) snapshot of the in-flight learn session so Home can offer
//      "Resume (n/10)" and the flow rehydrates exactly. Device-local navigation
//      state, wiped on account deletion.

export const MIGRATION_003_WORD_FEEDBACK = `
CREATE TABLE IF NOT EXISTS saved_words (
  word_id  TEXT PRIMARY KEY,
  saved_at INTEGER NOT NULL,
  source   TEXT NOT NULL DEFAULT 'manual'
);

CREATE INDEX IF NOT EXISTS idx_saved_words_saved_at ON saved_words(saved_at DESC);

ALTER TABLE quiz_attempts ADD COLUMN user_ease TEXT;

CREATE TABLE IF NOT EXISTS active_session (
  id         INTEGER PRIMARY KEY CHECK (id = 1),
  kind       TEXT    NOT NULL,
  tier_id    TEXT    NOT NULL,
  payload    TEXT    NOT NULL,
  updated_at INTEGER NOT NULL
);
`;
