/**
 * `enrich` — add generated/curated fields to existing working-DB rows via the
 * injected provider registry, OR enrich a CSV directly via Claude/Anthropic batch calls.
 *
 * DB mode (--tier): Opt-in per enrichment flag; caches by word_id so re-runs skip
 * already-enriched rows unless `--force`. Never invents the `word`.
 *
 * CSV mode (--input/--output): Read raw CSV (word, pos), batch 60 words per Claude
 * call, output enriched CSV (word, definition, example_sentence). Cost-controlled
 * via --budget. Resumes on API failures, logs each batch result.
 *
 * Default DB providers are offline/deterministic (no API keys, no network), so DB
 * mode runs unchanged in CI. CSV mode requires ANTHROPIC_API_KEY env var.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { Anthropic } from '@anthropic-ai/sdk';
import { parse } from 'csv-parse/sync';
import type { DB } from '@/lib/db';
import { openWorkingDb } from '@/lib/db';
import { loadConfig, findTier } from '@/lib/config';
import { selectProviders } from '@/providers/defaultProviders';
import type { ProviderRegistry } from '@/providers/types';
import { logger } from '@/lib/logger';
import { flagValue } from '@/commands/validate';
import type { WordRow } from '@/schema/types';

export interface EnrichOptions {
  tier?: string;
  addSynonyms?: boolean;
  addAudio?: boolean;
  addImages?: boolean;
  force?: boolean;
  limit?: number;
  /** Provider name requested via --provider (validated by selectProviders). */
  provider?: string;
  // CSV mode
  input?: string;
  output?: string;
  budget?: number;
}

export interface EnrichInputRow {
  word: string;
  pos: string | null;
}

export interface EnrichOutputRow {
  word: string;
  definition: string;
  example_sentence: string;
}

export interface EnrichSummary {
  synonyms: number;
  audio: number;
  images: number;
}

/** Parse CSV with word and pos columns. */
function parseInputCsv(text: string): EnrichInputRow[] {
  const records = parse(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, unknown>[];

  return records.map((record, idx) => {
    const word = String(record.word ?? '').trim();
    if (!word) throw new Error(`Row ${idx + 2}: missing word`);
    return {
      word,
      pos: record.pos ? String(record.pos).trim() : null,
    };
  });
}

/** Estimate tokens for a batch of words (rough: ~3 tokens per word in prompt). */
function estimateBatchTokens(words: string[]): number {
  const prompt = JSON.stringify(words);
  return Math.ceil(prompt.length / 4) + 50; // rough estimate
}

/** Call Claude (Anthropic) to enrich a batch of words. Returns {word, definition, example_sentence}[]. */
async function enrichBatch(
  client: Anthropic,
  words: string[],
): Promise<Map<string, EnrichOutputRow>> {
  const userPrompt = `Generate ESL-appropriate definitions and single-blank example sentences for these words:
${JSON.stringify(words)}

For EACH word, respond with ONLY this exact JSON format (no extra text):
[
  {"word": "word1", "definition": "brief definition", "example_sentence": "sentence with _ blank for target word"},
  ...
]

RULES:
- definition: 1-2 concise sentences, A2-B1 ESL level
- example_sentence: exactly 1 blank (_) where the word appears
- JSON ONLY, no markdown, no extra text`;

  const message = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 2000,
    system: 'You are an ESL vocabulary expert. Generate accurate, learner-friendly definitions and example sentences for English words.',
    messages: [
      {
        role: 'user',
        content: userPrompt,
      },
    ],
  });

  const responseText = message.content[0]?.type === 'text' ? message.content[0].text : '';

  // Parse JSON array from response
  const jsonMatch = responseText.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    logger.warn(`Could not parse JSON from enrichment response for batch: ${words.join(', ')}`);
    return new Map();
  }

  const results: EnrichOutputRow[] = JSON.parse(jsonMatch[0]);
  const map = new Map<string, EnrichOutputRow>();
  for (const row of results) {
    if (row.word && row.definition && row.example_sentence) {
      map.set(row.word.toLowerCase(), row);
    }
  }
  return map;
}

