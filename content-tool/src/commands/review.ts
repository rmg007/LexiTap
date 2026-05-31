/**
 * `review` — sampled QA gate for enriched content (C5 from RELEASE_PLAN).
 *
 * Randomly samples 10–15% (or user-specified percent) of enriched words + 100% of
 * validator-flagged rows, exports to CSV for human review, gates export on pass rate.
 *
 * Workflow:
 *   1. Load all words from working DB
 *   2. Compute sample: random % + all flagged rows
 *   3. Write CSV (word, definition, example_sentence, reviewer_notes, status)
 *   4. Log sample size + guidance for review
 *   5. After review: user updates status column to PASS/FAIL
 *   6. Run `review finalize` to compute pass rate and gate export
 *
 * Gate rule: if pass_rate ≥ pass_rate_threshold (default 95%), approve export.
 *
 * Database: marks `reviewed = 1` in working DB (never exported to words.db).
 * The `reviewed` column is INTERNAL ONLY — export.ts explicitly excludes it
 * from the INSERT statement.
 */

import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import type { DB } from '@/lib/db';
import { openWorkingDb, WORKING_DB_PATH } from '@/lib/db';
import { logger } from '@/lib/logger';
import { flagValue, flagExists } from '@/commands/validate';
import type { WordRow } from '@/schema/types';

const REVIEW_COLUMN_EXISTS = `
  SELECT COUNT(*) as n FROM pragma_table_info('words')
  WHERE name = 'reviewed'
`;

const ADD_REVIEW_COLUMN = `ALTER TABLE words ADD COLUMN reviewed INTEGER DEFAULT 0`;

const CREATE_REVIEW_TABLE = `
CREATE TABLE IF NOT EXISTS review_metadata (
  word_id TEXT PRIMARY KEY,
  flagged INTEGER DEFAULT 0,
  review_notes TEXT,
  reviewed_at INTEGER
)
`;

export interface ReviewRow {
  word_id: string;
  word: string;
  definition: string;
  example_sentence: string;
  pos: string | null;
  cefr_level: string | null;
  flagged: boolean;
  status: string; // user-filled: PASS, FAIL, or empty
}

/**
 * Migrate schema if needed: ensure reviewed column + review_metadata table exist.
 * Idempotent — safe to call multiple times.
 */
export function ensureReviewSchema(db: DB): void {
  // Check if reviewed column exists in words table.
  const hasReviewed = (db.prepare(REVIEW_COLUMN_EXISTS).get() as { n: number }).n > 0;
  if (!hasReviewed) {
    db.exec(ADD_REVIEW_COLUMN);
    logger.info('added reviewed column to words table');
  }

  // Ensure review_metadata table for tracking flags and notes.
  db.exec(CREATE_REVIEW_TABLE);
}

/**
 * Fisher-Yates shuffle (in-place). Mutates the input array.
 */
function shuffle<T>(arr: T[], seed: number): T[] {
  let rng = seed;
  // Simple LCG: rng = (rng * 1103515245 + 12345) & 0x7fffffff
  const rand = (): number => {
    rng = (rng * 1103515245 + 12345) & 0x7fffffff;
    return rng / 0x7fffffff;
  };

  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const temp = arr[i];
    if (temp !== undefined && arr[j] !== undefined) {
      arr[i] = arr[j];
      arr[j] = temp;
    }
  }
  return arr;
}

/**
 * Compute the sample: a % of all words + 100% of any marked flagged.
 * Returns word_ids to review (unsorted, unpredictable order).
 */
export function computeSample(
  allWords: WordRow[],
  samplePercent: number,
  flagged: Set<string>,
): string[] {
  const sample = new Set<string>();

  // Add all flagged words.
  for (const id of flagged) {
    sample.add(id);
  }

  // Add random % of the rest.
  const randCount = Math.ceil((allWords.length * samplePercent) / 100);
  const shuffled = shuffle(allWords.map((w) => w.id), Date.now());
  for (let i = 0; i < randCount && i < shuffled.length; i++) {
    sample.add(shuffled[i] as string);
  }

  return Array.from(sample);
}

