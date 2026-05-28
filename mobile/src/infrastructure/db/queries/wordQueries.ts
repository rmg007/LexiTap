import type { DatabaseHandle } from '@/infrastructure/db/database';
import type { WordRow, ContentTierRow, UserProgressRow } from '@/infrastructure/db/rows';

// Named, parameterized query functions for content (words.db, ATTACHed as
// `contentdb`) joined with user_progress. The ONLY place these SQL strings
// live. No string interpolation of values — always bound params.

const WORD_COLUMNS = `
  w.id, w.word, w.definition, w.tier_id, w.pos, w.cefr_level, w.grade_level,
  w.word_type, w.difficulty, w.theme, w.example_sentence, w.image_path,
  w.audio_path, w.synonyms, w.antonyms, w.usage_notes, w.created_at, w.deleted_at
`;

// Joined word + progress row for the review queue.
export interface WordProgressJoinRow extends WordRow {
  p_mastery_level: number;
  p_next_review_date: number;
  p_last_reviewed_at: number | null;
  p_consecutive_correct: number | null;
  p_total_attempts: number | null;
  p_total_correct: number | null;
  p_first_seen_at: number | null;
  p_scheduler_version: string;
}

// Active words due for review, joined with their progress. Active filter
// (deleted_at IS NULL) applies — soft-deleted words must not enter the queue.
export function selectWordsDueForReview(
  db: DatabaseHandle,
  tierId: string,
  now: number,
  limit: number,
): Promise<WordProgressJoinRow[]> {
  return db.all<WordProgressJoinRow>(
    `SELECT ${WORD_COLUMNS},
       p.mastery_level       AS p_mastery_level,
       p.next_review_date    AS p_next_review_date,
       p.last_reviewed_at    AS p_last_reviewed_at,
       p.consecutive_correct AS p_consecutive_correct,
       p.total_attempts      AS p_total_attempts,
       p.total_correct       AS p_total_correct,
       p.first_seen_at       AS p_first_seen_at,
       p.scheduler_version   AS p_scheduler_version
     FROM contentdb.words w
     JOIN user_progress p ON w.id = p.word_id
     WHERE w.tier_id = ? AND w.deleted_at IS NULL AND p.next_review_date <= ?
     ORDER BY p.next_review_date ASC
     LIMIT ?`,
    [tierId, now, limit],
  );
}

// Active words the user has never seen (no progress row), for the learn flow.
// Active filter applies.
export function selectNewWords(
  db: DatabaseHandle,
  tierId: string,
  limit: number,
): Promise<WordRow[]> {
  return db.all<WordRow>(
    `SELECT ${WORD_COLUMNS}
     FROM contentdb.words w
     LEFT JOIN user_progress p ON w.id = p.word_id
     WHERE w.tier_id = ? AND w.deleted_at IS NULL AND p.word_id IS NULL
     ORDER BY w.created_at ASC
     LIMIT ?`,
    [tierId, limit],
  );
}

// Single word by id. NO active filter on purpose: used for history/replay
// render, which must resolve soft-deleted words (DATABASE_SCHEMA.md).
export function selectWordById(db: DatabaseHandle, id: string): Promise<WordRow | null> {
  return db.first<WordRow>(
    `SELECT ${WORD_COLUMNS} FROM contentdb.words w WHERE w.id = ?`,
    [id],
  );
}

// All active words in a tier, for distractor pools and tier browsing.
export function selectWordsByTier(db: DatabaseHandle, tierId: string): Promise<WordRow[]> {
  return db.all<WordRow>(
    `SELECT ${WORD_COLUMNS}
     FROM contentdb.words w
     WHERE w.tier_id = ? AND w.deleted_at IS NULL
     ORDER BY w.word ASC`,
    [tierId],
  );
}

// Keyset-paginated alphabetical word browse for a tier. Pass null afterWord for
// the first page; subsequent pages pass the last `word` value received.
// Uses idx_words_alphabetical — O(log n) regardless of page depth.
export function selectWordsByTierAlphabeticalPage(
  db: DatabaseHandle,
  tierId: string,
  afterWord: string | null,
  limit: number,
): Promise<WordRow[]> {
  return db.all<WordRow>(
    `SELECT ${WORD_COLUMNS}
     FROM contentdb.words w
     WHERE w.tier_id = ?
       AND w.deleted_at IS NULL
       AND (? IS NULL OR w.word > ?)
     ORDER BY w.word ASC
     LIMIT ?`,
    [tierId, afterWord, afterWord, limit],
  );
}

const TIER_COLUMNS = `
  id, name, description, is_free, price_usd, sku, word_count, display_order, is_active
`;

export function selectAllTiers(db: DatabaseHandle): Promise<ContentTierRow[]> {
  return db.all<ContentTierRow>(
    `SELECT ${TIER_COLUMNS} FROM contentdb.content_tiers ORDER BY display_order ASC`,
    [],
  );
}

export function selectTierById(db: DatabaseHandle, id: string): Promise<ContentTierRow | null> {
  return db.first<ContentTierRow>(
    `SELECT ${TIER_COLUMNS} FROM contentdb.content_tiers WHERE id = ?`,
    [id],
  );
}

// Split a joined row into its progress half. Pure helper so the repository can
// reuse the shared user_progress mapper after the join.
export function joinRowToProgressRow(row: WordProgressJoinRow): UserProgressRow {
  return {
    word_id: row.id,
    mastery_level: row.p_mastery_level,
    next_review_date: row.p_next_review_date,
    last_reviewed_at: row.p_last_reviewed_at,
    consecutive_correct: row.p_consecutive_correct,
    total_attempts: row.p_total_attempts,
    total_correct: row.p_total_correct,
    first_seen_at: row.p_first_seen_at,
    scheduler_version: row.p_scheduler_version,
  };
}
