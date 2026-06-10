/**
 * `ingest-senses` — load a JSONL enrichment file into `word_senses` + `sense_examples`
 * in the working DB. Each line = one word's full sense payload; re-ingesting a word
 * replaces its existing senses (clean-slate per word).
 *
 * Format (one JSON object per line):
 *   {
 *     "word_id": "word_<hex>",          // required; must exist in words table
 *     "word":    "plant",               // optional; for readability/cross-check
 *     "senses": [
 *       {
 *         "sense_index": 0,             // 0-based, contiguous
 *         "pos":         "noun",        // optional
 *         "short_gloss": "...",         // required; one-liner used in lists + distractor pools
 *         "explanation": "...",         // required; felt teaching text (2-4 sentences)
 *         "image_path":  null,          // optional
 *         "examples": [
 *           { "example_index": 0, "text": "Full teaching sentence." },
 *           ...
 *         ]
 *       },
 *       ...
 *     ]
 *   }
 *
 * IDs are deterministic: makeSenseId(word_id, sense_index) and
 * makeExampleId(sense_id, example_index) — re-ingesting the same content is idempotent.
 */

import { readFileSync } from 'node:fs';
import type { DB } from '@/lib/db';
import { openWorkingDb } from '@/lib/db';
import { makeSenseId, makeExampleId } from '@/lib/ids';
import { flagValue } from '@/commands/validate';
import { logger } from '@/lib/logger';
import type { WordSenseRow, SenseExampleRow } from '@/schema/types';

// ─── ingest file types ─────────────────────────────────────────────────────

export interface SenseIngestExample {
  example_index: number;
  text: string;
}

export interface SenseIngestSense {
  sense_index: number;
  pos?: string | null;
  short_gloss: string;
  explanation: string;
  image_path?: string | null;
  examples: SenseIngestExample[];
}

export interface SenseIngestItem {
  word_id: string;
  word?: string;
  senses: SenseIngestSense[];
}

// ─── parse / validate file format ─────────────────────────────────────────

export interface ParseError {
  line: number;
  message: string;
}

export interface ParseResult {
  items: SenseIngestItem[];
  errors: ParseError[];
}

function isSenseIngestItem(v: unknown): v is SenseIngestItem {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  if (typeof o['word_id'] !== 'string' || !o['word_id']) return false;
  if (!Array.isArray(o['senses'])) return false;
  return true;
}

export function parseSenseIngestFile(text: string): ParseResult {
  const items: SenseIngestItem[] = [];
  const errors: ParseError[] = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]!.trim();
    if (!raw) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      errors.push({ line: i + 1, message: 'invalid JSON' });
      continue;
    }
    if (!isSenseIngestItem(parsed)) {
      errors.push({ line: i + 1, message: 'missing required fields: word_id (string), senses (array)' });
      continue;
    }
    items.push(parsed);
  }
  return { items, errors };
}

// ─── DB write ──────────────────────────────────────────────────────────────

const SELECT_SENSE_IDS = `SELECT id FROM word_senses WHERE word_id = ?`;
const DELETE_EXAMPLES = `DELETE FROM sense_examples WHERE sense_id = ?`;
const DELETE_SENSES = `DELETE FROM word_senses WHERE word_id = ?`;

const INSERT_SENSE = `
INSERT INTO word_senses (id, word_id, sense_index, pos, short_gloss, explanation, image_path, created_at, deleted_at)
VALUES (@id, @word_id, @sense_index, @pos, @short_gloss, @explanation, @image_path, @created_at, NULL)
`.trim();

const INSERT_EXAMPLE = `
INSERT INTO sense_examples (id, sense_id, example_index, text, created_at)
VALUES (@id, @sense_id, @example_index, @text, @created_at)
`.trim();

export interface IngestSensesResult {
  wordsProcessed: number;
  sensesWritten: number;
  examplesWritten: number;
}

export function ingestSenses(
  db: DB,
  items: SenseIngestItem[],
  options: { now?: () => number } = {},
): IngestSensesResult {
  const now = options.now ?? (() => Date.now());
  const checkWord = db.prepare(`SELECT 1 FROM words WHERE id = ? AND deleted_at IS NULL`);
  const selectIds = db.prepare(SELECT_SENSE_IDS);
  const deleteExamples = db.prepare(DELETE_EXAMPLES);
  const deleteSenses = db.prepare(DELETE_SENSES);
  const insertSense = db.prepare(INSERT_SENSE);
  const insertExample = db.prepare(INSERT_EXAMPLE);

  let sensesWritten = 0;
  let examplesWritten = 0;

  const tx = db.transaction((allItems: SenseIngestItem[]) => {
    for (const item of allItems) {
      if (!checkWord.get(item.word_id)) {
        throw new Error(
          `ingest-senses: word_id '${item.word_id}' (word: '${item.word ?? 'unknown'}') not found in words table — check the word_id in your source file`,
        );
      }

      // Clean-slate: delete existing examples then senses for this word.
      const existingIds = (selectIds.all(item.word_id) as { id: string }[]).map((r) => r.id);
      for (const senseId of existingIds) {
        deleteExamples.run(senseId);
      }
      deleteSenses.run(item.word_id);

      const ts = now();
      for (const s of item.senses) {
        const senseId = makeSenseId(item.word_id, s.sense_index);
        const senseRow: Omit<WordSenseRow, 'deleted_at'> = {
          id: senseId,
          word_id: item.word_id,
          sense_index: s.sense_index,
          pos: s.pos ?? null,
          short_gloss: s.short_gloss,
          explanation: s.explanation,
          image_path: s.image_path ?? null,
          created_at: ts,
        };
        insertSense.run({ ...senseRow, deleted_at: null });
        sensesWritten += 1;

        for (const ex of s.examples) {
          const exRow: SenseExampleRow = {
            id: makeExampleId(senseId, ex.example_index),
            sense_id: senseId,
            example_index: ex.example_index,
            text: ex.text,
            created_at: ts,
          };
          insertExample.run(exRow);
          examplesWritten += 1;
        }
      }
    }
  });

  tx(items);
  return { wordsProcessed: items.length, sensesWritten, examplesWritten };
}

// ─── CLI entry ─────────────────────────────────────────────────────────────

export function ingestSensesCommand(args: string[]): void {
  const source = flagValue(args, '--source');
  const dryRun = args.includes('--dry-run');

  if (!source) throw new Error('ingest-senses requires --source <path>');

  const text = readFileSync(source, 'utf8');
  const { items, errors } = parseSenseIngestFile(text);

  if (errors.length > 0) {
    for (const e of errors) {
      logger.error(`line ${e.line}: ${e.message}`);
    }
    throw new Error(`${errors.length} parse error(s) in ${source} — fix before ingesting`);
  }

  if (dryRun) {
    const totalSenses = items.reduce((n, it) => n + it.senses.length, 0);
    const totalExamples = items.reduce(
      (n, it) => n + it.senses.reduce((m, s) => m + s.examples.length, 0),
      0,
    );
    logger.print(
      `dry-run: ${items.length} words / ${totalSenses} senses / ${totalExamples} examples (nothing written)`,
    );
    return;
  }

  const db = openWorkingDb();
  try {
    const result = ingestSenses(db, items);
    logger.print(
      `ingest-senses: ${result.wordsProcessed} words / ${result.sensesWritten} senses / ${result.examplesWritten} examples written`,
    );
  } finally {
    db.close();
  }
}
