/**
 * CONTENT-2 — Anthropic (Claude) rich-sense enrichment provider.
 *
 * Per word (word, pos, flat definition, cefr_level) the model decides DISTINCT
 * senses conservatively (default 1; no filler), writes a felt 2–4 sentence
 * `explanation` per sense (never a gloss restatement) + 2–3 FULL-sentence
 * teaching examples (no "_" blank), or SKIPS seed-list junk (proper nouns,
 * demonyms, mislabeled function words, unlemmatized inflections) with a reason.
 *
 * Small batches (8 words/call — output is long prose) + generous max_tokens.
 * Strict JSON contract; one repair retry per batch on parse failure, then the
 * batch fails closed (words → skipped with reason 'provider_error'). Each
 * returned item is run through `validateSenseIngestItem`; invalid items are
 * dropped + logged (fail-closed, count reported).
 *
 * Requires ANTHROPIC_API_KEY; throws at construction if absent (same as
 * AnthropicDefinitionProvider). Few-shot exemplars are loaded VERBATIM from
 * data/input/sample-senses.jsonl — the owner-approved quality bar.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Anthropic } from '@anthropic-ai/sdk';
import { logger } from '@/lib/logger';
import { PROJECT_ROOT } from '@/lib/config';
import type { WordRow } from '@/schema/types';
import type { SenseProvider, SenseGenerationResult, SenseSkip } from '@/providers/types';
import { parseSenseIngestFile, type SenseIngestItem } from '@/commands/ingest-senses';
import { validateSenseIngestItem } from '@/commands/synthesize-senses';

/** Words per API call. Output is long prose — keep batches small. */
export const SENSE_BATCH_SIZE = 8;
export const DEFAULT_SENSE_MODEL = 'claude-opus-4-8';
/** Generous output ceiling: 8 words × multi-sense felt prose ≈ 6–10k tokens. */
const MAX_TOKENS = 16000;
const SAMPLE_SENSES_PATH = resolve(PROJECT_ROOT, 'data', 'input', 'sample-senses.jsonl');
/** Exemplars pulled VERBATIM from the owner-approved sample file. */
const EXEMPLAR_WORDS = ['plant', 'borrow'] as const;

// ─── few-shot exemplars (verbatim from sample-senses.jsonl) ────────────────

let exemplarCache: string | null = null;

/**
 * Return the raw JSONL lines for the exemplar words, byte-for-byte as they
 * appear in sample-senses.jsonl ("plant" = the multi-sense showcase, "borrow"
 * = single-sense restraint). Throws if the sample file is missing or an
 * exemplar word is absent — the prompt is meaningless without its quality bar.
 */
export function loadFewShotExemplars(samplePath: string = SAMPLE_SENSES_PATH): string {
  if (exemplarCache !== null && samplePath === SAMPLE_SENSES_PATH) return exemplarCache;
  const text = readFileSync(samplePath, 'utf8');
  const lines = text.split('\n').filter((l) => l.trim());
  const byWord = new Map<string, string>();
  for (const line of lines) {
    const { items } = parseSenseIngestFile(line);
    const word = items[0]?.word;
    if (word) byWord.set(word, line.trim());
  }
  const picked: string[] = [];
  for (const w of EXEMPLAR_WORDS) {
    const line = byWord.get(w);
    if (!line) throw new Error(`loadFewShotExemplars: exemplar word '${w}' not found in ${samplePath}`);
    picked.push(line);
  }
  const joined = picked.join('\n');
  if (samplePath === SAMPLE_SENSES_PATH) exemplarCache = joined;
  return joined;
}

// ─── prompt construction (pure — unit-testable without network) ────────────

export interface SensePrompt {
  system: string;
  user: string;
}

interface PromptWordInput {
  word_id: string;
  word: string;
  pos: string | null;
  definition: string;
  cefr_level: string | null;
}

