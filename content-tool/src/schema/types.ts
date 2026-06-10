/**
 * Typed row shapes for the content database (`words.db`).
 *
 * These mirror the DDL in DATABASE_SCHEMA.md exactly. Columns that are NOT NULL
 * in the schema are non-optional here; nullable columns are `T | null` (never
 * `undefined`) to match how better-sqlite3 returns SQLite NULLs.
 */

/** Allowed `words.word_type` values. */
export const WORD_TYPES = ['vocabulary', 'expression', 'idiom', 'phrasal_verb'] as const;
export type WordType = (typeof WORD_TYPES)[number];

/**
 * One row of the `content_tiers` table. `word_count` is computed at export time
 * from the actual `word_tiers` rows — never hardcoded.
 */
export interface TierRow {
  id: string;
  name: string;
  description: string | null;
  is_free: number;
  sku: string | null;
  word_count: number;
  display_order: number;
  is_active: number;
}

/**
 * One row of the `words` table — pure word content, category-independent. A
 * word's category membership lives in `word_tiers` (WordTierRow), not here.
 * `synonyms`/`antonyms` are stored as JSON-array TEXT (or NULL). `deleted_at`
 * NULL means the row is active.
 */
export interface WordRow {
  id: string;
  word: string;
  definition: string;
  pos: string | null;
  cefr_level: string | null;
  grade_level: number | null;
  word_type: string | null;
  difficulty: number | null;
  frequency_rank: number | null;
  theme: string | null;
  example_sentence: string;
  image_path: string | null;
  audio_path: string | null;
  synonyms: string | null;
  antonyms: string | null;
  usage_notes: string | null;
  /**
   * Provenance/license tag for the definition+example (C7). Documents that the
   * text is ORIGINAL (not copied from a copyrighted dictionary) — see
   * DEFINITION_LICENSES. NULL until tagged; `validate --strict` requires a valid
   * value so a build can't ship undocumented-provenance content.
   */
  definition_license: string | null;
  /**
   * Founder QA flag (0/1). Set 1 after a human has reviewed the word's
   * definition, senses, questions, and audio; reset to 0 to re-review. Default 0.
   */
  reviewed: number;
  created_at: number;
  deleted_at: number | null;
}

/** One row of the `word_tiers` junction: tags `word_id` into category `tier_id`. */
export interface WordTierRow {
  word_id: string;
  tier_id: string;
}

/** One row of the `pseudo_words` table — non-words for DIAG-A false-alarm detection. */
export interface PseudoWordRow {
  id: string;
  word: string;
  phoneme_similarity_score: number | null;
}

/** One row of `word_senses` — per-meaning rich content for the detail screen. */
export interface WordSenseRow {
  id: string;
  word_id: string;
  sense_index: number;
  pos: string | null;
  short_gloss: string;
  explanation: string;
  image_path: string | null;
  created_at: number;
  deleted_at: number | null;
}

/** One row of `sense_examples` — a full teaching sentence for one sense. */
export interface SenseExampleRow {
  id: string;
  sense_id: string;
  example_index: number;
  text: string;
  created_at: number;
}

/** Allowed `word_questions.type` values — all answered by tap/drag, never typing. */
export const QUESTION_TYPES = [
  'multiple_choice',
  'definition_match',
  'fill_blank',
  'sentence_order',
  'true_false',
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

/**
 * One row of `word_questions` — an authored quiz question for a word.
 * `distractors` is a JSON-array TEXT ('[]' for sentence_order). `hint` and
 * `explanation` are nullable. `reviewed` is the per-question QA flag (0/1).
 */
export interface WordQuestionRow {
  id: string;
  word_id: string;
  question_index: number;
  type: string;
  prompt: string;
  correct: string;
  distractors: string;
  hint: string | null;
  explanation: string | null;
  reviewed: number;
  created_at: number;
  deleted_at: number | null;
}
