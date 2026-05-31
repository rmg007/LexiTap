/**
 * `validate` — check working-DB rows against the schema invariants in
 * DATABASE_SCHEMA.md / CONTENT_PIPELINE_ARCHITECTURE.md. The rule functions are
 * pure (row(s) + context -> issues) so they are exhaustively unit-testable; the
 * command wrapper loads rows and exits non-zero on any error.
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { DB } from '@/lib/db';
import { openWorkingDb } from '@/lib/db';
import { loadConfig, findTier, tierSlugs, PROJECT_ROOT, type AppConfig } from '@/lib/config';
import { normalizeWord } from '@/lib/ids';
import { logger } from '@/lib/logger';
import { WORD_TYPES, type WordRow, type WordTierRow } from '@/schema/types';

/** Resolve a stored asset path (e.g. "assets/audio/x.mp3") under data/ and test it exists. */
export function diskAssetExists(assetPath: string): boolean {
  return existsSync(resolve(PROJECT_ROOT, 'data', assetPath));
}

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

/**
 * Allowed `words.definition_license` provenance tags (C7). All assert ORIGINAL
 * authorship — a license column is documentation of provenance, not legal
 * protection (RELEASE_PLAN C7). `validate --strict` requires one of these so a
 * build can't ship content of undocumented/copyrighted origin.
 *   - original:    hand-authored original text
 *   - ai-original: AI-generated under an original-phrasing prompt (the C4 path)
 *   - cc0 / cc-by-sa: explicitly open-licensed source (attribution handled separately)
 */
export const DEFINITION_LICENSES: ReadonlySet<string> = new Set([
  'original',
  'ai-original',
  'cc0',
  'cc-by-sa',
]);

/** Default provenance tag stamped at import time (see import.ts). */
export const DEFAULT_DEFINITION_LICENSE = 'original';

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
 * C7 dup-leak: does the example sentence reveal the answer word outside the
 * blank? A single-blank sentence should make the learner RECALL the word; if the
 * surface form also appears spelled out, the item is trivially solvable. Matches
 * the word as a whole token (case-insensitive), ignoring the `_` blank itself.
 */
export function exampleLeaksAnswer(word: string, sentence: string): boolean {
  const target = normalizeWord(word).trim();
  if (!target) return false;
  const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Whole-token, case-insensitive. \b around multi-word surfaces still anchors
  // on the outer word boundaries.
  return new RegExp(`\\b${escaped}\\b`, 'i').test(sentence);
}

/**
 * Run every validation rule over a set of word rows + their category memberships.
 * Pure: depends only on its arguments. `assetExists` lets rule #7 be tested
 * without touching the disk.
 *
 * Word↔category is many-to-many (`word_tiers`): per-word rules check the word
 * row; membership rules check the (word_id, tier_id) tags. Duplicate-surface-
 * within-a-tier is no longer a rule — a category-independent id makes the same
 * surface in one tier structurally a single row (PRIMARY KEY collapse), so it
 * cannot occur.
 */
