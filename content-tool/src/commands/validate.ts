/**
 * `validate` — check working-DB rows against the schema invariants in
 * DATABASE_SCHEMA.md / CONTENT_PIPELINE_ARCHITECTURE.md. The rule functions are
 * pure (row(s) + context -> issues) so they are exhaustively unit-testable; the
 * command wrapper loads rows and exits non-zero on any error.
 */

import type { DB } from '@/lib/db';
import { openWorkingDb } from '@/lib/db';
import { loadConfig, findTier, tierSlugs, type AppConfig } from '@/lib/config';
import { normalizeWord } from '@/lib/ids';
import { logger } from '@/lib/logger';
import { WORD_TYPES, type WordRow } from '@/schema/types';

export type IssueLevel = 'error' | 'warning';

export interface ValidationIssue {
  level: IssueLevel;
  wordId: string;
  field: string;
  message: string;
}

export interface ValidateOptions {
  tier?: string;
  strict?: boolean;
}

const VALID_THEMES: ReadonlySet<string> = new Set([
  'Daily Life',
  'People & Relationships',
  'Work & Career',
  'Academic Study',
  'Health & Body',
  'Nature & Environment',
  'Science & Nature',
  'Travel & Places',
  'Technology & Media',
  'Society & Culture',
]);

/** Count occurrences of the blank marker "_" in the example sentence. */
export function countBlanks(sentence: string): number {
  const matches = sentence.match(/_/g);
  return matches ? matches.length : 0;
}

/** True when an "_" sits inside a word token rather than standing alone. */
export function hasInTokenUnderscore(sentence: string): boolean {
  // A bare blank is whitespace/boundary delimited: " _ ", "_ ...", "... _".
  // An underscore glued to a non-space character (e.g. "cataly_t") is in-token.
  return /\S_|_\S/.test(sentence);
}

export function isJsonStringArray(value: string | null): boolean {
  if (value === null) return true; // absent is allowed; enrich fills it later
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return false;
  }
  return Array.isArray(parsed) && parsed.every((x) => typeof x === 'string');
}

function isMultiWord(word: string): boolean {
  return normalizeWord(word).includes(' ');
}

/**
 * Run every validation rule over a set of rows. Pure: depends only on its
 * arguments. `assetExists` lets rule #7 be tested without touching the disk.
 */
