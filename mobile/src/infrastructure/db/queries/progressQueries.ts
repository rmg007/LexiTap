import type { DatabaseHandle } from '@/infrastructure/db/database';
import type { UserProgressRow } from '@/infrastructure/db/rows';

// Named, parameterized queries for user_progress (mutable SRS hot state). Every
// SRS write tags scheduler_version (DATABASE_SCHEMA.md invariant 4). No active
// filter here — user_progress rows are device state, never soft-deleted.

const PROGRESS_COLUMNS = `
  word_id, mastery_level, next_review_date, last_reviewed_at, consecutive_correct,
  total_attempts, total_correct, first_seen_at, scheduler_version
`;

export function selectProgress(
  db: DatabaseHandle,
  wordId: string,
): Promise<UserProgressRow | null> {
  return db.first<UserProgressRow>(
    `SELECT ${PROGRESS_COLUMNS} FROM user_progress WHERE word_id = ?`,
    [wordId],
  );
}

// Insert-or-update the hot state for a word. schedulerVersion is passed as a
// param so every write is version-tagged.
export function upsertProgress(
  db: DatabaseHandle,
  row: UserProgressRow,
): Promise<{ lastInsertRowId: number; changes: number }> {
  return db.run(
    `INSERT INTO user_progress (
       word_id, mastery_level, next_review_date, last_reviewed_at,
       consecutive_correct, total_attempts, total_correct, first_seen_at,
       scheduler_version
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(word_id) DO UPDATE SET
       mastery_level       = excluded.mastery_level,
       next_review_date    = excluded.next_review_date,
       last_reviewed_at    = excluded.last_reviewed_at,
       consecutive_correct = excluded.consecutive_correct,
       total_attempts      = excluded.total_attempts,
       total_correct       = excluded.total_correct,
       first_seen_at       = excluded.first_seen_at,
       scheduler_version   = excluded.scheduler_version`,
    [
      row.word_id,
      row.mastery_level,
      row.next_review_date,
      row.last_reviewed_at,
      row.consecutive_correct,
      row.total_attempts,
      row.total_correct,
      row.first_seen_at,
      row.scheduler_version,
    ],
  );
}

// All progress rows (full snapshot), for a pull-merge or a first push.
export function selectAllProgress(db: DatabaseHandle): Promise<UserProgressRow[]> {
  return db.all<UserProgressRow>(
    `SELECT ${PROGRESS_COLUMNS} FROM user_progress`,
    [],
  );
}

// Progress rows reviewed since a cursor (epoch ms), for an incremental push.
// last_reviewed_at NULL rows are excluded — they have never been reviewed and
// carry no new state to push.
export function selectProgressReviewedSince(
  db: DatabaseHandle,
  sinceCursor: number,
): Promise<UserProgressRow[]> {
  return db.all<UserProgressRow>(
    `SELECT ${PROGRESS_COLUMNS} FROM user_progress
     WHERE last_reviewed_at IS NOT NULL AND last_reviewed_at > ?`,
    [sinceCursor],
  );
}

// Aggregate known/learning/total for a tier's knowledge-map breakdown in a
// single round trip. Replaces a per-word progress.get() loop (O(n) round
// trips through the JS↔native bridge — 2.7k of them for the Foundation tier,
// the Progress/Home screens' ~20s stall) with one indexed JOIN + conditional
// SUM. LEFT JOIN so a word never studied (no user_progress row) falls through
// both SUMs (NULL comparisons are falsy) and lands in "new" via the
// total-known-learning identity the caller computes — same semantics as
// domain/gamification/mastery.ts's knowledgeMapSegments(levels), just
// aggregated in SQL instead of over a materialized per-word levels array.
export interface TierKnowledgeMapRow {
  total: number;
  known: number | null;
  learning: number | null;
}

export function selectTierKnowledgeMap(
  db: DatabaseHandle,
  tierId: string,
  masteredLevel: number,
): Promise<TierKnowledgeMapRow | null> {
  return db.first<TierKnowledgeMapRow>(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN p.mastery_level >= ? THEN 1 ELSE 0 END) AS known,
       SUM(CASE WHEN p.mastery_level > 0 AND p.mastery_level < ? THEN 1 ELSE 0 END) AS learning
     FROM contentdb.words w
     JOIN contentdb.word_tiers wt ON wt.word_id = w.id
     LEFT JOIN user_progress p ON p.word_id = w.id
     WHERE wt.tier_id = ? AND w.deleted_at IS NULL`,
    [masteredLevel, masteredLevel, tierId],
  );
}

// Count active words in a tier whose review is due. Joins content (ATTACHed)
// via the word_tiers junction for the category filter; active filter applies
// (deleted_at IS NULL).
export function countDueInTier(
  db: DatabaseHandle,
  tierId: string,
  now: number,
): Promise<{ n: number } | null> {
  return db.first<{ n: number }>(
    `SELECT COUNT(*) AS n
     FROM user_progress p
     JOIN contentdb.words w ON w.id = p.word_id
     JOIN contentdb.word_tiers wt ON wt.word_id = w.id
     WHERE wt.tier_id = ? AND w.deleted_at IS NULL AND p.next_review_date <= ?`,
    [tierId, now],
  );
}

// Keyset-paginated progress list sorted by review date (for the Progress
// screen). Compound key (next_review_date, word_id) breaks ties on identical
// review dates. Pass null cursors for the first page.
// Uses idx_progress_keyset — O(log n) regardless of page depth.
export interface ProgressPageRow {
  word_id: string;
  mastery_level: number;
  next_review_date: number;
}

export function selectProgressPage(
  db: DatabaseHandle,
  tierId: string,
  afterReviewDate: number | null,
  afterWordId: string | null,
  limit: number,
): Promise<ProgressPageRow[]> {
  return db.all<ProgressPageRow>(
    `SELECT p.word_id, p.mastery_level, p.next_review_date
     FROM user_progress p
     JOIN contentdb.words w ON p.word_id = w.id
     JOIN contentdb.word_tiers wt ON wt.word_id = w.id
     WHERE wt.tier_id = ?
       AND w.deleted_at IS NULL
       AND (? IS NULL OR (p.next_review_date > ? OR (p.next_review_date = ? AND p.word_id > ?)))
     ORDER BY p.next_review_date ASC, p.word_id ASC
     LIMIT ?`,
    [tierId, afterReviewDate, afterReviewDate, afterReviewDate, afterWordId, limit],
  );
}