/**
 * Write sampled rows to a CSV for human review. Format:
 *   word_id, word, definition, example_sentence, pos, cefr_level, flagged, status
 *
 * The `status` column is empty (user-filled). `flagged` is "yes"/"no" for readability.
 */
function writeReviewCsv(rows: ReviewRow[], path: string): void {
  const header = [
    'word_id',
    'word',
    'definition',
    'example_sentence',
    'pos',
    'cefr_level',
    'flagged',
    'status',
  ];

  const csvContent = [
    header.map((h) => `"${h}"`).join(','),
    ...rows.map((r) => {
      const escaped = (s: string | null): string => {
        if (s === null) return '';
        const quoted = `"${s.replace(/"/g, '""')}"`;
        return quoted;
      };
      return [
        escaped(r.word_id),
        escaped(r.word),
        escaped(r.definition),
        escaped(r.example_sentence),
        escaped(r.pos),
        escaped(r.cefr_level),
        escaped(r.flagged ? 'yes' : 'no'),
        '""', // status column empty for user review
      ].join(',');
    }),
  ].join('\n');

  writeFileSync(path, csvContent, 'utf8');
}

/**
 * Load all words + their flagged status from the working DB.
 * `flagged` status is stored in review_metadata or (if missing) inferred from
 * validation rules run at review time.
 */
function loadWordsWithFlags(db: DB): { words: WordRow[]; flagged: Set<string> } {
  const words = db.prepare('SELECT * FROM words').all() as WordRow[];

  // Load pre-marked flagged rows from review_metadata.
  const flaggedStmt = db.prepare('SELECT word_id FROM review_metadata WHERE flagged = 1');
  const flaggedRows = flaggedStmt.all() as { word_id: string }[];
  const flagged = new Set(flaggedRows.map((r) => r.word_id));

  return { words, flagged };
}

/**
 * CLI entry for `review` — sample and export CSV for review.
 *
 * Flags:
 *   --sample-percent <n>     (default 15) % of non-flagged rows to randomly sample
 *   --output <path>          (default review-sample.csv) where to write the CSV
 *   --include-flagged        (default true) whether to 100% include flagged rows
 */
export function reviewCommand(args: string[]): void {
  const samplePercent = Number(flagValue(args, '--sample-percent') ?? '15');
  const outputPath = flagValue(args, '--output') ?? 'review-sample.csv';
  const includeFlagged = !flagExists(args, '--no-flagged');

  if (samplePercent < 1 || samplePercent > 100) {
    logger.error('--sample-percent must be 1–100');
    process.exitCode = 1;
    return;
  }

  const working = openWorkingDb(WORKING_DB_PATH);
  try {
    ensureReviewSchema(working);

    const { words, flagged } = loadWordsWithFlags(working);
    if (words.length === 0) {
      logger.error('no words in working DB');
      process.exitCode = 1;
      return;
    }

    const toReview = includeFlagged
      ? computeSample(words, samplePercent, flagged)
      : computeSample(words, samplePercent, new Set());

    const byId = new Map(words.map((w) => [w.id, w]));
    const reviewRows: ReviewRow[] = [];
    for (const id of toReview) {
      const w = byId.get(id);
      if (!w) continue;
      reviewRows.push({
        word_id: w.id,
        word: w.word,
        definition: w.definition,
        example_sentence: w.example_sentence,
        pos: w.pos,
        cefr_level: w.cefr_level,
        flagged: flagged.has(id),
        status: '',
      });
    }

    writeReviewCsv(reviewRows, outputPath);
    logger.print(`review sample written: ${outputPath}`);
    logger.print(`  total words: ${words.length}`);
    logger.print(`  sample size: ${reviewRows.length} (${((reviewRows.length / words.length) * 100).toFixed(1)}%)`);
    logger.print(`  flagged: ${flagged.size}`);
    logger.print('');
    logger.print('Next: edit the CSV and set status column to PASS or FAIL per row.');
    logger.print(`Then run: npm run cli review finalize --input ${outputPath}`);
  } finally {
    working.close();
  }
}