export function buildSensePrompt(words: WordRow[]): SensePrompt {
  const exemplars = loadFewShotExemplars();

  const system = `You write felt vocabulary teaching content for LexiTap, an offline ESL vocabulary app for global non-native English learners aged 13+.

For each input word you receive (word, pos, existing flat definition, cefr_level), produce rich teaching senses:

SENSE COUNT — be conservative:
- Default to exactly 1 sense. Add a 2nd or 3rd sense ONLY when it is genuinely distinct (a different core meaning, not a shade of the same one) AND learner-relevant at that word's CEFR level. Most words stay single-sense. Never invent filler senses.

PER SENSE:
- "pos": the part of speech for THAT sense (a word's senses can differ, e.g. noun vs verb).
- "short_gloss": a one-line dictionary gloss.
- "explanation": 2-4 sentences of FELT teaching prose — concrete, plain, sensory where it helps — that makes the learner internalize the word, not just decode it. NEVER a restatement or paraphrase of the gloss. Write like the exemplars below.
- "examples": 2-3 FULL natural sentences showing the sense in use. ABSOLUTELY NO "_" blank anywhere — these are teaching sentences, not quiz cloze items.
- Indices: "sense_index" and "example_index" are 0-based and contiguous.

SKIP RULE — the seed list contains junk; do not spend tokens dressing it up:
If an input word is (a) a proper noun (surname, brand, place name), (b) a bare function word mislabeled as content vocabulary, (c) a demonym (e.g. "british"), or (d) an inflected form whose lemma should be taught instead (e.g. "regarded", "adding"), DO NOT generate senses for it. Return it in the "skipped" list with a one-line reason.

QUALITY BAR — these two exemplars are hand-approved by the product owner and define the exact register, restraint, and prose quality expected ("plant" shows a genuine 2-sense word; "borrow" shows single-sense restraint):
${exemplars}

OUTPUT CONTRACT — respond with STRICT JSON only (no markdown fences, no prose before or after) of exactly this shape:
{"items":[<SenseIngestItem like the exemplars: {"word_id":...,"word":...,"senses":[...]}>],"skipped":[{"word_id":"...","word":"...","reason":"one-line reason"}]}
Every input word must appear exactly once — either in "items" or in "skipped". Use each word's "word_id" exactly as given.`;

  const inputs: PromptWordInput[] = words.map((w) => ({
    word_id: w.id,
    word: w.word,
    pos: w.pos,
    definition: w.definition,
    cefr_level: w.cefr_level,
  }));

  const user = `Generate rich teaching senses for these words:
${JSON.stringify(inputs, null, 2)}

Respond with the strict JSON object described in the output contract — nothing else.`;

  return { system, user };
}

// ─── response parsing (pure — unit-testable without network) ───────────────

interface RawSkip {
  word_id?: unknown;
  word?: unknown;
  reason?: unknown;
}

interface RawResponse {
  items?: unknown;
  skipped?: unknown;
}

export interface ParsedSenseResponse {
  items: Map<string, SenseIngestItem>;
  skipped: SenseSkip[];
  /** Items returned by the model but dropped by validateSenseIngestItem. */
  invalidDropped: number;
}

/**
 * Parse the model's strict-JSON response. Throws on malformed JSON or a
 * missing top-level shape (caller retries once with the error message).
 * Per-item V1–V10 violations do NOT throw — those items are dropped + logged.
 */
