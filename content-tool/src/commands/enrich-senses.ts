/**
 * `enrich-senses` — CONTENT-2 driver: select un-enriched words from the working
 * DB, call the SenseProvider (Anthropic) in small batches, validate every item
 * (V1–V10), and APPEND valid items to a JSONL file consumed by `ingest-senses`.
 *
 *   enrich-senses --limit <n> [--tier <slug>] [--model <id>]
 *                 [--output <path.jsonl>] [--dry-run] [--no-resume]
 *
 * Safety properties:
 * - `--limit` is REQUIRED — prevents an accidental whole-DB paid run.
 * - Cost estimate printed BEFORE any API call (APPROXIMATE, rough constants).
 * - `--dry-run` prints the selection summary and exits without constructing
 *   the provider (works with no API key).
 * - Append-per-batch + resume: output lines are flushed after each batch, and
 *   a re-run excludes word_ids already present in the output file, so an
 *   interrupted run picks up where it left off. `--no-resume` starts fresh.
 * - Words that already have non-deleted `word_senses` rows are never selected.
 *
 * Provider is injectable (deps param) so tests run offline with a fake.
 */

import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { DB } from '@/lib/db';
import { openWorkingDb } from '@/lib/db';
import { loadConfig, findTier, PROJECT_ROOT } from '@/lib/config';
import { logger } from '@/lib/logger';
import { flagValue } from '@/commands/validate';
import { parseSenseIngestFile } from '@/commands/ingest-senses';
import { validateSenseIngestItem, serializeSenseIngestFile } from '@/commands/synthesize-senses';
import type { WordRow } from '@/schema/types';
import type { SenseProvider, SenseSkip } from '@/providers/types';
import {
  AnthropicSenseProvider,
  DEFAULT_SENSE_MODEL,
  SENSE_BATCH_SIZE,
} from '@/providers/anthropicSenseProvider';

export const DEFAULT_OUTPUT_PATH = resolve(PROJECT_ROOT, 'data', 'working', 'senses-enriched.jsonl');

// ─── cost estimate (APPROXIMATE — rough constants, sanity-check only) ──────

/** Rough per-word token constants: prompt+exemplars amortized / long prose out. */
export const EST_INPUT_TOKENS_PER_WORD = 1300;
export const EST_OUTPUT_TOKENS_PER_WORD = 750;

/**
 * USD per million tokens. APPROXIMATE — verify against current Anthropic
 * pricing before a large run (Opus 4.8 $5/$25, Sonnet 4.6 $3/$15 as of
 * 2026-06; unknown models are priced as Opus to over- rather than under-warn).
 */
export const MODEL_PRICES_USD_PER_MTOK: Record<string, { input: number; output: number }> = {
  'claude-opus-4-8': { input: 5, output: 25 },
  'claude-opus-4-7': { input: 5, output: 25 },
  'claude-opus-4-6': { input: 5, output: 25 },
  'claude-sonnet-4-6': { input: 3, output: 15 },
};

export function estimateSenseEnrichmentCostUsd(wordCount: number, model: string): number {
  const price = MODEL_PRICES_USD_PER_MTOK[model] ?? MODEL_PRICES_USD_PER_MTOK[DEFAULT_SENSE_MODEL]!;
  return (
    (wordCount * (EST_INPUT_TOKENS_PER_WORD * price.input + EST_OUTPUT_TOKENS_PER_WORD * price.output)) /
    1_000_000
  );
}

// ─── selection ─────────────────────────────────────────────────────────────

export interface SenseSelectionOptions {
  limit: number;
  tier?: string;
  /** word_ids already present in the output file (resume) — excluded. */
  excludeWordIds?: ReadonlySet<string>;
}

/**
 * Words eligible for sense enrichment: active, ordered by frequency_rank ASC
 * with NULLs last (then word ASC for determinism), optionally filtered to one
 * tier via the word↔tier junction, EXCLUDING words that already have
 * non-deleted `word_senses` rows and word_ids already in the output file.
 */