/** Enrich CSV via Anthropic Claude, batch 60 words per call. */
async function enrichCsvViaAnthropic(
  inputPath: string,
  outputPath: string,
  budgetUsd: number,
): Promise<void> {
  const inputText = readFileSync(inputPath, 'utf8');
  const rows = parseInputCsv(inputText);

  if (rows.length === 0) {
    logger.warn('No rows to enrich');
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY env var not set');
  }

  const client = new Anthropic({ apiKey });

  // Estimate cost upfront
  const batchSize = 60;
  const batchCount = Math.ceil(rows.length / batchSize);
  const estimatedInputTokens = rows.reduce((sum, row) => sum + estimateBatchTokens([row.word]), 0);
  const estimatedCost = (estimatedInputTokens * 3 + batchCount * 1000) / 1000000 * 3; // rough: $3/1M in
  logger.print(`Enriching ${rows.length} words in ~${batchCount} batches (estimated ~$${estimatedCost.toFixed(2)})`);

  if (estimatedCost > budgetUsd) {
    throw new Error(`Estimated cost $${estimatedCost.toFixed(2)} exceeds budget $${budgetUsd}`);
  }

  // Batch and enrich
  const enrichedMap = new Map<string, EnrichOutputRow>();
  let batchNum = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, Math.min(i + batchSize, rows.length));
    const words = batch.map((r) => r.word);
    batchNum += 1;

    try {
      logger.print(`Batch ${batchNum}: enriching ${words.length} words...`);
      const batchResults = await enrichBatch(client, words);
      for (const [word, result] of batchResults) {
        enrichedMap.set(word, result);
      }
      logger.print(`  → matched ${batchResults.size}/${words.length}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn(`  → batch failed: ${msg} (skipping)`);
    }
  }

  // Build output with original order preserved
  const output: EnrichOutputRow[] = rows.map((row) => {
    const enriched = enrichedMap.get(row.word.toLowerCase());
    return enriched || { word: row.word, definition: '', example_sentence: '' };
  });

  // Write CSV
  const csvText = [
    ['word', 'definition', 'example_sentence'].join(','),
    ...output.map((row) =>
      [row.word, `"${row.definition.replace(/"/g, '""')}"`, `"${row.example_sentence.replace(/"/g, '""')}"`].join(','),
    ),
  ].join('\n');

  writeFileSync(outputPath, csvText, 'utf8');
  logger.print(`Wrote ${output.length} rows to ${outputPath}`);
}

function loadTierRows(db: DB, tier: string): WordRow[] {
  return db
    .prepare(
      `SELECT w.* FROM words w
       JOIN word_tiers wt ON wt.word_id = w.id
       WHERE wt.tier_id = ? AND w.deleted_at IS NULL`,
    )
    .all(tier) as WordRow[];
}

/** Apply enrichments to the rows of one tier using the given providers. */
export async function runEnrich(
  db: DB,
  providers: ProviderRegistry,
  options: EnrichOptions,
): Promise<EnrichSummary> {
  const summary: EnrichSummary = { synonyms: 0, audio: 0, images: 0 };
  if (!options.tier) throw new Error('runEnrich: tier required');
  let rows = loadTierRows(db, options.tier);
  if (options.limit !== undefined) rows = rows.slice(0, options.limit);

  const setSynonyms = db.prepare(`UPDATE words SET synonyms = ?, antonyms = ? WHERE id = ?`);
  const setAudio = db.prepare(`UPDATE words SET audio_path = ? WHERE id = ?`);
  const setImage = db.prepare(`UPDATE words SET image_path = ? WHERE id = ?`);

  for (const row of rows) {
    if (options.addSynonyms && (options.force || row.synonyms === null)) {
      const { synonyms, antonyms } = await providers.synonyms.generate(row);
      setSynonyms.run(JSON.stringify(synonyms), JSON.stringify(antonyms), row.id);
      summary.synonyms += 1;
    }
    if (options.addAudio && (options.force || row.audio_path === null)) {
      const path = await providers.audio.assignAudio(row);
      if (path !== null) {
        setAudio.run(path, row.id);
        summary.audio += 1;
      }
    }
    if (options.addImages && (options.force || row.image_path === null)) {
      const path = await providers.image.assignImage(row);
      if (path !== null) {
        setImage.run(path, row.id);
        summary.images += 1;
      }
    }
  }
  return summary;
}

/** CLI entry for `enrich`. Detects CSV vs DB mode. */
export async function enrichCommand(args: string[]): Promise<void> {
  const input = flagValue(args, '--input');
  const output = flagValue(args, '--output');

  // CSV mode: --input and --output
  if (input || output) {
    if (!input) throw new Error('enrich (CSV mode) requires --input <path>');
    if (!output) throw new Error('enrich (CSV mode) requires --output <path>');

    const budgetRaw = flagValue(args, '--budget');
    const budget = budgetRaw ? Number.parseFloat(budgetRaw) : 50;

    if (args.includes('--dry-run')) {
      logger.print(`dry-run: would enrich ${input} → ${output} (budget $${budget}, no API calls)`);
      return;
    }

    await enrichCsvViaAnthropic(input, output, budget);
    return;
  }

  // DB mode: --tier (original behavior)
  const tier = flagValue(args, '--tier');
  if (!tier) throw new Error('enrich requires --tier <slug> or --input <path>');

  const config = loadConfig();
  if (!findTier(config, tier)) throw new Error(`unknown tier '${tier}'`);

  const limitRaw = flagValue(args, '--limit');
  const provider = flagValue(args, '--provider');
  const options: EnrichOptions = {
    tier,
    addSynonyms: args.includes('--add-synonyms'),
    addAudio: args.includes('--add-audio'),
    addImages: args.includes('--add-images'),
    force: args.includes('--force'),
    limit: limitRaw ? Number.parseInt(limitRaw, 10) : undefined,
    provider,
  };

  // Validate the provider name up front so --dry-run also catches typos.
  const providers = selectProviders(provider);
  const via = provider ? ` via ${provider}` : '';

  if (args.includes('--dry-run')) {
    logger.print(`dry-run: would enrich tier '${tier}'${via} (no provider calls, $0)`);
    return;
  }

  const db = openWorkingDb();
  try {
    const summary = await runEnrich(db, providers, options);
    logger.print(
      `enriched${via} synonyms ${summary.synonyms} / audio ${summary.audio} / images ${summary.images}`,
    );
  } finally {
    db.close();
  }
}
