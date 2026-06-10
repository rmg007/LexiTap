/**
 * better-sqlite3 helpers shared across commands. The working DB and the output
 * DB use the same content-table schema (CONTENT_DB_DDL); only the output DB is
 * built fresh on every export.
 */

import Database from 'better-sqlite3';
import { mkdirSync, existsSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { CONTENT_DB_DDL } from '@/schema/ddl';
import { PROJECT_ROOT } from '@/lib/config';

export type DB = Database.Database;

export const WORKING_DB_PATH = resolve(PROJECT_ROOT, 'data', 'working', 'working.db');
export const OUTPUT_DB_PATH = resolve(PROJECT_ROOT, 'data', 'output', 'words.db');

function ensureDir(filePath: string): void {
  mkdirSync(dirname(filePath), { recursive: true });
}

/** Apply the content-table DDL to a connection that has no content tables yet. */
export function applyContentSchema(db: DB): void {
  const hasWords = db
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='words'`)
    .get();
  if (hasWords) return;
  for (const statement of CONTENT_DB_DDL) {
    db.exec(statement);
  }
}

/**
 * Idempotent schema migrations for the working DB. Runs after applyContentSchema
 * so a freshly-created DB is already current. Each migration is a no-op if the
 * target state already exists.
 */
function applyWorkingDbMigrations(db: DB): void {
  // C7 migration: add definition_license column if schema pre-dates C7.
  // Also clears stale audio_path values written by DeterministicAudioProvider
  // before real TTS files existed — those paths referenced non-existent assets
  // and caused validate --strict to abort the release pipeline.
  const hasLicense = db
    .prepare(`SELECT name FROM pragma_table_info('words') WHERE name='definition_license'`)
    .get();
  if (!hasLicense) {
    db.exec(`ALTER TABLE words ADD COLUMN definition_license TEXT`);
    db.exec(`UPDATE words SET definition_license = 'original' WHERE definition_license IS NULL`);
    db.exec(`UPDATE words SET audio_path = NULL`);
  }

  // DIAG-A migration: add frequency_rank column if schema pre-dates DIAG-A.
  const hasFrequencyRank = db
    .prepare(`SELECT name FROM pragma_table_info('words') WHERE name='frequency_rank'`)
    .get();
  if (!hasFrequencyRank) {
    db.exec(`ALTER TABLE words ADD COLUMN frequency_rank INTEGER`);
    db.exec(
      `CREATE INDEX IF NOT EXISTS idx_words_frequency ON words(frequency_rank) WHERE deleted_at IS NULL`,
    );
  }

  // DIAG-A migration: create pseudo_words table if it doesn't exist yet.
  const hasPseudo = db
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='pseudo_words'`)
    .get();
  if (!hasPseudo) {
    db.exec(`
      CREATE TABLE pseudo_words (
        id                       TEXT PRIMARY KEY,
        word                     TEXT NOT NULL UNIQUE,
        phoneme_similarity_score REAL
      )
    `);
  }

  // Rich word-detail migration: create word_senses + sense_examples tables if absent.
  const hasSenses = db
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='word_senses'`)
    .get();
  if (!hasSenses) {
    db.exec(`
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
        UNIQUE (word_id, sense_index)
      )
    `);
    db.exec(`CREATE INDEX idx_word_senses_word ON word_senses(word_id) WHERE deleted_at IS NULL`);
    db.exec(`
      CREATE TABLE sense_examples (
        id            TEXT PRIMARY KEY,
        sense_id      TEXT NOT NULL,
        example_index INTEGER NOT NULL,
        text          TEXT NOT NULL,
        created_at    INTEGER NOT NULL,
        UNIQUE (sense_id, example_index)
      )
    `);
    db.exec(`CREATE INDEX idx_sense_examples_sense ON sense_examples(sense_id)`);
  }
}

/**
 * Open (creating if needed) the mutable working DB and ensure its schema.
 *
 * Foreign keys are intentionally OFF here: the working DB stages `words` rows
 * before `content_tiers` exists (tiers are only materialized in the output DB
 * at export). Tier validity is enforced by `validate` (rule #4), not the FK.
 */
export function openWorkingDb(path: string = WORKING_DB_PATH): DB {
  ensureDir(path);
  const db = new Database(path);
  db.pragma('foreign_keys = OFF');
  applyContentSchema(db);
  applyWorkingDbMigrations(db);
  return db;
}

/** Create a brand-new output DB from scratch (deletes any prior file). */
export function createFreshOutputDb(path: string = OUTPUT_DB_PATH): DB {
  ensureDir(path);
  if (existsSync(path)) rmSync(path);
  const db = new Database(path);
  db.pragma('foreign_keys = ON');
  for (const statement of CONTENT_DB_DDL) {
    db.exec(statement);
  }
  return db;
}

/**
 * In-memory content DB for tests. FK enforcement is left OFF to mirror the
 * working DB (rows may be staged before `content_tiers` is populated).
 */
export function openMemoryContentDb(): DB {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = OFF');
  for (const statement of CONTENT_DB_DDL) {
    db.exec(statement);
  }
  return db;
}