export function selectWordsForSenseEnrichment(db: DB, options: SenseSelectionOptions): WordRow[] {
  const { limit, tier, excludeWordIds } = options;
  const baseSql = tier
    ? `SELECT w.* FROM words w
       JOIN word_tiers wt ON wt.word_id = w.id AND wt.tier_id = ?
       WHERE w.deleted_at IS NULL
         AND NOT EXISTS (
           SELECT 1 FROM word_senses ws WHERE ws.word_id = w.id AND ws.deleted_at IS NULL
         )
       ORDER BY (w.frequency_rank IS NULL), w.frequency_rank ASC, w.word ASC`
    : `SELECT w.* FROM words w
       WHERE w.deleted_at IS NULL
         AND NOT EXISTS (
           SELECT 1 FROM word_senses ws WHERE ws.word_id = w.id AND ws.deleted_at IS NULL
         )
       ORDER BY (w.frequency_rank IS NULL), w.frequency_rank ASC, w.word ASC`;

  const stmt = db.prepare(baseSql);
  const rows = (tier ? stmt.all(tier) : stmt.all()) as WordRow[];
  const filtered = excludeWordIds ? rows.filter((r) => !excludeWordIds.has(r.id)) : rows;
  return filtered.slice(0, limit);
}

/** word_ids already enriched in an existing output JSONL (resume support). */
export function readResumeWordIds(outputPath: string): Set<string> {
  if (!existsSync(outputPath)) return new Set();
  const { items, errors } = parseSenseIngestFile(readFileSync(outputPath, 'utf8'));
  if (errors.length > 0) {
    logger.warn(`resume: ${errors.length} unparseable line(s) in ${outputPath} — ignoring those lines`);
  }
  return new Set(items.map((i) => i.word_id));
}

// ─── core run (provider injected — offline-testable) ───────────────────────

export interface RunEnrichSensesOptions {
  words: WordRow[];
  outputPath: string;
}

export interface EnrichSensesSummary {
  enriched: number;
  skippedByModel: number;
  invalidDropped: number;
  batches: number;
}

export async function runEnrichSenses(
  provider: SenseProvider,
  options: RunEnrichSensesOptions,
): Promise<EnrichSensesSummary> {
  const { words, outputPath } = options;
  const summary: EnrichSensesSummary = { enriched: 0, skippedByModel: 0, invalidDropped: 0, batches: 0 };
  const allSkips: SenseSkip[] = [];
  const totalBatches = Math.ceil(words.length / SENSE_BATCH_SIZE);

  for (let i = 0; i < words.length; i += SENSE_BATCH_SIZE) {
    const batch = words.slice(i, i + SENSE_BATCH_SIZE);
    summary.batches += 1;
    const result = await provider.generate(batch);

    // Validate + append per batch so an interrupted run resumes cleanly.
    for (const word of batch) {
      const item = result.items.get(word.id);
      if (!item) continue;
      const errors = validateSenseIngestItem(item);
      if (errors.length > 0) {
        summary.invalidDropped += 1;
        const detail = errors.map((e) => `${e.field}: ${e.message}`).join('; ');
        logger.warn(`invalid item dropped (word: ${word.word}, id: ${word.id}): ${detail}`);
        continue;
      }
      appendFileSync(outputPath, serializeSenseIngestFile([item]), 'utf8');
      summary.enriched += 1;
    }
    allSkips.push(...result.skipped);
    summary.skippedByModel += result.skipped.length;

    logger.print(
      `batch ${summary.batches}/${totalBatches}: enriched ${summary.enriched}, ` +
        `skipped ${summary.skippedByModel}, invalid ${summary.invalidDropped} (of ${words.length} words)`,
    );
  }

  for (const skip of allSkips) {
    logger.print(`  skipped: ${skip.word} (${skip.word_id}) — ${skip.reason}`);
  }

  return summary;
}

