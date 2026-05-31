/**
 * Canonical DDL for the read-only content database (`words.db`).
 *
 * Replicated from DATABASE_SCHEMA.md (v3.1): column names, types, NOT NULL/
 * DEFAULT clauses, foreign keys, and indexes. Both the working DB and the output
 * DB use this same content-table schema.
 *
 * v3.0 model: a word belongs to MANY categories (tiers) via the `word_tiers`
 * junction, NOT a single `words.tier_id` FK. Word IDs are category-independent
 * (`word_${sha1(normalize(word))}`) so one word == one row == one progress row
 * across every category it is tagged into.
 *
 * If DATABASE_SCHEMA.md and this module ever disagree, the schema doc wins and
 * this file must be updated to match.
 */

export const CREATE_CONTENT_TIERS = `
CREATE TABLE content_tiers (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  description   TEXT,
  is_free       INTEGER NOT NULL,
  sku           TEXT,
  word_count    INTEGER NOT NULL,
  display_order INTEGER NOT NULL,
  is_active     INTEGER DEFAULT 1
);
`.trim();

export const CREATE_WORDS = `
CREATE TABLE words (
  id               TEXT PRIMARY KEY,
  word             TEXT NOT NULL,
  definition       TEXT NOT NULL,
  pos              TEXT,
  cefr_level       TEXT,
  grade_level      INTEGER,
  word_type        TEXT,
  difficulty       INTEGER,
  theme            TEXT,
  example_sentence TEXT NOT NULL,
  image_path       TEXT,
  audio_path       TEXT,
  synonyms         TEXT,
  antonyms         TEXT,
  usage_notes      TEXT,
  definition_license TEXT,
  created_at       INTEGER NOT NULL,
  deleted_at       INTEGER
);
`.trim();

/**
 * Many-to-many word↔category membership. One row tags a word into one category;
 * a word with rows for `foundation` + `toefl` is in both. Category membership is
 * a content tag, NOT a store product (see REVENUE_MODEL_PRICING.md glossary).
 */
export const CREATE_WORD_TIERS = `
CREATE TABLE word_tiers (
  word_id TEXT NOT NULL,
  tier_id TEXT NOT NULL,
  PRIMARY KEY (word_id, tier_id),
  FOREIGN KEY (word_id) REFERENCES words(id),
  FOREIGN KEY (tier_id) REFERENCES content_tiers(id)
);
`.trim();

export const CREATE_WORDS_INDEXES = [
  `CREATE INDEX idx_words_cefr          ON words(cefr_level);`,
  `CREATE INDEX idx_words_active        ON words(deleted_at) WHERE deleted_at IS NULL;`,
  // Alphabetical keyset browse (DATABASE_SCHEMA.md §Keyset Pagination). Tier is
  // applied via the word_tiers join now, so the order key is the bare `word`.
  `CREATE INDEX idx_words_alphabetical  ON words(word) WHERE deleted_at IS NULL;`,
];

export const CREATE_WORD_TIERS_INDEXES = [
  // tier -> words membership scan. The PRIMARY KEY (word_id, tier_id) already
  // serves word -> tiers lookups; this index serves the reverse direction.
  `CREATE INDEX idx_word_tiers_tier ON word_tiers(tier_id, word_id);`,
];

/** Full ordered DDL for building a fresh content DB (tiers, words, junction, indexes). */
export const CONTENT_DB_DDL: readonly string[] = [
  CREATE_CONTENT_TIERS,
  CREATE_WORDS,
  CREATE_WORD_TIERS,
  ...CREATE_WORDS_INDEXES,
  ...CREATE_WORD_TIERS_INDEXES,
];
