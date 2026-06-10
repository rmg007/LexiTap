/**
 * `categorize` — Phase 3 of the JSONL pipeline. Cross-references every word in
 * `words_master.jsonl` against the specialty tiers (toefl / ielts / gre / gmat /
 * business / advanced / common9k / common3k) AND fills the CEFR level (closing
 * the legacy `foundation.csv` CEFR debt), using the OpenAI categorize provider.
 *
 *   categorize --limit <n> [--model <id>] [--master <path>] [--dry-run] [--no-resume]
 *
 * It MERGES into each word's `categories` array — never removes membership:
 * `foundation` and any pre-existing tier stay; the model's CEFR and specialty
 * tiers are added (deduped). The whole master file is rewritten in canonical
 * order after each flush chunk, so the diff is clean and an interrupted run
 * resumes from a sidecar `<master>.categorize-done.jsonl` of finished word_ids.
 *
 * Safety: `--limit` is required (no accidental whole-file paid run); a cost
 * estimate prints before any call; `--dry-run` constructs no provider and spends
 * nothing. The provider is injectable (deps) so tests run offline.
 */

import { basename, dirname, resolve } from 'node:path';
import { existsSync, renameSync } from 'node:fs';
import { loadConfig, findTier } from '@/lib/config';
import { logger } from '@/lib/logger';
import { flagValue } from '@/commands/validate';
import { DEFAULT_MASTER_PATH, type MasterWord } from '@/commands/export-master';
import {
  readMasterRecords,
  writeMasterRecords,
  cefrOf,
  tiersOf,
  composeCategories,
  masterWordToRow,
  orderByFrequency,
  readProgressIds,
  appendProgress,
} from '@/commands/master-store';
import {
  OpenAiCategorizeProvider,
  DEFAULT_CATEGORIZE_MODEL,
  type CategorizeProvider,
} from '@/providers/openaiCategorizeProvider';
import { makeOpenAiChat, estimateCostUsd, priceFor } from '@/providers/openaiClient';

/** Rough per-word token constants for the cost estimate (short structured I/O). */
export const EST_IN_TOKENS_PER_WORD = 80;
export const EST_OUT_TOKENS_PER_WORD = 40;
/** Words merged + flushed to disk per chunk (resume granularity). */
const FLUSH_CHUNK = 200;

export function categorizeProgressPath(masterPath: string): string {
  return resolve(dirname(masterPath), `${basename(masterPath)}.categorize-done.jsonl`);
}

export interface CategorizeMergeResult {
  cefrAdded: number;
  cefrChanged: number;
  tiersAdded: number;
}

/**
 * Merge one word's model categorization into its record, in place. CEFR is set
 * when the model returned one (overwrites a previous CEFR — the model is the
 * authority for the Phase-3 pass); specialty tiers are added on top of existing
 * membership. Returns what changed (for run-summary counters).
 */
export function mergeCategorization(
  rec: MasterWord,
  cefr: string | null,
  tiers: string[],
): CategorizeMergeResult {
  const result: CategorizeMergeResult = { cefrAdded: 0, cefrChanged: 0, tiersAdded: 0 };
  const prevCefr = cefrOf(rec);
  const nextCefr = cefr ?? prevCefr;
  if (cefr && !prevCefr) result.cefrAdded = 1;
  else if (cefr && prevCefr && cefr !== prevCefr) result.cefrChanged = 1;

  const existingTiers = new Set(tiersOf(rec));
  for (const t of tiers) {
    if (!existingTiers.has(t)) {
      existingTiers.add(t);
      result.tiersAdded += 1;
    }
  }
  rec.categories = composeCategories(nextCefr, existingTiers);
  return result;
}

export interface CategorizeDeps {
  providerFactory?: (model: string) => CategorizeProvider;
}

export const KNOWN_FLAGS = new Set(['--limit', '--model', '--master', '--tier', '--dry-run', '--no-resume']);

