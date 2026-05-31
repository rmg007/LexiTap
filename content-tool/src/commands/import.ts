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
 * Map a parsed input row to a category-independent WordRow. Pure — assigns the
 * stable id (from the surface form only, NOT the tier), created_at, and
 * normalizes the surface form's whitespace. Category membership is recorded
 * separately in `word_tiers` by importRows.
 */
export function toWordRow(parsed: ParsedInputRow, createdAt: number): WordRow {
  const word = normalizeWord(parsed.word);
  return {
    id: makeWordId(word),
    word,
    definition: parsed.definition,
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
    // C7 provenance: imported content is original-authored by default (the C4
    // enrich prompt forces original phrasing). `validate --strict` requires this.
    definition_license: DEFAULT_DEFINITION_LICENSE,
    created_at: createdAt,
    deleted_at: null,
  };
}

const INSERT_SQL = `
INSERT INTO words (
  id, word, definition, pos, cefr_level, grade_level, word_type,
  difficulty, theme, example_sentence, image_path, audio_path, synonyms,
  antonyms, usage_notes, created_at, deleted_at
) VALUES (
  @id, @word, @definition, @pos, @cefr_level, @grade_level, @word_type,
  @difficulty, @theme, @example_sentence, @image_path, @audio_path, @synonyms,
  @antonyms, @usage_notes, @created_at, @deleted_at
)
ON CONFLICT(id) DO UPDATE SET
  word = excluded.word,
  definition = excluded.definition,
  pos = excluded.pos,
  cefr_level = excluded.cefr_level,
  word_type = excluded.word_type,
  difficulty = excluded.difficulty,
  theme = excluded.theme,
  example_sentence = excluded.example_sentence,
  usage_notes = excluded.usage_notes
`.trim();

const INSERT_MEMBERSHIP_SQL = `INSERT OR IGNORE INTO word_tiers (word_id, tier_id) VALUES (?, ?)`;

/**
 * Import parsed rows into the working DB, tagging each into `options.tier`.
 *
 * Counting is at the MEMBERSHIP grain (import = "tag these words into this
 * tier"): a word newly tagged into the tier counts as `imported`; an already-
 * tagged word counts as `updated` (content refreshed) or `skipped`, per policy.
 * `onConflict='error'` fires only on a true duplicate `(word, tier)` membership
 * — the same word arriving via a DIFFERENT tier is legitimate (many-to-many),
 * and refreshes the shared content row without clobbering existing memberships.
 */
export function importRows(db: DB, parsed: ParsedInputRow[], options: ImportOptions): ImportSummary {
  const summary: ImportSummary = { imported: 0, updated: 0, skipped: 0 };
  const membershipStmt = db.prepare(`SELECT 1 FROM word_tiers WHERE word_id = ? AND tier_id = ?`);
  const wordStmt = db.prepare(`SELECT 1 FROM words WHERE id = ?`);
  const insertStmt = db.prepare(INSERT_SQL);
  const tagStmt = db.prepare(INSERT_MEMBERSHIP_SQL);

  const tx = db.transaction((items: ParsedInputRow[]) => {
    for (const item of items) {
      const row = toWordRow(item, options.now());
      const alreadyTagged = membershipStmt.get(row.id, options.tier);

      if (alreadyTagged) {
        if (options.onConflict === 'skip') {
          summary.skipped += 1;
          continue;
        }
        if (options.onConflict === 'error') {
          throw new Error(
            `duplicate id on import: ${row.id} ("${row.word}") in tier '${options.tier}'`,
          );
        }
        insertStmt.run(row);
        summary.updated += 1;
        continue;
      }

      // New membership for this tier. Refresh shared content unless 'skip' asks
      // us to leave an existing word row untouched; always record the tag.
      const wordExists = wordStmt.get(row.id);
      if (!wordExists || options.onConflict !== 'skip') {
        insertStmt.run(row);
      }
      tagStmt.run(row.id, options.tier);
      summary.imported += 1;
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