export function parseSenseResponse(text: string): ParsedSenseResponse {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new Error(`response is not valid JSON: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('response must be a JSON object with "items" and "skipped" arrays');
  }
  const raw = parsed as RawResponse;
  if (!Array.isArray(raw.items) || !Array.isArray(raw.skipped)) {
    throw new Error('response must have "items" (array) and "skipped" (array)');
  }

  const items = new Map<string, SenseIngestItem>();
  let invalidDropped = 0;
  for (const candidate of raw.items as unknown[]) {
    const item = candidate as SenseIngestItem;
    const errors = validateSenseIngestItem(item);
    if (errors.length > 0) {
      invalidDropped += 1;
      const summary = errors.map((e) => `${e.field}: ${e.message}`).join('; ');
      logger.warn(`dropping invalid item (word_id: ${item?.word_id ?? 'unknown'}): ${summary}`);
      continue;
    }
    items.set(item.word_id, item);
  }

  const skipped: SenseSkip[] = [];
  for (const candidate of raw.skipped as RawSkip[]) {
    if (typeof candidate?.word_id === 'string' && typeof candidate?.reason === 'string') {
      skipped.push({
        word_id: candidate.word_id,
        word: typeof candidate.word === 'string' ? candidate.word : '',
        reason: candidate.reason,
      });
    }
  }

  return { items, skipped, invalidDropped };
}

// ─── provider ──────────────────────────────────────────────────────────────

export class AnthropicSenseProvider implements SenseProvider {
  readonly name = 'anthropic-senses';
  readonly model: string;
  private readonly client: Anthropic;

  constructor(apiKey?: string, model: string = DEFAULT_SENSE_MODEL) {
    const key = apiKey ?? process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error('AnthropicSenseProvider requires ANTHROPIC_API_KEY');
    this.client = new Anthropic({ apiKey: key });
    this.model = model;
  }

  async generate(words: WordRow[]): Promise<SenseGenerationResult> {
    const items = new Map<string, SenseIngestItem>();
    const skipped: SenseSkip[] = [];
    const totalBatches = Math.ceil(words.length / SENSE_BATCH_SIZE);

    for (let i = 0; i < words.length; i += SENSE_BATCH_SIZE) {
      const batch = words.slice(i, i + SENSE_BATCH_SIZE);
      const batchNum = Math.floor(i / SENSE_BATCH_SIZE) + 1;
      logger.print(`  senses batch ${batchNum}/${totalBatches} (${batch.length} words)...`);
      const result = await this._generateBatch(batch);
      for (const [id, item] of result.items) items.set(id, item);
      skipped.push(...result.skipped);
      logger.print(
        `  → ${result.items.size} enriched, ${result.skipped.length} skipped` +
          (result.invalidDropped > 0 ? `, ${result.invalidDropped} invalid-dropped` : ''),
      );
    }

    return { items, skipped };
  }

  private async _generateBatch(words: WordRow[]): Promise<ParsedSenseResponse> {
    const { system, user } = buildSensePrompt(words);
    const messages: { role: 'user' | 'assistant'; content: string }[] = [{ role: 'user', content: user }];

    try {
      const first = await this._callModel(system, messages);
      try {
        return parseSenseResponse(first);
      } catch (parseErr) {
        // One repair retry: re-ask with the parse error appended to the turn.
        const errMsg = parseErr instanceof Error ? parseErr.message : String(parseErr);
        logger.warn(`batch parse failed (${errMsg}) — retrying once with repair prompt`);
        messages.push({ role: 'assistant', content: first });
        messages.push({
          role: 'user',
          content: `Your previous response could not be parsed: ${errMsg}. Respond again with ONLY the strict JSON object ({"items":[...],"skipped":[...]}) — no markdown fences, no other text.`,
        });
        const second = await this._callModel(system, messages);
        return parseSenseResponse(second);
      }
    } catch (err) {
      // Fail closed: API error or second parse failure → whole batch skipped.
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn(`batch failed: ${msg} (${words.length} words → skipped as provider_error)`);
      return {
        items: new Map(),
        skipped: words.map((w) => ({ word_id: w.id, word: w.word, reason: 'provider_error' })),
        invalidDropped: 0,
      };
    }
  }

  private async _callModel(
    system: string,
    messages: { role: 'user' | 'assistant'; content: string }[],
  ): Promise<string> {
    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: MAX_TOKENS,
      system,
      messages,
    });
    return message.content[0]?.type === 'text' ? message.content[0].text : '';
  }
}
