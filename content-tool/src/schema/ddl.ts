/**
 * Canonical DDL for the read-only content database (`words.db`).
 *
 * Replicated EXACTLY from DATABASE_SCHEMA.md (v2.1): column names, types,
 * NOT NULL/DEFAULT clauses, the FOREIGN KEY, and all three indexes on `words`.
 * Both the working DB and the output DB use this same content-table schema.
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
  tier_id          TEXT NOT NULL,
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
  created_at       INTEGER NOT NULL,
  deleted_at       INTEGER,
  FOREIGN KEY (tier_id) REFERENCES content_tiers(id)
);
`.trim();

export const CREATE_WORDS_INDEXES = [
  `CREATE INDEX idx_words_tier          ON words(tier_id);`,
  `CREATE INDEX idx_words_cefr          ON words(cefr_level);`,
  `CREATE INDEX idx_words_active        ON words(deleted_at) WHERE deleted_at IS NULL;`,
  // Keyset pagination for alphabetical tier browsing (DATABASE_SCHEMA.md §Keyset Pagination).
  `CREATE INDEX idx_words_alphabetical  ON words(tier_id, word) WHERE deleted_at IS NULL;`,
];

/** Full ordered DDL for building a fresh content DB (tiers, words, indexes). */
export const CONTENT_DB_DDL: readonly string[] = [
  CREATE_CONTENT_TIERS,
  CREATE_WORDS,
  ...CREATE_WORDS_INDEXES,
];
