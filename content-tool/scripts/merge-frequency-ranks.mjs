// One-off (re-runnable) content step for DIAG-A PA-1: populate words.frequency_rank
// in the working DB by matching the normalized surface form against the ranked
// source list (data/input/foundation_3000.csv). Idempotent — re-running re-applies
// the same ranks. Run from content-tool/: `node scripts/merge-frequency-ranks.mjs`.
import Database from 'better-sqlite3';
import { parse } from 'csv-parse/sync';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const normalize = (w) => w.trim().toLowerCase().replace(/\s+/g, ' ');

const root = resolve(process.cwd());
const csvPath = resolve(root, 'data/input/foundation_3000.csv');
const dbPath = resolve(root, 'data/working/working.db');

const records = parse(readFileSync(csvPath, 'utf8'), { columns: true, skip_empty_lines: true, trim: true });
const rankByWord = new Map();
for (const r of records) {
  const rank = Number.parseInt(r.frequency_rank, 10);
  if (r.word && Number.isFinite(rank) && rank > 0) rankByWord.set(normalize(r.word), rank);
}

const db = new Database(dbPath);
const rows = db.prepare('SELECT id, word FROM words WHERE deleted_at IS NULL').all();
const update = db.prepare('UPDATE words SET frequency_rank = ? WHERE id = ?');
let matched = 0;
const tx = db.transaction(() => {
  for (const row of rows) {
    const rank = rankByWord.get(normalize(row.word));
    if (rank !== undefined) {
      update.run(rank, row.id);
      matched += 1;
    }
  }
});
tx();
const remaining = db.prepare('SELECT COUNT(*) n FROM words WHERE frequency_rank IS NULL AND deleted_at IS NULL').get().n;
console.log(`merge-frequency-ranks: matched ${matched}/${rows.length} words; ${remaining} still NULL`);
db.close();