export async function categorizeCommand(args: string[], deps: CategorizeDeps = {}): Promise<void> {
  for (const token of args) {
    if (token.startsWith('--') && !KNOWN_FLAGS.has(token)) {
      throw new Error(`categorize: unknown flag '${token}' — known: ${[...KNOWN_FLAGS].join(', ')}`);
    }
  }

  const limitRaw = flagValue(args, '--limit');
  if (!limitRaw) {
    throw new Error('categorize requires --limit <n> (explicit cap; prevents accidental whole-file spend)');
  }
  const limit = Number.parseInt(limitRaw, 10);
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new Error(`categorize: --limit must be a positive integer, got '${limitRaw}'`);
  }

  const tier = flagValue(args, '--tier');
  if (tier && !findTier(loadConfig(), tier)) throw new Error(`unknown tier '${tier}'`);

  const model = flagValue(args, '--model') ?? DEFAULT_CATEGORIZE_MODEL;
  const masterPath = flagValue(args, '--master') ?? DEFAULT_MASTER_PATH;
  const dryRun = args.includes('--dry-run');
  const noResume = args.includes('--no-resume');
  const progressPath = categorizeProgressPath(masterPath);

  const records = readMasterRecords(masterPath);
  const byId = new Map(records.map((r) => [masterWordToRow(r).id, r] as const));

  let doneIds = noResume ? new Set<string>() : readProgressIds(progressPath);
  if (doneIds.size > 0) {
    logger.print(`resume: ${doneIds.size} word(s) already categorized in ${progressPath} — excluded`);
  }

  // Select up to `limit` not-yet-done records, frequency-ordered. A --tier filter
  // restricts to words already in that tier (re-categorize one slice).
  const candidates = orderByFrequency(records).filter((r) => {
    const id = masterWordToRow(r).id;
    if (doneIds.has(id)) return false;
    if (tier && !tiersOf(r).includes(tier)) return false;
    return true;
  });
  const selected = candidates.slice(0, limit);

  const price = priceFor(model);
  const estCost = estimateCostUsd(selected.length, model, EST_IN_TOKENS_PER_WORD, EST_OUT_TOKENS_PER_WORD);
  logger.print(`categorize: ${selected.length} word(s) selected for model ${model}${tier ? ` (tier '${tier}')` : ''}`);
  logger.print(
    `estimated cost: ~$${estCost.toFixed(2)} APPROXIMATE ` +
      `(${EST_IN_TOKENS_PER_WORD} in + ${EST_OUT_TOKENS_PER_WORD} out tokens/word @ $${price.input}/$${price.output} per Mtok)`,
  );

  if (selected.length === 0) {
    logger.print('nothing to categorize — all selected words already done');
    return;
  }
  if (dryRun) {
    logger.print('dry-run: no API calls, no provider constructed, $0 spent');
    return;
  }

  // Construct the provider only now. The default (real) factory validates the
  // API key; an injected factory (tests) needs no key. Back up the progress
  // sidecar on --no-resume rather than destroying it.
  const providerFactory =
    deps.providerFactory ??
    ((m: string) => {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error('categorize requires OPENAI_API_KEY in the environment');
      return new OpenAiCategorizeProvider(makeOpenAiChat(apiKey), m);
    });
  const provider = providerFactory(model);

  if (noResume && existsSync(progressPath)) {
    const backup = `${progressPath}.bak-${process.hrtime.bigint()}`;
    renameSync(progressPath, backup);
    logger.print(`--no-resume: existing progress backed up to ${backup}`);
    doneIds = new Set();
  }

  const totals = { categorized: 0, cefrAdded: 0, cefrChanged: 0, tiersAdded: 0 };
  for (let i = 0; i < selected.length; i += FLUSH_CHUNK) {
    const chunk = selected.slice(i, i + FLUSH_CHUNK);
    const rows = chunk.map(masterWordToRow);
    const { items } = await provider.classify(rows);

    const processed: { word_id: string }[] = [];
    for (const row of rows) {
      const rec = byId.get(row.id);
      if (!rec) continue;
      const cat = items.get(row.id);
      if (cat) {
        const m = mergeCategorization(rec, cat.cefr, cat.tiers);
        totals.categorized += 1;
        totals.cefrAdded += m.cefrAdded;
        totals.cefrChanged += m.cefrChanged;
        totals.tiersAdded += m.tiersAdded;
        processed.push({ word_id: row.id }); // mark done only when the model answered
      }
    }

    // Flush the whole master file + progress after each chunk.
    writeMasterRecords(masterPath, records);
    appendProgress(progressPath, processed);
    logger.print(
      `flushed chunk ${Math.floor(i / FLUSH_CHUNK) + 1}: ${totals.categorized}/${selected.length} categorized so far`,
    );
  }

  logger.print(
    `categorize done: ${totals.categorized} categorized — ` +
      `+${totals.cefrAdded} CEFR added, ${totals.cefrChanged} CEFR changed, +${totals.tiersAdded} tier tags. ` +
      `Master written to ${masterPath}; progress in ${progressPath}.`,
  );
  logger.print(`next: npm run cli -- import-master --source ${masterPath} && npm run cli -- validate --strict`);
}
