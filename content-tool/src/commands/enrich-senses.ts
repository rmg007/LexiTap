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
 *   interrupted run picks up where it left off. `--no-resume` starts fresh —
 *   the existing output is RENAMED to `<output>.bak-<timestamp>` (after the
 *   provider is constructed), never truncated or destroyed.
 * - Model skips persist to a sibling `<basename>-skipped.jsonl`: content skips
 *   (junk) are excluded permanently on resume; 'provider_error' skips stay
 *   retry-eligible.
 * - Unknown `--` flags are a hard error (a typo'd --dry-run must not pay).
 * - Working DB is opened READ-ONLY; a missing DB fails loudly instead of being
 *   silently created empty.
 * - Words that already have non-deleted `word_senses` rows are never selected.
 *
 * Provider is injectable (deps param) so tests run offline with a fake.
 */

import {
  readFileSync,
  appendFileSync,
  existsSync,
  mkdirSync,
  renameSync,
  truncateSync,
} from 'node:fs';
import { dirname, join, parse as parsePath, resolve } from 'node:path';
import type { DB } from '@/lib/db';
import { openWorkingDbReadonly } from '@/lib/db';
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

// ─── skip persistence (model-skipped words must survive across runs) ───────

/** Sibling skip file for an output path: `<dir>/<basename>-skipped.jsonl`. */
export function skipFilePathFor(outputPath: string): string {
  const { dir, name, ext } = parsePath(outputPath);
  return join(dir, `${name}-skipped${ext || '.jsonl'}`);
}

/**
 * word_ids the model skipped for CONTENT reasons (proper noun, function word,
 * demonym, inflection, …) in a previous run. These are excluded from selection
 * permanently on resume — re-selecting them re-pays for the same junk every
 * run and can livelock selection at zero progress. 'provider_error' skips are
 * NOT returned: they are transient (API failure / truncation) and stay
 * retry-eligible.
 */
export function readContentSkipWordIds(skipPath: string): Set<string> {
  if (!existsSync(skipPath)) return new Set();
  const ids = new Set<string>();
  for (const line of readFileSync(skipPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const obj = JSON.parse(trimmed) as { word_id?: unknown; reason?: unknown };
      if (typeof obj.word_id === 'string' && typeof obj.reason === 'string' && obj.reason !== 'provider_error') {
        ids.add(obj.word_id);
      }
    } catch {
      logger.warn(`skip file: ignoring unparseable line in ${skipPath}`);
    }
  }
  return ids;
}

/**
 * Repair a crash-truncated output file: if it exists, is non-empty, and does
 * not end with '\n', the final line is a partial JSON object from an
 * interrupted append — truncate it back to the last complete line so the next
 * append does not fuse with the garbage and corrupt a valid item.
 */
export function repairTruncatedOutput(outputPath: string): void {
  if (!existsSync(outputPath)) return;
  const text = readFileSync(outputPath, 'utf8');
  if (text.length === 0 || text.endsWith('\n')) return;
  const lastNewline = text.lastIndexOf('\n');
  truncateSync(outputPath, lastNewline + 1); // -1 + 1 = 0 → whole file was one partial line
  logger.warn(
    `${outputPath} ended with a partial line (interrupted previous run) — truncated it back to the last complete line`,
  );
}

// ─── core run (provider injected — offline-testable) ───────────────────────

export interface RunEnrichSensesOptions {
  words: WordRow[];
  outputPath: string;
}

export interface EnrichSensesSummary {
  enriched: number;
  skippedByModel: number;
  /** Content skips (proper noun / function word / …) — excluded on resume. */
  skippedContent: number;
  /** 'provider_error' skips (API failure / truncation) — retry-eligible on resume. */
  skippedProviderError: number;
  invalidDropped: number;
  batches: number;
}

export async function runEnrichSenses(
  provider: SenseProvider,
  options: RunEnrichSensesOptions,
): Promise<EnrichSensesSummary> {
  const { words, outputPath } = options;
  const skipFilePath = skipFilePathFor(outputPath);
  const summary: EnrichSensesSummary = {
    enriched: 0,
    skippedByModel: 0,
    skippedContent: 0,
    skippedProviderError: 0,
    invalidDropped: 0,
    batches: 0,
  };
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
      // Word-identity cross-check: a word_id/word swap by the model would ship
      // wrong teaching content under a valid id — drop it.
      if (
        item.word !== undefined &&
        (typeof item.word !== 'string' || item.word.toLowerCase() !== word.word.toLowerCase())
      ) {
        summary.invalidDropped += 1;
        logger.warn(
          `invalid item dropped (id: ${word.id}): returned word '${String(item.word)}' does not match batch word '${word.word}'`,
        );
        continue;
      }
      // A validator throw (non-string field types, …) is a one-item defect.
      let errors: ReturnType<typeof validateSenseIngestItem>;
      try {
        errors = validateSenseIngestItem(item);
      } catch (err) {
        summary.invalidDropped += 1;
        const msg = err instanceof Error ? err.message : String(err);
        logger.warn(`malformed item dropped (word: ${word.word}, id: ${word.id}): validator threw: ${msg}`);
        continue;
      }
      if (errors.length > 0) {
        summary.invalidDropped += 1;
        const detail = errors.map((e) => `${e.field}: ${e.message}`).join('; ');
        logger.warn(`invalid item dropped (word: ${word.word}, id: ${word.id}): ${detail}`);
        continue;
      }
      appendFileSync(outputPath, serializeSenseIngestFile([item]), 'utf8');
      summary.enriched += 1;
    }

    // Persist skips per batch so resume never re-selects (and re-pays for)
    // content junk, and so an interrupted run keeps its skip history.
    if (result.skipped.length > 0) {
      const lines = result.skipped
        .map((s) => JSON.stringify({ word_id: s.word_id, word: s.word, reason: s.reason }))
        .join('\n');
      appendFileSync(skipFilePath, `${lines}\n`, 'utf8');
    }
    allSkips.push(...result.skipped);
    summary.skippedByModel += result.skipped.length;
    for (const s of result.skipped) {
      if (s.reason === 'provider_error') summary.skippedProviderError += 1;
      else summary.skippedContent += 1;
    }

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

/** The complete flag whitelist — anything else `--`-prefixed is a hard error. */
export const KNOWN_FLAGS = new Set(['--limit', '--tier', '--model', '--output', '--dry-run', '--no-resume']);

export async function enrichSensesCommand(args: string[], deps: EnrichSensesDeps = {}): Promise<void> {
  // Reject unknown/typo'd flags BEFORE anything else — a misspelled --dry-run
  // (e.g. --dryrun) silently ignored would launch a paid run.
  for (const token of args) {
    if (token.startsWith('--') && !KNOWN_FLAGS.has(token)) {
      throw new Error(
        `enrich-senses: unknown flag '${token}' — known flags: ${[...KNOWN_FLAGS].join(', ')}`,
      );
    }
  }

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
  const skipFilePath = skipFilePathFor(outputPath);

  const resumeIds = noResume ? new Set<string>() : readResumeWordIds(outputPath);
  if (resumeIds.size > 0) {
    logger.print(`resume: ${resumeIds.size} word(s) already in ${outputPath} — excluded from selection`);
  }
  // Content skips are permanent (junk stays junk); provider_error skips are
  // transient and stay retry-eligible — readContentSkipWordIds filters them.
  const contentSkipIds = noResume ? new Set<string>() : readContentSkipWordIds(skipFilePath);
  if (contentSkipIds.size > 0) {
    logger.print(
      `resume: ${contentSkipIds.size} word(s) content-skipped in ${skipFilePath} — excluded from selection (provider_error skips stay retry-eligible)`,
    );
  }
  const excludeWordIds = new Set([...resumeIds, ...contentSkipIds]);

  // Read-only open: a missing working DB must FAIL loudly, never be silently
  // created empty (which would report "nothing to enrich").
  const openDb = deps.openDb ?? openWorkingDbReadonly;
  const db = openDb();
  let words: WordRow[];
  try {
    words = selectWordsForSenseEnrichment(db, { limit, tier, excludeWordIds });
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

  // Construct the provider FIRST (in live mode this also loads the few-shot
  // exemplars and validates ANTHROPIC_API_KEY). Only after construction
  // succeeds may --no-resume touch the existing (paid) output — and even then
  // it is BACKED UP, never destroyed.
  const providerFactory = deps.providerFactory ?? ((m: string) => new AnthropicSenseProvider(undefined, m));
  const provider = providerFactory(model);

  if (noResume) {
    const ts = Date.now();
    if (existsSync(outputPath)) {
      const backupPath = `${outputPath}.bak-${ts}`;
      renameSync(outputPath, backupPath);
      logger.print(`--no-resume: existing output backed up to ${backupPath}`);
    }
    if (existsSync(skipFilePath)) {
      const backupPath = `${skipFilePath}.bak-${ts}`;
      renameSync(skipFilePath, backupPath);
      logger.print(`--no-resume: existing skip file backed up to ${backupPath}`);
    }
  }

  // Crash repair: a previous run interrupted mid-append leaves a partial final
  // line — truncate it before this run's first append fuses with it.
  repairTruncatedOutput(outputPath);

  const estBatches = Math.ceil(words.length / SENSE_BATCH_SIZE);
  const summary = await runEnrichSenses(provider, { words, outputPath });

  logger.print(
    `enrich-senses done: ${summary.enriched} enriched / ${summary.skippedByModel} skipped-by-model ` +
      `(${summary.skippedContent} content — excluded on resume; ${summary.skippedProviderError} provider_error — retry-eligible) / ` +
      `${summary.invalidDropped} invalid-dropped / ${summary.batches} batches (est. ${estBatches})`,
  );
  if (summary.skippedByModel > 0) {
    logger.print(`skip list persisted to ${skipFilePath}`);
  }
  logger.print(`next: validate + load with: npm run cli -- ingest-senses --source ${outputPath}`);
}
