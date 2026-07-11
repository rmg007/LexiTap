import type { DatabaseHandle } from '@/infrastructure/db/database';
import type {
  WordRow,
  ContentTierRow,
  UserProgressRow,
  PseudoWordRow,
  SenseWithExampleRow,
} from '@/infrastructure/db/rows';

// Named, parameterized query functions for content (words.db, ATTACHed as
// `contentdb`) joined with user_progress. The ONLY place these SQL strings
// live. No string interpolation of values — always bound params.
//
// Word↔category is many-to-many: `words` has no tier_id column; membership lives
// in `contentdb.word_tiers`. Tier-scoped browses JOIN word_tiers and project the
// queried category as `tier_id` (the tier the word was loaded under); `words` is
// the bare content row.

const WORD_COLUMNS = `
  w.id, w.word, w.definition, w.pos, w.cefr_level, w.grade_level,
  w.word_type, w.difficulty, w.frequency_rank, w.theme, w.example_sentence, w.image_path,
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
    `SELECT ${WORD_COLUMNS}, wt.tier_id AS tier_id,
       p.mastery_level       AS p_mastery_level,
       p.next_review_date    AS p_next_review_date,
       p.last_reviewed_at    AS p_last_reviewed_at,
       p.consecutive_correct AS p_consecutive_correct,
       p.total_attempts      AS p_total_attempts,
       p.total_correct       AS p_total_correct,
       p.first_seen_at       AS p_first_seen_at,
       p.scheduler_version   AS p_scheduler_version
     FROM contentdb.words w
     JOIN contentdb.word_tiers wt ON wt.word_id = w.id
     JOIN user_progress p ON w.id = p.word_id
     WHERE wt.tier_id = ? AND w.deleted_at IS NULL AND p.next_review_date <= ?
     ORDER BY p.next_review_date ASC
     LIMIT ?`,
    [tierId, now, limit],
  );
}

// Active words the user has never seen (no progress row), for the learn flow.
// Active filter applies. Ordered easiest-first by `difficulty` (1-4, 100%
// foundation coverage), `frequency_rank` as the common-first tiebreak. NOT
// `created_at` (pipeline insertion order = noise). `cefr_level` is now 100%
// backfilled on foundation; revisit whether CEFR-band ordering is better than
// `difficulty` — tracked in memory/2026-07-10_foundation-cefr-backfill.md.
export function selectNewWords(
  db: DatabaseHandle,
  tierId: string,
  limit: number,
): Promise<WordRow[]> {
  return db.all<WordRow>(
    `SELECT ${WORD_COLUMNS}, wt.tier_id AS tier_id
     FROM contentdb.words w
     JOIN contentdb.word_tiers wt ON wt.word_id = w.id
     LEFT JOIN user_progress p ON w.id = p.word_id
     WHERE wt.tier_id = ? AND w.deleted_at IS NULL AND p.word_id IS NULL
     ORDER BY w.difficulty ASC, w.frequency_rank ASC
     LIMIT ?`,
    [tierId, limit],
  );
}

// Single word by id. NO active filter on purpose: used for history/replay
// render, which must resolve soft-deleted words (DATABASE_SCHEMA.md). No tier
// context here (a word may be in several categories), so `tier_id` projects a
// representative membership — sufficient for replay, which doesn't gate on tier.
export function selectWordById(db: DatabaseHandle, id: string): Promise<WordRow | null> {
  return db.first<WordRow>(
    `SELECT ${WORD_COLUMNS},
       (SELECT wt.tier_id FROM contentdb.word_tiers wt
         WHERE wt.word_id = w.id ORDER BY wt.tier_id LIMIT 1) AS tier_id
     FROM contentdb.words w WHERE w.id = ?`,
    [id],
  );
}

// All active words in a tier, for distractor pools and tier browsing.
export function selectWordsByTier(db: DatabaseHandle, tierId: string): Promise<WordRow[]> {
  return db.all<WordRow>(
    `SELECT ${WORD_COLUMNS}, wt.tier_id AS tier_id
     FROM contentdb.words w
     JOIN contentdb.word_tiers wt ON wt.word_id = w.id
     WHERE wt.tier_id = ? AND w.deleted_at IS NULL
     ORDER BY w.word ASC`,
    [tierId],
  );
}

// Keyset-paginated alphabetical word browse for a tier. Pass null afterWord for
// the first page; subsequent pages pass the last `word` value received.
// Membership filter via word_tiers; ordered by w.word (idx_words_alphabetical).
export function selectWordsByTierAlphabeticalPage(
  db: DatabaseHandle,
  tierId: string,
  afterWord: string | null,
  limit: number,
): Promise<WordRow[]> {
  return db.all<WordRow>(
    `SELECT ${WORD_COLUMNS}, wt.tier_id AS tier_id
     FROM contentdb.words w
     JOIN contentdb.word_tiers wt ON wt.word_id = w.id
     WHERE wt.tier_id = ?
       AND w.deleted_at IS NULL
       AND (? IS NULL OR w.word > ?)
     ORDER BY w.word ASC
     LIMIT ?`,
    [tierId, afterWord, afterWord, limit],
  );
}

// DIAG-A: read up to `limit` pseudo-words (non-words) for the adaptive
// diagnostic's false-alarm detection. Deterministic order by id so a run is
// reproducible; the caller interleaves them. Tolerates an absent table on older
// content DBs via the repository's catch (a build predating the DIAG-A schema).
export function selectPseudoWords(db: DatabaseHandle, limit: number): Promise<PseudoWordRow[]> {
  return db.all<PseudoWordRow>(
    `SELECT id, word, phoneme_similarity_score
     FROM contentdb.pseudo_words
     ORDER BY id ASC
     LIMIT ?`,
    [limit],
  );
}

// Rich detail: all active senses of a word, each LEFT JOINed to its teaching
// examples, for the detail screen only. Read-only, parameterized. Ordered so the
// mapper can group sequentially (sense_index, then example_index). A sense with
// no examples still appears (LEFT JOIN → null example columns). The active filter
// (s.deleted_at IS NULL) applies. May throw on a content DB built before the
// rich-detail schema (no word_senses/sense_examples tables) — the repository
// catches that and falls back to the flat definition (fail-soft, like DIAG-A).
export function selectSensesForWord(
  db: DatabaseHandle,
  wordId: string,
): Promise<SenseWithExampleRow[]> {
  return db.all<SenseWithExampleRow>(
    `SELECT s.id, s.sense_index, s.pos, s.short_gloss, s.explanation, s.image_path,
       e.example_index AS example_index,
       e.text          AS example_text
     FROM contentdb.word_senses s
     LEFT JOIN contentdb.sense_examples e ON e.sense_id = s.id
     WHERE s.word_id = ? AND s.deleted_at IS NULL
     ORDER BY s.sense_index ASC, e.example_index ASC`,
    [wordId],
  );
}

const TIER_COLUMNS = `
  id, name, description, is_free, sku, word_count, display_order, is_active
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