export function validateRows(
  words: WordRow[],
  memberships: WordTierRow[],
  config: AppConfig,
  options: ValidateOptions = {},
  assetExists: (path: string) => boolean = () => true,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const knownTiers = new Set(tierSlugs(config));
  const wordIds = new Set(words.map((w) => w.id));

  // word_id -> set of category slugs it is tagged into.
  const tiersByWord = new Map<string, Set<string>>();
  for (const m of memberships) {
    let set = tiersByWord.get(m.word_id);
    if (!set) {
      set = new Set();
      tiersByWord.set(m.word_id, set);
    }
    set.add(m.tier_id);

    // #4 membership must reference a known tier, and an existing word.
    if (!knownTiers.has(m.tier_id)) {
      issues.push({ level: 'error', wordId: m.word_id, field: 'tier_id', message: `unknown tier '${m.tier_id}'` });
    }
    if (!wordIds.has(m.word_id)) {
      issues.push({ level: 'error', wordId: m.word_id, field: 'word_id', message: 'membership references unknown word' });
    }
  }

  for (const row of words) {
    const push = (level: IssueLevel, field: string, message: string): void => {
      issues.push({ level, wordId: row.id, field, message });
    };
    const wordTiers = tiersByWord.get(row.id) ?? new Set<string>();

    // #1 required fields present
    if (!row.word) push('error', 'word', 'required field is empty');
    if (!row.definition) push('error', 'definition', 'required field is empty');
    if (!row.example_sentence) push('error', 'example_sentence', 'required field is empty');
    // every word must be tagged into at least one category
    if (wordTiers.size === 0) push('error', 'membership', 'word has no tier membership');

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

    // #5 theme required when ANY category this word belongs to requires a theme
    const requiresTheme = [...wordTiers].some((t) => findTier(config, t)?.requires_theme);
    if (requiresTheme && (!row.theme || row.theme.trim().length === 0)) {
      push('error', 'theme', 'required (a category this word belongs to requires a theme) but absent');
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

    if (options.strict) {
      // #10 strict: example sentence must not leak the answer word.
      if (row.word && row.example_sentence && exampleLeaksAnswer(row.word, row.example_sentence)) {
        push('error', 'example_sentence', `leaks the answer word '${row.word}' outside the blank`);
      }
      // #11 strict: provenance/license must be present and from the allowed set.
      if (!row.definition_license) {
        push('error', 'definition_license', 'missing provenance/license tag (C7)');
      } else if (!DEFINITION_LICENSES.has(row.definition_license)) {
        push(
          'error',
          'definition_license',
          `invalid provenance/license '${row.definition_license}' (allowed: ${[...DEFINITION_LICENSES].join(', ')})`,
        );
      }
    }
  }

  // #12 strict: no two distinct words may share an identical definition (a copy-
  // paste / dup-leak smell). Grouped after the per-row loop so it sees all rows.
  if (options.strict) {
    const byDefinition = new Map<string, string[]>();
    for (const row of words) {
      if (!row.definition) continue;
      const key = row.definition.trim().toLowerCase();
      const ids = byDefinition.get(key);
      if (ids) ids.push(row.id);
      else byDefinition.set(key, [row.id]);
    }
    for (const ids of byDefinition.values()) {
      if (ids.length > 1) {
        for (const id of ids) {
          issues.push({
            level: 'error',
            wordId: id,
            field: 'definition',
            message: `duplicate definition shared by ${ids.length} words (${ids.join(', ')})`,
          });
        }
      }
    }
  }

  return issues;
}

function loadWords(db: DB, tier?: string): WordRow[] {
  if (tier) {
    return db
      .prepare(`SELECT w.* FROM words w JOIN word_tiers wt ON wt.word_id = w.id WHERE wt.tier_id = ?`)
      .all(tier) as WordRow[];
  }
  return db.prepare(`SELECT * FROM words`).all() as WordRow[];
}

function loadMemberships(db: DB, tier?: string): WordTierRow[] {
  if (tier) {
    return db.prepare(`SELECT word_id, tier_id FROM word_tiers WHERE tier_id = ?`).all(tier) as WordTierRow[];
  }
  return db.prepare(`SELECT word_id, tier_id FROM word_tiers`).all() as WordTierRow[];
}

export interface ValidateResult {
  rowCount: number;
  issues: ValidationIssue[];
  errorCount: number;
  warningCount: number;
}

export function runValidate(
  db: DB,
  config: AppConfig,
  options: ValidateOptions,
  assetExists: (path: string) => boolean = diskAssetExists,
): ValidateResult {
  const rows = loadWords(db, options.tier);
  const memberships = loadMemberships(db, options.tier);
  const issues = validateRows(rows, memberships, config, options, assetExists);
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

export function flagExists(args: string[], flag: string): boolean {
  return args.indexOf(flag) !== -1;
}
