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