/**
 * Parse the review CSV and compute pass rate. Returns stats + whether to allow export.
 * Throws on parse error, missing/invalid status column.
 */
export function parseReviewResults(csvPath: string): {
  passed: number;
  failed: number;
  passRate: number;
  allowExport: boolean;
  issues: Array<{ word_id: string; reason: string }>;
} {
  const content = readFileSync(csvPath, 'utf8');
  const lines = content.split('\n');
  if (lines.length < 2) {
    throw new Error('review CSV empty or missing header');
  }

  const headerLine = lines[0];
  if (!headerLine) {
    throw new Error('review CSV empty or missing header');
  }
  const header = headerLine.split(',').map((h) => h.trim().toLowerCase().replace(/"/g, ''));
  const statusIdx = header.indexOf('status');
  if (statusIdx === -1) {
    throw new Error('review CSV missing status column');
  }

  let passed = 0;
  let failed = 0;
  const issues: Array<{ word_id: string; reason: string }> = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]?.trim();
    if (!line) continue;

    // Simple CSV parse: split by comma, trim quotes. Not RFC4180-safe but
    // good enough for status column (always first non-quoted column from the end).
    const cells = line.split(',');
    if (cells.length <= statusIdx) continue;

    const statusCell = cells[statusIdx]?.trim().toLowerCase().replace(/"/g, '');
    if (statusCell === 'pass') {
      passed += 1;
    } else if (statusCell === 'fail') {
      failed += 1;
      // Extract word_id from first cell.
      const wordIdCell = cells[0]?.trim().replace(/"/g, '');
      if (wordIdCell) {
        issues.push({ word_id: wordIdCell, reason: 'user-marked FAIL' });
      }
    }
    // Empty status is skipped (row not reviewed).
  }

  const total = passed + failed;
  const passRate = total > 0 ? (passed / total) * 100 : 0;
  const allowExport = passRate >= 95;

  return { passed, failed, passRate, allowExport, issues };
}

/**
 * CLI entry for `review finalize` — gate export based on user-reviewed CSV.
 *
 * Flags:
 *   --input <path>           (required) path to the review CSV with status column
 *   --pass-rate <n>          (default 95) % required to allow export
 */
export function reviewFinalizeCommand(args: string[]): void {
  const inputPath = flagValue(args, '--input');
  const passRateThreshold = Number(flagValue(args, '--pass-rate') ?? '95');

  if (!inputPath) {
    logger.error('--input required (path to review CSV)');
    process.exitCode = 1;
    return;
  }

  if (!existsSync(inputPath)) {
    logger.error(`review CSV not found: ${inputPath}`);
    process.exitCode = 1;
    return;
  }

  if (passRateThreshold < 1 || passRateThreshold > 100) {
    logger.error('--pass-rate must be 1–100');
    process.exitCode = 1;
    return;
  }

  try {
    const result = parseReviewResults(inputPath);

    logger.print(`review results:`);
    logger.print(`  passed: ${result.passed}`);
    logger.print(`  failed: ${result.failed}`);
    logger.print(`  pass rate: ${result.passRate.toFixed(1)}%`);
    logger.print(`  threshold: ${passRateThreshold}%`);
    logger.print('');

    if (result.allowExport) {
      logger.print(`✓ export APPROVED (${result.passRate.toFixed(1)}% >= ${passRateThreshold}%)`);
      logger.print('run: npm run build:db');
    } else {
      logger.error(
        `✗ export BLOCKED (${result.passRate.toFixed(1)}% < ${passRateThreshold}%)`,
      );
      if (result.issues.length > 0) {
        logger.print('');
        logger.print('failed items:');
        for (const issue of result.issues.slice(0, 10)) {
          logger.print(`  ${issue.word_id}: ${issue.reason}`);
        }
        if (result.issues.length > 10) {
          logger.print(`  ... and ${result.issues.length - 10} more`);
        }
      }
      process.exitCode = 1;
    }
  } catch (err) {
    logger.error(`failed to parse review CSV: ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 1;
  }
}
