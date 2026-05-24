/**
 * `import` — read a CSV/JSON source into the working DB, mapping founder columns
 * onto the `words` schema. Idempotent: re-importing upserts by stable ID, so
 * re-runs and diffs stay stable (CONTENT_PIPELINE_ARCHITECTURE.md).
 */

import { readFileSync } from 'node:fs';
import type { DB } from '@/lib/db';
import { openWorkingDb } from '@/lib/db';
import { parseByExtension, type ParsedInputRow } from '@/lib/csv';
import { makeWordId, normalizeWord } from '@/lib/ids';
import { loadConfig, findTier } from '@/lib/config';
import { logger } from '@/lib/logger';
import { flagValue } from '@/commands/validate';
import type { WordRow, WordType } from '@/schema/types';

export type OnConflict = 'update' | 'skip' | 'error';

export interface ImportOptions {
  tier: string;
  defaultType: WordType;
  onConflict: OnConflict;
  /** Injected clock so imports are deterministic in tests. */
  now: () => number;
}

export interface ImportSummary {
  imported: number;
  updated: number;
  skipped: number;
}

/**
 * Map a parsed input row to a full WordRow for a given tier. Pure — assigns the
 * stable id, tier_id, created_at, and normalizes the surface form's whitespace.
 */
export function toWordRow(parsed: ParsedInputRow, tier: string, createdAt: number): WordRow {
  const word = normalizeWord(parsed.word);
  return {
    id: makeWordId(word, tier),
    word,
    definition: parsed.definition,
    tier_id: tier,
    pos: parsed.pos,
    cefr_level: parsed.cefr_level,
    grade_level: null,
    word_type: parsed.word_type,
    difficulty: parsed.difficulty,
    theme: parsed.theme,
    example_sentence: parsed.example_sentence,
    image_path: null,
    audio_path: null,
    synonyms: parsed.synonyms ? JSON.stringify(parsed.synonyms) : null,
    antonyms: parsed.antonyms ? JSON.stringify(parsed.antonyms) : null,
    usage_notes: parsed.usage_notes,
    created_at: createdAt,
    deleted_at: null,
  };
}

const INSERT_SQL = `
INSERT INTO words (
  id, word, definition, tier_id, pos, cefr_level, grade_level, word_type,
  difficulty, theme, example_sentence, image_path, audio_path, synonyms,
  antonyms, usage_notes, created_at, deleted_at
) VALUES (
  @id, @word, @definition, @tier_id, @pos, @cefr_level, @grade_level, @word_type,
  @difficulty, @theme, @example_sentence, @image_path, @audio_path, @synonyms,
  @antonyms, @usage_notes, @created_at, @deleted_at
)
ON CONFLICT(id) DO UPDATE SET
  word = excluded.word,
  definition = excluded.definition,
  tier_id = excluded.tier_id,
  pos = excluded.pos,
  cefr_level = excluded.cefr_level,
  word_type = excluded.word_type,
  difficulty = excluded.difficulty,
  theme = excluded.theme,
  example_sentence = excluded.example_sentence,
  usage_notes = excluded.usage_notes
`.trim();

/** Insert/upsert parsed rows into the working DB per the conflict policy. */
export function importRows(db: DB, parsed: ParsedInputRow[], options: ImportOptions): ImportSummary {
  const summary: ImportSummary = { imported: 0, updated: 0, skipped: 0 };
  const existsStmt = db.prepare(`SELECT 1 FROM words WHERE id = ?`);
  const insertStmt = db.prepare(INSERT_SQL);

  const tx = db.transaction((items: ParsedInputRow[]) => {
    for (const item of items) {
      const row = toWordRow(item, options.tier, options.now());
      const existing = existsStmt.get(row.id);
      if (existing) {
        if (options.onConflict === 'skip') {
          summary.skipped += 1;
          continue;
        }
        if (options.onConflict === 'error') {
          throw new Error(`duplicate id on import: ${row.id} ("${row.word}")`);
        }
        insertStmt.run(row);
        summary.updated += 1;
      } else {
        insertStmt.run(row);
        summary.imported += 1;
      }
    }
  });
  tx(parsed);
  return summary;
}

/** CLI entry for `import`. */
export function importCommand(args: string[]): void {
  const source = flagValue(args, '--source');
  const tier = flagValue(args, '--tier');
  const type = (flagValue(args, '--type') ?? 'vocabulary') as WordType;
  const onConflict = (flagValue(args, '--on-conflict') ?? 'update') as OnConflict;
  const dryRun = args.includes('--dry-run');

  if (!source) throw new Error('import requires --source <path>');
  if (!tier) throw new Error('import requires --tier <slug>');

  const config = loadConfig();
  if (!findTier(config, tier)) {
    throw new Error(`unknown tier '${tier}' (not in lexitap.config.json)`);
  }

  const text = readFileSync(source, 'utf8');
  const { rows, skipped } = parseByExtension(source, text, type);
  for (const s of skipped) {
    logger.warn(`skipped ${s.ref}: ${s.reason}`);
  }

  if (dryRun) {
    logger.print(`dry-run: ${rows.length} parsable / ${skipped.length} skipped (nothing written)`);
    return;
  }

  const db = openWorkingDb();
  try {
    const summary = importRows(db, rows, {
      tier,
      defaultType: type,
      onConflict,
      now: () => Date.now(),
    });
    logger.print(
      `imported ${summary.imported} / skipped ${summary.skipped + skipped.length} / updated ${summary.updated}`,
    );
  } finally {
    db.close();
  }
}
