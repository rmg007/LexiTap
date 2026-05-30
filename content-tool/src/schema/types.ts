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
 * from the actual `words` rows — never hardcoded.
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
 * One row of the `words` table. `synonyms`/`antonyms` are stored as JSON-array
 * TEXT (or NULL). `deleted_at` NULL means the row is active.
 */
export interface WordRow {
  id: string;
  word: string;
  definition: string;
  tier_id: string;
  pos: string | null;
  cefr_level: string | null;
  grade_level: number | null;
  word_type: string | null;
  difficulty: number | null;
  theme: string | null;
  example_sentence: string;
  image_path: string | null;
  audio_path: string | null;
  synonyms: string | null;
  antonyms: string | null;
  usage_notes: string | null;
  created_at: number;
  deleted_at: number | null;
}
