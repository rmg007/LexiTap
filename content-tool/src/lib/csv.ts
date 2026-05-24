/**
 * Input parsing + schema coercion for the `import` command.
 *
 * Founder-authored input columns (order-independent, matched by name) are
 * defined in CONTENT_PIPELINE_ARCHITECTURE.md "Input Schemas". This module is
 * pure: it parses CSV/JSON text into normalized `ParsedInputRow` objects and
 * reports which rows are missing required fields. It does NOT assign id/tier_id/
 * created_at — that is `import`'s job (it knows the target tier and clock).
 */

import { parse } from 'csv-parse/sync';
import type { WordType } from '@/schema/types';

/** Fields a founder may supply per row, after coercion. */
export interface ParsedInputRow {
  word: string;
  definition: string;
  example_sentence: string;
  pos: string | null;
  cefr_level: string | null;
  theme: string | null;
  difficulty: number;
  word_type: WordType;
  /** Present only from JSON input; CSV leaves these null for `enrich` to fill. */
  synonyms: string[] | null;
  antonyms: string[] | null;
  usage_notes: string | null;
}

export interface ParseResult {
  rows: ParsedInputRow[];
  /** 1-based source line/index + reason, for rows skipped as malformed. */
  skipped: { ref: string; reason: string }[];
}

const DEFAULT_DIFFICULTY = 3;
const DEFAULT_WORD_TYPE: WordType = 'vocabulary';
const VALID_WORD_TYPES: ReadonlySet<string> = new Set([
  'vocabulary',
  'expression',
  'idiom',
  'phrasal_verb',
]);

function emptyToNull(value: string | undefined): string | null {
  if (value === undefined) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function coerceDifficulty(value: unknown): number {
  if (value === undefined || value === null || value === '') return DEFAULT_DIFFICULTY;
  const n = typeof value === 'number' ? value : Number.parseInt(String(value), 10);
  return Number.isFinite(n) ? n : DEFAULT_DIFFICULTY;
}

function coerceWordType(value: unknown, fallback: WordType): WordType {
  if (typeof value !== 'string') return fallback;
  const v = value.trim();
  return VALID_WORD_TYPES.has(v) ? (v as WordType) : fallback;
}

function coerceStringArray(value: unknown): string[] | null {
  if (value === undefined || value === null) return null;
  if (Array.isArray(value)) return value.map((x) => String(x));
  return null;
}

/**
 * Build one ParsedInputRow from a raw record, or return a skip reason if a
 * required field (word/definition/example_sentence) is missing.
 */
function buildRow(
  record: Record<string, unknown>,
  defaultWordType: WordType,
): { row: ParsedInputRow } | { reason: string } {
  const word = emptyToNull(asString(record.word));
  const definition = emptyToNull(asString(record.definition));
  const example = emptyToNull(asString(record.example_sentence));

  const missing: string[] = [];
  if (word === null) missing.push('word');
  if (definition === null) missing.push('definition');
  if (example === null) missing.push('example_sentence');
  if (missing.length > 0) {
    return { reason: `missing required field(s): ${missing.join(', ')}` };
  }

  return {
    row: {
      word: word as string,
      definition: definition as string,
      example_sentence: example as string,
      pos: emptyToNull(asString(record.pos)),
      cefr_level: emptyToNull(asString(record.cefr_level)),
      theme: emptyToNull(asString(record.theme)),
      difficulty: coerceDifficulty(record.difficulty),
      word_type: coerceWordType(record.word_type, defaultWordType),
      synonyms: coerceStringArray(record.synonyms),
      antonyms: coerceStringArray(record.antonyms),
      usage_notes: emptyToNull(asString(record.usage_notes)),
    },
  };
}

function asString(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  return String(value);
}

export function parseCsv(text: string, defaultWordType: WordType = DEFAULT_WORD_TYPE): ParseResult {
  const records = parse(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, unknown>[];

  return collect(records, defaultWordType);
}

export function parseJson(text: string, defaultWordType: WordType = DEFAULT_WORD_TYPE): ParseResult {
  const data: unknown = JSON.parse(text);
  if (!Array.isArray(data)) {
    throw new Error('JSON input must be an array of word objects');
  }
  const records = data.map((d) => d as Record<string, unknown>);
  return collect(records, defaultWordType);
}

function collect(records: Record<string, unknown>[], defaultWordType: WordType): ParseResult {
  const rows: ParsedInputRow[] = [];
  const skipped: { ref: string; reason: string }[] = [];
  records.forEach((record, index) => {
    const result = buildRow(record, defaultWordType);
    // +2 accounts for the header row + 1-based line numbering for CSV; for JSON
    // it is a usable record index. Either way it points the author at the row.
    const ref = `row ${index + 2}`;
    if ('reason' in result) {
      skipped.push({ ref, reason: result.reason });
    } else {
      rows.push(result.row);
    }
  });
  return { rows, skipped };
}

/** Infer parser from file extension. */
export function parseByExtension(
  path: string,
  text: string,
  defaultWordType: WordType = DEFAULT_WORD_TYPE,
): ParseResult {
  if (path.toLowerCase().endsWith('.json')) return parseJson(text, defaultWordType);
  if (path.toLowerCase().endsWith('.csv')) return parseCsv(text, defaultWordType);
  throw new Error(`Unsupported input extension for "${path}" (expected .csv or .json)`);
}
