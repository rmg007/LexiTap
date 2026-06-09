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
  frequency_rank   INTEGER,
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
 * Per-meaning rich content for the word-detail screen (RICH_WORD_DETAIL_PLAN.md).
 * ADDITIVE layer: `words.definition` + `words.example_sentence` remain the
 * canonical source the quiz/SRS read — these tables are read ONLY by the detail
 * screen. A word has >=1 sense; sense_index 0 is the primary/most-common meaning.
 * Add a second sense only when genuinely distinct AND learner-relevant (no filler).
 * `explanation` is the FELT teaching text (not a dictionary gloss); `short_gloss`
 * is the one-liner used in lists + distractor pools.
 */
export const CREATE_WORD_SENSES = `
CREATE TABLE word_senses (
  id          TEXT PRIMARY KEY,
  word_id     TEXT NOT NULL,
  sense_index INTEGER NOT NULL,
  pos         TEXT,
  short_gloss TEXT NOT NULL,
  explanation TEXT NOT NULL,
  image_path  TEXT,
  created_at  INTEGER NOT NULL,
  deleted_at  INTEGER,
  UNIQUE (word_id, sense_index),
  FOREIGN KEY (word_id) REFERENCES words(id)
);
`.trim();

/**
 * Natural teaching example sentences for a sense. Always FULL sentences with NO
 * `_` cloze blank — the quiz cloze lives solely in `words.example_sentence`. One
 * concept, one home. Multiple rows per sense, ordered by example_index.
 */
export const CREATE_SENSE_EXAMPLES = `
CREATE TABLE sense_examples (
  id            TEXT PRIMARY KEY,
  sense_id      TEXT NOT NULL,
  example_index INTEGER NOT NULL,
  text          TEXT NOT NULL,
  created_at    INTEGER NOT NULL,
  UNIQUE (sense_id, example_index),
  FOREIGN KEY (sense_id) REFERENCES word_senses(id)
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

/**
 * Non-words (pseudo-words) for DIAG-A false-alarm detection. Presented
 * identically to real words during the adaptive diagnostic; a Yes answer
 * contributes to the false-alarm rate used by applyPseudoWordCorrection().
 * Populate via `content-tool import --source pseudo_words.csv --tier pseudo`.
 * Phoneme similarity scores are curated content, not generated.
 */
export const CREATE_PSEUDO_WORDS = `
CREATE TABLE pseudo_words (
  id                       TEXT PRIMARY KEY,
  word                     TEXT NOT NULL UNIQUE,
  phoneme_similarity_score REAL
);
`.trim();

export const CREATE_WORDS_INDEXES = [
  `CREATE INDEX idx_words_cefr          ON words(cefr_level);`,
  `CREATE INDEX idx_words_active        ON words(deleted_at) WHERE deleted_at IS NULL;`,
  // Alphabetical keyset browse (DATABASE_SCHEMA.md §Keyset Pagination).
  `CREATE INDEX idx_words_alphabetical  ON words(word) WHERE deleted_at IS NULL;`,
  // DIAG-A band-walk: select words near a target frequency rank.
  `CREATE INDEX idx_words_frequency     ON words(frequency_rank) WHERE deleted_at IS NULL;`,
];

export const CREATE_WORD_TIERS_INDEXES = [
  // tier -> words membership scan. The PRIMARY KEY (word_id, tier_id) already
  // serves word -> tiers lookups; this index serves the reverse direction.
  `CREATE INDEX idx_word_tiers_tier ON word_tiers(tier_id, word_id);`,
];

export const CREATE_SENSES_INDEXES = [
  // word -> its senses (detail screen), active only.
  `CREATE INDEX idx_word_senses_word ON word_senses(word_id) WHERE deleted_at IS NULL;`,
  // sense -> its example sentences.
  `CREATE INDEX idx_sense_examples_sense ON sense_examples(sense_id);`,
];

/** Full ordered DDL for building a fresh content DB (tiers, words, junction, pseudo_words, indexes). */
export const CONTENT_DB_DDL: readonly string[] = [
  CREATE_CONTENT_TIERS,
  CREATE_WORDS,
  CREATE_WORD_TIERS,
  CREATE_PSEUDO_WORDS,
  CREATE_WORD_SENSES,
  CREATE_SENSE_EXAMPLES,
  ...CREATE_WORDS_INDEXES,
  ...CREATE_WORD_TIERS_INDEXES,
  ...CREATE_SENSES_INDEXES,
];