export function validateRows(
  rows: WordRow[],
  config: AppConfig,
  options: ValidateOptions = {},
  assetExists: (path: string) => boolean = () => true,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const knownTiers = new Set(tierSlugs(config));

  // Rule #3 prep: detect duplicate (normalize(word), tier_id) among active rows.
  const seen = new Map<string, string>();

  for (const row of rows) {
    const push = (level: IssueLevel, field: string, message: string): void => {
      issues.push({ level, wordId: row.id, field, message });
    };

    // #1 required fields present
    if (!row.word) push('error', 'word', 'required field is empty');
    if (!row.definition) push('error', 'definition', 'required field is empty');
    if (!row.tier_id) push('error', 'tier_id', 'required field is empty');
    if (!row.example_sentence) push('error', 'example_sentence', 'required field is empty');

    // #2 exactly one blank
    if (row.example_sentence) {
      const blanks = countBlanks(row.example_sentence);
      if (blanks !== 1) {
        push('error', 'example_sentence', `expected exactly one '_', found ${blanks}`);
      } else if (options.strict && hasInTokenUnderscore(row.example_sentence)) {
        // #9 strict: blank must be whitespace-delimited
        push('warning', 'example_sentence', "blank '_' is inside a word token");
      }
    }

    // #4 valid tier
    if (row.tier_id && !knownTiers.has(row.tier_id)) {
      push('error', 'tier_id', `unknown tier '${row.tier_id}'`);
    }

    // #5 theme required for tiers configured requires_theme
    const tier = row.tier_id ? findTier(config, row.tier_id) : undefined;
    if (tier?.requires_theme && (!row.theme || row.theme.trim().length === 0)) {
      push('error', 'theme', `required for tier '${row.tier_id}' but absent`);
    }
    // theme, if present, must be from the closed taxonomy (strict)
    if (row.theme && options.strict && !VALID_THEMES.has(row.theme)) {
      push('warning', 'theme', `'${row.theme}' is not in the theme taxonomy`);
    }

    // #6 JSON arrays
    if (!isJsonStringArray(row.synonyms)) {
      push('error', 'synonyms', 'must be a JSON array of strings');
    }
    if (!isJsonStringArray(row.antonyms)) {
      push('error', 'antonyms', 'must be a JSON array of strings');
    }

    // #7 asset references resolve
    if (row.image_path && !assetExists(row.image_path)) {
      push('error', 'image_path', `referenced asset not found: ${row.image_path}`);
    }
    if (row.audio_path && !assetExists(row.audio_path)) {
      push('error', 'audio_path', `referenced asset not found: ${row.audio_path}`);
    }

    // #8 word_type enum
    if (row.word_type && !WORD_TYPES.includes(row.word_type as (typeof WORD_TYPES)[number])) {
      push('error', 'word_type', `invalid value '${row.word_type}'`);
    }

    // multi-word entries must set a multi-word word_type
    if (row.word && isMultiWord(row.word)) {
      if (!row.word_type || row.word_type === 'vocabulary') {
        push(
          'error',
          'word_type',
          'multi-word entry must set word_type (expression|idiom|phrasal_verb)',
        );
      }
    }

    // #3 duplicate surface form within a tier (active rows only)
    if (row.deleted_at === null && row.word && row.tier_id) {
      const key = `${row.tier_id}::${normalizeWord(row.word)}`;
      const existing = seen.get(key);
      if (existing) {
        push('error', 'word', `duplicate surface form within tier (also ${existing})`);
      } else {
        seen.set(key, row.id);
      }
    }
  }

  return issues;
}

function loadRows(db: DB, tier?: string): WordRow[] {
  if (tier) {
    return db.prepare(`SELECT * FROM words WHERE tier_id = ?`).all(tier) as WordRow[];
  }
  return db.prepare(`SELECT * FROM words`).all() as WordRow[];
}

export interface ValidateResult {
  rowCount: number;
  issues: ValidationIssue[];
  errorCount: number;
  warningCount: number;
}

export function runValidate(db: DB, config: AppConfig, options: ValidateOptions): ValidateResult {
  const rows = loadRows(db, options.tier);
  const issues = validateRows(rows, config, options);
  const errorCount = issues.filter((i) => i.level === 'error').length;
  const warningCount = issues.filter((i) => i.level === 'warning').length;
  return { rowCount: rows.length, issues, errorCount, warningCount };
}

/** CLI entry: validate the working DB, print a report, exit non-zero on errors. */
export function validateCommand(args: string[]): void {
  const tier = flagValue(args, '--tier');
  const strict = args.includes('--strict');
  const config = loadConfig();
  const db = openWorkingDb();
  try {
    const result = runValidate(db, config, { tier, strict });
    printReport(result);
    if (result.errorCount > 0) {
      process.exitCode = 1;
    }
  } finally {
    db.close();
  }
}

function printReport(result: ValidateResult): void {
  logger.print('Validation Report (working.db)');
  logger.print('------------------------------');
  for (const issue of result.issues) {
    logger.print(`  [${issue.level}] ${issue.wordId}  ${issue.field}: ${issue.message}`);
  }
  logger.print(
    `${result.rowCount} rows checked, ${result.errorCount} errors, ${result.warningCount} warnings`,
  );
}

export function flagValue(args: string[], flag: string): string | undefined {
  const i = args.indexOf(flag);
  if (i === -1 || i + 1 >= args.length) return undefined;
  return args[i + 1];
}
