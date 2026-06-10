/**
 * `enrich-master` — Phase 4 of the JSONL pipeline. Selects un-enriched words
 * (empty `senses`) from `words_master.jsonl`, calls the OpenAI sense+question
 * provider, validates every item (senses V1–V10, questions Q1–Q9), and writes
 * the senses + 5 questions BACK INTO the master file in place (per the JSONL
 * redesign — enrichment updates the master, not a separate file).
 *
 *   enrich-master --limit <n> [--model <id>] [--master <path>] [--dry-run] [--no-resume]
 *
 * Safety mirrors `enrich-senses`: `--limit` required; cost estimate before any
 * call; `--dry-run` spends nothing; the master file is rewritten after each
 * batch so an interrupted run resumes (words that already have senses are not
 * re-selected); model skips persist to `<master>.enrich-skipped.jsonl` —
 * CONTENT skips are excluded permanently, `provider_error` skips stay
 * retry-eligible. Provider is injectable (deps) so tests run offline.
 */

import { existsSync, renameSync, readFileSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { logger } from '@/lib/logger';
import { flagValue } from '@/commands/validate';
import { DEFAULT_MASTER_PATH } from '@/commands/export-master';
import {
  readMasterRecords,
  writeMasterRecords,
  masterWordToRow,
  orderByFrequency,
  appendProgress,
} from '@/commands/master-store';
import { validateSenseIngestItem } from '@/commands/synthesize-senses';
import { validateMasterQuestions } from '@/commands/question-validators';
import type { SenseIngestItem } from '@/commands/ingest-senses';
import type { WordRow } from '@/schema/types';
import {
  OpenAiSenseQuestionProvider,
  DEFAULT_ENRICH_MODEL,
  ENRICH_BATCH_SIZE,
  type SenseQuestionProvider,
  type MasterEnrichItem,
} from '@/providers/openaiSenseQuestionProvider';
import {
  makeOpenAiChat,
  estimateCostUsd,
  priceFor,
  OPENAI_PRICES_USD_PER_MTOK,
} from '@/providers/openaiClient';

/** Rough per-word token constants for the cost estimate (long prose + 5 Qs). */
export const EST_IN_TOKENS_PER_WORD = 1500;
export const EST_OUT_TOKENS_PER_WORD = 1200;
/** Number of authored questions required per word. */
export const REQUIRED_QUESTION_COUNT = 5;

export function enrichSkipPath(masterPath: string): string {
  return resolve(dirname(masterPath), `${basename(masterPath)}.enrich-skipped.jsonl`);
}

/** Adapt a MasterEnrichItem's senses into the SenseIngestItem shape the sense validators expect. */
export function toSenseIngestItem(item: MasterEnrichItem): SenseIngestItem {
  return {
    word_id: item.word_id,
    word: item.word,
    senses: item.senses.map((s) => ({
      sense_index: s.sense_index,
      pos: s.pos,
      short_gloss: s.short_gloss,
      explanation: s.explanation,
      image_path: s.image_path,
      examples: s.examples.map((text, i) => ({ example_index: i, text })),
    })),
  };
}

export interface EnrichItemValidation {
  ok: boolean;
  reason?: string;
}

/**
 * Validate one generated item against the batch word: identity match, senses
 * (V1–V10), and exactly 5 well-formed questions (Q1–Q9). Returns the first
 * failing reason — the item is dropped on any failure (fail-closed).
 */
export function validateEnrichItem(item: MasterEnrichItem, word: WordRow): EnrichItemValidation {
  if (item.word && item.word.toLowerCase() !== word.word.toLowerCase()) {
    return { ok: false, reason: `returned word '${item.word}' != batch word '${word.word}'` };
  }
  let senseErrors: ReturnType<typeof validateSenseIngestItem>;
  try {
    senseErrors = validateSenseIngestItem(toSenseIngestItem(item));
  } catch (err) {
    return { ok: false, reason: `sense validator threw: ${err instanceof Error ? err.message : String(err)}` };
  }
  if (senseErrors.length > 0) {
    return { ok: false, reason: `senses: ${senseErrors.map((e) => `${e.field}: ${e.message}`).join('; ')}` };
  }
  const qErrors = validateMasterQuestions(item.questions, { expectedCount: REQUIRED_QUESTION_COUNT });
  if (qErrors.length > 0) {
    return { ok: false, reason: `questions: ${qErrors.map((e) => `${e.field}: ${e.message}`).join('; ')}` };
  }
  return { ok: true };
}

export interface EnrichMasterDeps {
  providerFactory?: (model: string) => SenseQuestionProvider;
}

export const KNOWN_FLAGS = new Set(['--limit', '--model', '--master', '--dry-run', '--no-resume']);

export async function enrichMasterCommand(args: string[], deps: EnrichMasterDeps = {}): Promise<void> {
  for (const token of args) {
    if (token.startsWith('--') && !KNOWN_FLAGS.has(token)) {
      throw new Error(`enrich-master: unknown flag '${token}' — known: ${[...KNOWN_FLAGS].join(', ')}`);
    }
  }

  const limitRaw = flagValue(args, '--limit');
  if (!limitRaw) {
    throw new Error('enrich-master requires --limit <n> (explicit cap; prevents accidental whole-file spend)');
  }
  const limit = Number.parseInt(limitRaw, 10);
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new Error(`enrich-master: --limit must be a positive integer, got '${limitRaw}'`);
  }

  const model = flagValue(args, '--model') ?? DEFAULT_ENRICH_MODEL;
  const masterPath = flagValue(args, '--master') ?? DEFAULT_MASTER_PATH;
  const dryRun = args.includes('--dry-run');
  const noResume = args.includes('--no-resume');
  const skipPath = enrichSkipPath(masterPath);

  const records = readMasterRecords(masterPath);
  const byId = new Map(records.map((r) => [masterWordToRow(r).id, r] as const));

  // CONTENT skips are permanent; provider_error skips stay retry-eligible.
  const contentSkipIds = noResume ? new Set<string>() : readContentSkips(skipPath);
  if (contentSkipIds.size > 0) {
    logger.print(`resume: ${contentSkipIds.size} word(s) content-skipped in ${skipPath} — excluded`);
  }

  // Eligible = no senses yet AND not content-skipped, frequency-ordered.
  const selected = orderByFrequency(records)
    .filter((r) => r.senses.length === 0 && !contentSkipIds.has(masterWordToRow(r).id))
    .slice(0, limit);

  const price = priceFor(model);
  const estCost = estimateCostUsd(selected.length, model, EST_IN_TOKENS_PER_WORD, EST_OUT_TOKENS_PER_WORD);
  const known = model in OPENAI_PRICES_USD_PER_MTOK ? '' : ' (unknown model — priced as gpt-4.1)';
  logger.print(`enrich-master: ${selected.length} word(s) selected for model ${model}${known}`);
  logger.print(
    `estimated cost: ~$${estCost.toFixed(2)} APPROXIMATE ` +
      `(${EST_IN_TOKENS_PER_WORD} in + ${EST_OUT_TOKENS_PER_WORD} out tokens/word @ $${price.input}/$${price.output} per Mtok — verify before large runs)`,
  );

  if (selected.length === 0) {
    logger.print('nothing to enrich — all selected words already have senses or are content-skipped');
    return;
  }
  const first = selected.slice(0, 5).map((w) => w.word);
  const last = selected.slice(-5).map((w) => w.word);
  logger.print(`first: ${first.join(', ')}${selected.length > 10 ? ` … last: ${last.join(', ')}` : ''}`);

  if (dryRun) {
    logger.print('dry-run: no API calls, no provider constructed, $0 spent');
    return;
  }

  // The default (real) factory validates the API key; an injected factory
  // (tests) needs no key.
  const providerFactory =
    deps.providerFactory ??
    ((m: string) => {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error('enrich-master requires OPENAI_API_KEY in the environment');
      return new OpenAiSenseQuestionProvider(makeOpenAiChat(apiKey), m);
    });
  const provider = providerFactory(model);

  if (noResume && existsSync(skipPath)) {
    const backup = `${skipPath}.bak-${process.hrtime.bigint()}`;
    renameSync(skipPath, backup);
    logger.print(`--no-resume: existing skip file backed up to ${backup}`);
  }

  const totals = { enriched: 0, skippedContent: 0, skippedProviderError: 0, invalidDropped: 0 };
  for (let i = 0; i < selected.length; i += ENRICH_BATCH_SIZE) {
    const chunk = selected.slice(i, i + ENRICH_BATCH_SIZE);
    const rows = chunk.map(masterWordToRow);
    const result = await provider.generate(rows);

    for (const row of rows) {
      const item = result.items.get(row.id);
      if (!item) continue;
      const rec = byId.get(row.id);
      if (!rec) continue;
      const check = validateEnrichItem(item, row);
      if (!check.ok) {
        totals.invalidDropped += 1;
        logger.warn(`invalid item dropped (word: ${row.word}, id: ${row.id}): ${check.reason}`);
        continue;
      }
      rec.senses = item.senses;
      rec.questions = item.questions;
      totals.enriched += 1;
    }

    // Persist skips so resume never re-selects content junk.
    const skipEntries = result.skipped.map((s) => ({ word_id: s.word_id, word: s.word, reason: s.reason }));
    appendProgress(skipPath, skipEntries);
    for (const s of result.skipped) {
      if (s.reason === 'provider_error') totals.skippedProviderError += 1;
      else totals.skippedContent += 1;
    }

    // Flush the master file after each batch (resume-safe).
    writeMasterRecords(masterPath, records);
    logger.print(
      `batch ${Math.floor(i / ENRICH_BATCH_SIZE) + 1}: ${totals.enriched} enriched, ` +
        `${totals.skippedContent + totals.skippedProviderError} skipped, ${totals.invalidDropped} invalid (of ${selected.length})`,
    );
  }

  logger.print(
    `enrich-master done: ${totals.enriched} enriched / ` +
      `${totals.skippedContent} content-skipped (excluded on resume) / ` +
      `${totals.skippedProviderError} provider_error (retry-eligible) / ${totals.invalidDropped} invalid-dropped. ` +
      `Master written to ${masterPath}.`,
  );
  logger.print(`next: npm run cli -- import-master --source ${masterPath} && npm run cli -- validate --strict && npm run release`);
}

// ─── skip-file helpers ───────────────────────────────────────────────────────

/**
 * word_ids the model skipped for CONTENT reasons (proper noun, function word,
 * …) in a previous run — excluded permanently on resume. `provider_error` skips
 * are transient and intentionally NOT returned (they stay retry-eligible).
 */
export function readContentSkips(skipPath: string): Set<string> {
  if (!existsSync(skipPath)) return new Set();
  const ids = new Set<string>();
  for (const line of readFileSync(skipPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t) continue;
    try {
      const o = JSON.parse(t) as { word_id?: unknown; reason?: unknown };
      if (typeof o.word_id === 'string' && typeof o.reason === 'string' && o.reason !== 'provider_error') {
        ids.add(o.word_id);
      }
    } catch {
      /* ignore unparseable skip line */
    }
  }
  return ids;
}