// ─── CLI entry ─────────────────────────────────────────────────────────────

/** Injectable seams so tests run with an in-memory DB + fake provider. */
export interface EnrichSensesDeps {
  openDb?: () => DB;
  providerFactory?: (model: string) => SenseProvider;
}

export async function enrichSensesCommand(args: string[], deps: EnrichSensesDeps = {}): Promise<void> {
  const limitRaw = flagValue(args, '--limit');
  if (!limitRaw) {
    throw new Error(
      'enrich-senses requires --limit <n> — refusing to run without an explicit word cap (prevents accidental whole-DB spend)',
    );
  }
  const limit = Number.parseInt(limitRaw, 10);
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new Error(`enrich-senses: --limit must be a positive integer, got '${limitRaw}'`);
  }

  const tier = flagValue(args, '--tier');
  if (tier) {
    const config = loadConfig();
    if (!findTier(config, tier)) throw new Error(`unknown tier '${tier}'`);
  }

  const model = flagValue(args, '--model') ?? DEFAULT_SENSE_MODEL;
  const outputPath = flagValue(args, '--output') ?? DEFAULT_OUTPUT_PATH;
  const dryRun = args.includes('--dry-run');
  const noResume = args.includes('--no-resume');

  mkdirSync(dirname(outputPath), { recursive: true });

  const resumeIds = noResume ? new Set<string>() : readResumeWordIds(outputPath);
  if (resumeIds.size > 0) {
    logger.print(`resume: ${resumeIds.size} word(s) already in ${outputPath} — excluded from selection`);
  }

  const openDb = deps.openDb ?? openWorkingDb;
  const db = openDb();
  let words: WordRow[];
  try {
    words = selectWordsForSenseEnrichment(db, { limit, tier, excludeWordIds: resumeIds });
  } finally {
    db.close();
  }

  const estCost = estimateSenseEnrichmentCostUsd(words.length, model);
  const known = model in MODEL_PRICES_USD_PER_MTOK ? '' : ' (unknown model — priced as opus)';
  logger.print(
    `selected ${words.length} word(s)${tier ? ` from tier '${tier}'` : ''} for model ${model}`,
  );
  logger.print(
    `estimated cost: ~$${estCost.toFixed(2)} APPROXIMATE${known} ` +
      `(${EST_INPUT_TOKENS_PER_WORD} in + ${EST_OUTPUT_TOKENS_PER_WORD} out tokens/word — verify pricing before large runs)`,
  );

  if (words.length === 0) {
    logger.print('nothing to enrich — all selected words already have senses or are in the output file');
    return;
  }

  const first = words.slice(0, 5).map((w) => w.word);
  const last = words.slice(-5).map((w) => w.word);
  logger.print(`first: ${first.join(', ')}${words.length > 10 ? ` … last: ${last.join(', ')}` : ''}`);

  if (dryRun) {
    logger.print('dry-run: no API calls made, no provider constructed, $0 spent');
    return;
  }

  if (noResume && existsSync(outputPath)) {
    writeFileSync(outputPath, '', 'utf8');
    logger.print(`--no-resume: truncated ${outputPath}`);
  }

  const providerFactory = deps.providerFactory ?? ((m: string) => new AnthropicSenseProvider(undefined, m));
  const provider = providerFactory(model);

  const estBatches = Math.ceil(words.length / SENSE_BATCH_SIZE);
  const summary = await runEnrichSenses(provider, { words, outputPath });

  logger.print(
    `enrich-senses done: ${summary.enriched} enriched / ${summary.skippedByModel} skipped-by-model / ` +
      `${summary.invalidDropped} invalid-dropped / ${summary.batches} batches (est. ${estBatches})`,
  );
  logger.print(`next: validate + load with: npm run cli -- ingest-senses --source ${outputPath}`);
}
