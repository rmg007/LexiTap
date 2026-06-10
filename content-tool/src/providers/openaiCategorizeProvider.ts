/**
 * Phase 3 — OpenAI word-categorization provider. Given a batch of words
 * (word, pos, definition, current cefr_level) it returns, per word: the CEFR
 * level (A1–C2) and the subset of specialty tiers the word belongs to
 * (toefl / ielts / gre / gmat / business / advanced / common9k / common3k).
 *
 * This is the "cross-reference specialty tiers + fix the CEFR debt" task from
 * CONTENT_PIPELINE_JSONL_PLAN.md, done with the model rather than by sourcing
 * and licence-checking seven external word lists. `foundation` is never emitted
 * (every word already carries it); unknown slugs are dropped, not errored —
 * the merge step only ADDS known tags and never removes existing membership.
 *
 * Strict-JSON contract, one repair retry per batch, fail-closed: an unparseable
 * batch returns NO categorizations for its words (they stay as-is, retry-
 * eligible on the next run) rather than corrupting the master file.
 *
 * Network is the injected `OpenAiChatFn` seam, so tests run offline.
 */

import { logger } from '@/lib/logger';
import type { WordRow } from '@/schema/types';
import { CEFR_LEVELS } from '@/commands/export-master';
import {
  type OpenAiChatFn,
  OpenAiTruncationError,
  parseJsonObject,
} from '@/providers/openaiClient';

/** Specialty tiers the model may assign. `foundation` is excluded on purpose. */
export const SPECIALTY_TIERS = [
  'toefl',
  'ielts',
  'gre',
  'gmat',
  'business',
  'advanced',
  'common9k',
  'common3k',
] as const;

export const DEFAULT_CATEGORIZE_MODEL = 'gpt-4.1-mini';
/** Words per call — short structured output, so a large batch is safe + cheap. */
export const CATEGORIZE_BATCH_SIZE = 40;
const MAX_TOKENS = 4096;

export interface WordCategorization {
  word_id: string;
  /** A1–C2, or null when the model is unsure. */
  cefr: string | null;
  /** Known specialty tier slugs (never `foundation`, never unknown). */
  tiers: string[];
}

export interface CategorizeResult {
  items: Map<string, WordCategorization>;
}

export interface CategorizeProvider {
  readonly name: string;
  classify(words: WordRow[]): Promise<CategorizeResult>;
}

interface PromptWordInput {
  word_id: string;
  word: string;
  pos: string | null;
  definition: string;
  current_cefr: string | null;
}

// ─── prompt (pure — unit-testable) ───────────────────────────────────────────

export function buildCategorizePrompt(words: WordRow[]): { system: string; user: string } {
  const system = `You are a CEFR-leveling and exam-vocabulary classifier for LexiTap, an ESL vocabulary app.

For EACH input word decide two things:

1. "cefr" — the single CEFR level (one of "A1","A2","B1","B2","C1","C2") that best matches how common and how difficult the word is for a learner of English. Base it on the word's everyday frequency and conceptual difficulty, NOT on the definition's wording. If a word already has a CEFR value you may keep or correct it. Never return null unless the token is genuinely not a teachable English word.

2. "tiers" — the subset of these specialty lists the word genuinely belongs to (return ONLY slugs from this exact set, or an empty array):
   - "toefl": academic English vocabulary common on the TOEFL exam.
   - "ielts": academic/general vocabulary common on the IELTS exam.
   - "gre": advanced/abstract vocabulary typical of the GRE.
   - "gmat": business-and-reasoning vocabulary typical of the GMAT.
   - "business": workplace, finance, management, and commerce vocabulary.
   - "advanced": B2–C2 vocabulary beyond everyday core English.
   - "common9k": belongs to the most-common ~9,000 English words (most everyday words do).
   - "common3k": belongs to the most-common ~3,000 English words (only the most frequent everyday words).
   Be HONEST and SELECTIVE: a basic word like "cat" is common3k + common9k but NOT toefl/gre/business. A word like "mitigate" is advanced + gre + gmat + toefl + ielts but NOT common3k. Most words match 1–3 tiers. Do NOT return "foundation" (every word already has it).

OUTPUT CONTRACT — respond with STRICT JSON only (no markdown, no prose), exactly:
{"items":[{"word_id":"<given id>","cefr":"B2","tiers":["advanced","gre"]}, ...]}
Every input word must appear exactly once, using its given "word_id" verbatim.`;

  const inputs: PromptWordInput[] = words.map((w) => ({
    word_id: w.id,
    word: w.word,
    pos: w.pos,
    definition: w.definition,
    current_cefr: w.cefr_level,
  }));

  const user = `Classify these words:
${JSON.stringify(inputs, null, 2)}

Respond with the strict JSON object from the output contract — nothing else.`;
  return { system, user };
}

// ─── response parsing (pure) ─────────────────────────────────────────────────

const SPECIALTY_SET: ReadonlySet<string> = new Set(SPECIALTY_TIERS);

/**
 * Parse the model's response into validated categorizations keyed by word_id.
 * CEFR is kept only if it is a valid level; tiers are filtered to the known
 * specialty set (drops `foundation`, unknown slugs, duplicates). Throws on
 * malformed JSON / missing shape (caller retries once).
 */
export function parseCategorizeResponse(text: string): Map<string, WordCategorization> {
  const obj = parseJsonObject(text);
  if (!Array.isArray(obj.items)) {
    throw new Error('response must have an "items" array');
  }
  const out = new Map<string, WordCategorization>();
  for (const candidate of obj.items as unknown[]) {
    if (!candidate || typeof candidate !== 'object') continue;
    const c = candidate as Record<string, unknown>;
    if (typeof c.word_id !== 'string' || !c.word_id) continue;
    const cefr = typeof c.cefr === 'string' && CEFR_LEVELS.has(c.cefr) ? c.cefr : null;
    const rawTiers = Array.isArray(c.tiers) ? c.tiers : [];
    const tiers = [...new Set(rawTiers.filter((t): t is string => typeof t === 'string' && SPECIALTY_SET.has(t)))];
    out.set(c.word_id, { word_id: c.word_id, cefr, tiers });
  }
  return out;
}

// ─── provider ────────────────────────────────────────────────────────────────

export class OpenAiCategorizeProvider implements CategorizeProvider {
  readonly name = 'openai-categorize';
  readonly model: string;
  private readonly chat: OpenAiChatFn;

  constructor(chat: OpenAiChatFn, model: string = DEFAULT_CATEGORIZE_MODEL) {
    this.chat = chat;
    this.model = model;
  }

  async classify(words: WordRow[]): Promise<CategorizeResult> {
    const items = new Map<string, WordCategorization>();
    const totalBatches = Math.ceil(words.length / CATEGORIZE_BATCH_SIZE);
    for (let i = 0; i < words.length; i += CATEGORIZE_BATCH_SIZE) {
      const batch = words.slice(i, i + CATEGORIZE_BATCH_SIZE);
      const batchNum = Math.floor(i / CATEGORIZE_BATCH_SIZE) + 1;
      logger.print(`  categorize batch ${batchNum}/${totalBatches} (${batch.length} words)...`);
      const batchItems = await this._classifyBatch(batch);
      for (const [id, item] of batchItems) items.set(id, item);
      logger.print(`  → ${batchItems.size}/${batch.length} categorized`);
    }
    return { items };
  }

  private async _classifyBatch(words: WordRow[]): Promise<Map<string, WordCategorization>> {
    try {
      return await this._classifyBatchOnce(words);
    } catch (err) {
      if (err instanceof OpenAiTruncationError && words.length > 1) {
        const mid = Math.ceil(words.length / 2);
        logger.warn(`categorize batch truncated — splitting ${words.length} into ${mid} + ${words.length - mid}`);
        const left = await this._classifyBatch(words.slice(0, mid));
        const right = await this._classifyBatch(words.slice(mid));
        return new Map([...left, ...right]);
      }
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn(`categorize batch failed: ${msg} (${words.length} words left unclassified — retry-eligible)`);
      return new Map();
    }
  }

  private async _classifyBatchOnce(words: WordRow[]): Promise<Map<string, WordCategorization>> {
    const { system, user } = buildCategorizePrompt(words);
    const messages: { role: 'user' | 'assistant'; content: string }[] = [{ role: 'user', content: user }];
    const first = await this.chat({ model: this.model, system, messages, maxTokens: MAX_TOKENS, temperature: 0 });
    try {
      return parseCategorizeResponse(first.text);
    } catch (parseErr) {
      const errMsg = parseErr instanceof Error ? parseErr.message : String(parseErr);
      logger.warn(`categorize parse failed (${errMsg}) — retrying once`);
      messages.push({ role: 'assistant', content: first.text.trim() || '(empty response)' });
      messages.push({
        role: 'user',
        content: `Your previous response could not be parsed: ${errMsg}. Respond again with ONLY the strict JSON object {"items":[...]} — no other text.`,
      });
      const second = await this.chat({ model: this.model, system, messages, maxTokens: MAX_TOKENS, temperature: 0 });
      return parseCategorizeResponse(second.text);
    }
  }
}
