/**
 * Phase 4 — OpenAI rich-content provider. Per word it produces BOTH:
 *   • senses: conservative distinct meanings, each with a felt 2–4 sentence
 *     `explanation` (never a gloss restatement) + 2–3 full-sentence examples
 *     (no "_" blank) — the same quality bar as the Anthropic sense provider,
 *     anchored to the owner-approved exemplars in sample-senses.jsonl.
 *   • questions: exactly 5 authored quiz questions, one of each type
 *     (multiple_choice, definition_match, fill_blank, sentence_order,
 *     true_false), every one answered by TAP or DRAG — never typing — each with
 *     a `hint` and an `explanation`.
 *
 * Seed-list junk (proper nouns, demonyms, mislabeled function words,
 * inflections whose lemma should be taught) is SKIPPED with a one-line reason
 * rather than dressed up. Strict-JSON contract; one repair retry; max_tokens
 * truncation splits the batch. Output items are validated (senses V1–V10,
 * questions Q1–Q9) by the caller and dropped if invalid (fail-closed).
 *
 * Network is the injected `OpenAiChatFn` seam, so tests run offline.
 */

import { logger } from '@/lib/logger';
import type { WordRow } from '@/schema/types';
import type { MasterSense, MasterQuestion } from '@/commands/export-master';
import type { SenseSkip } from '@/providers/types';
import { loadFewShotExemplars } from '@/providers/anthropicSenseProvider';
import {
  type OpenAiChatFn,
  OpenAiTruncationError,
  parseJsonObject,
} from '@/providers/openaiClient';

export const DEFAULT_ENRICH_MODEL = 'gpt-4.1';
/** Words per call — senses + 5 questions is long output; keep batches small. */
export const ENRICH_BATCH_SIZE = 6;
const MAX_TOKENS = 16000;

/** One word's full Phase-4 payload, in the master-JSONL shape. */
export interface MasterEnrichItem {
  word_id: string;
  word: string;
  senses: MasterSense[];
  questions: MasterQuestion[];
}

export interface SenseQuestionResult {
  items: Map<string, MasterEnrichItem>;
  skipped: SenseSkip[];
}

export interface SenseQuestionProvider {
  readonly name: string;
  generate(words: WordRow[]): Promise<SenseQuestionResult>;
}

// ─── prompt (pure) ───────────────────────────────────────────────────────────

interface PromptWordInput {
  word_id: string;
  word: string;
  pos: string | null;
  definition: string;
  example_sentence: string;
  cefr_level: string | null;
}

export function buildSenseQuestionPrompt(words: WordRow[]): { system: string; user: string } {
  const exemplars = loadFewShotExemplars();

  const system = `You write felt vocabulary teaching content for LexiTap, an offline ESL vocabulary app for global non-native English learners aged 13+. For each input word you produce SENSES and QUESTIONS.

═══ SENSES ═══
- SENSE COUNT: default to exactly 1. Add a 2nd/3rd sense ONLY when genuinely distinct (a different core meaning, not a shade) AND learner-relevant. Most words stay single-sense. Never invent filler senses.
- Per sense: "sense_index" (0-based, contiguous), "pos", "short_gloss" (one-line dictionary gloss), "explanation" (2–4 sentences of FELT teaching prose that makes the learner internalize the word — NEVER a restatement of the gloss), "image_path": null, and "examples": an array of 2–3 FULL natural sentences (strings) showing the sense in use, with ABSOLUTELY NO "_" blank.

These two owner-approved exemplars define the exact register and restraint expected ("plant" = a genuine 2-sense word; "borrow" = single-sense restraint). Their senses use {"examples":[{"example_index":0,"text":"..."}]}; in YOUR output, write "examples" as a plain array of strings instead:
${exemplars}

═══ QUESTIONS ═══
Produce EXACTLY 5 questions, "question_index" 0–4, ONE of each "type" in this order. EVERY question is answered by tapping an option or dragging — NEVER by typing. Each has a "hint" (a nudge shown before answering; may be null) and an "explanation" (shown after answering — teaches why the answer is right).
  0. "multiple_choice": "prompt" asks which sentence/use is correct; "correct" = the right string; "distractors" = 3 plausible-but-wrong strings.
  1. "definition_match": "prompt" = the word; "correct" = its best short definition; "distractors" = 3 wrong definitions.
  2. "fill_blank": "prompt" = a sentence with a "___" gap; "correct" = the word (or right filler); "distractors" = 3 wrong fillers.
  3. "sentence_order": "prompt" = "Arrange the words to make a correct sentence:"; "correct" = a natural sentence of ≥3 words using the word; "distractors" = [] (empty — the tiles come from the correct sentence).
  4. "true_false": "prompt" = a statement about the word's meaning; "correct" = "True" or "False"; "distractors" = the opposite value only (e.g. ["False"]).
The "correct" answer must NEVER also appear among the "distractors". "reviewed": false on every question.

═══ SKIP RULE ═══
The seed list contains junk; do not spend tokens dressing it up. If a word is (a) a proper noun, (b) a bare function word mislabeled as content vocab, (c) a demonym, or (d) an inflected form whose lemma should be taught instead, DO NOT generate content — return it in "skipped" with a one-line reason.

═══ OUTPUT CONTRACT ═══
Respond with STRICT JSON only (no markdown, no prose) of exactly this shape:
{"items":[{"word_id":"<given>","word":"<given>","senses":[{"sense_index":0,"pos":"...","short_gloss":"...","explanation":"...","image_path":null,"examples":["...","..."]}],"questions":[{"question_index":0,"type":"multiple_choice","prompt":"...","correct":"...","distractors":["...","...","..."],"hint":"...","explanation":"...","reviewed":false}, ... 5 total ...]}],"skipped":[{"word_id":"...","word":"...","reason":"..."}]}
Every input word must appear exactly once — in "items" or in "skipped". Use each word's "word_id" verbatim.`;

  const inputs: PromptWordInput[] = words.map((w) => ({
    word_id: w.id,
    word: w.word,
    pos: w.pos,
    definition: w.definition,
    example_sentence: w.example_sentence,
    cefr_level: w.cefr_level,
  }));

  const user = `Generate senses + 5 questions for these words:
${JSON.stringify(inputs, null, 2)}

Respond with the strict JSON object from the output contract — nothing else.`;
  return { system, user };
}

// ─── response parsing (pure) ─────────────────────────────────────────────────

/** Coerce one raw sense object to MasterSense; returns null if unusable. */
function coerceSense(raw: unknown): MasterSense | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.sense_index !== 'number') return null;
  if (typeof o.short_gloss !== 'string' || typeof o.explanation !== 'string') return null;
  const examples = Array.isArray(o.examples)
    ? o.examples.filter((x): x is string => typeof x === 'string')
    : [];
  return {
    sense_index: o.sense_index,
    pos: typeof o.pos === 'string' ? o.pos : null,
    short_gloss: o.short_gloss,
    explanation: o.explanation,
    image_path: typeof o.image_path === 'string' ? o.image_path : null,
    examples,
  };
}

/** Coerce one raw question object to MasterQuestion; returns null if unusable. */
function coerceQuestion(raw: unknown): MasterQuestion | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.question_index !== 'number') return null;
  if (typeof o.type !== 'string') return null;
  if (typeof o.prompt !== 'string' || typeof o.correct !== 'string') return null;
  const distractors = Array.isArray(o.distractors)
    ? o.distractors.filter((x): x is string => typeof x === 'string')
    : [];
  return {
    question_index: o.question_index,
    type: o.type,
    prompt: o.prompt,
    correct: o.correct,
    distractors,
    hint: typeof o.hint === 'string' ? o.hint : null,
    explanation: typeof o.explanation === 'string' ? o.explanation : null,
    reviewed: o.reviewed === true,
  };
}

export interface ParsedSenseQuestionResponse {
  items: Map<string, MasterEnrichItem>;
  skipped: SenseSkip[];
}

/**
 * Parse the model response into coerced items + skips. Per-item content
 * validity is NOT decided here (the caller runs the V/Q validators); this only
 * builds well-typed shapes and throws on malformed top-level JSON so the caller
 * can issue a single repair retry.
 */
export function parseSenseQuestionResponse(text: string): ParsedSenseQuestionResponse {
  const obj = parseJsonObject(text);
  if (!Array.isArray(obj.items) || !Array.isArray(obj.skipped)) {
    throw new Error('response must have "items" (array) and "skipped" (array)');
  }
  const items = new Map<string, MasterEnrichItem>();
  for (const candidate of obj.items as unknown[]) {
    if (!candidate || typeof candidate !== 'object') continue;
    const c = candidate as Record<string, unknown>;
    if (typeof c.word_id !== 'string' || !c.word_id) continue;
    const senses = (Array.isArray(c.senses) ? c.senses : [])
      .map(coerceSense)
      .filter((s): s is MasterSense => s !== null);
    const questions = (Array.isArray(c.questions) ? c.questions : [])
      .map(coerceQuestion)
      .filter((q): q is MasterQuestion => q !== null);
    items.set(c.word_id, {
      word_id: c.word_id,
      word: typeof c.word === 'string' ? c.word : '',
      senses,
      questions,
    });
  }
  const skipped: SenseSkip[] = [];
  for (const candidate of obj.skipped as unknown[]) {
    if (!candidate || typeof candidate !== 'object') continue;
    const s = candidate as Record<string, unknown>;
    if (typeof s.word_id === 'string' && typeof s.reason === 'string') {
      skipped.push({ word_id: s.word_id, word: typeof s.word === 'string' ? s.word : '', reason: s.reason });
    }
  }
  return { items, skipped };
}

// ─── provider ────────────────────────────────────────────────────────────────

export class OpenAiSenseQuestionProvider implements SenseQuestionProvider {
  readonly name = 'openai-sense-question';
  readonly model: string;
  private readonly chat: OpenAiChatFn;

  constructor(chat: OpenAiChatFn, model: string = DEFAULT_ENRICH_MODEL) {
    this.chat = chat;
    this.model = model;
    // Eagerly load exemplars so a missing sample file fails before any spend.
    loadFewShotExemplars();
  }

  async generate(words: WordRow[]): Promise<SenseQuestionResult> {
    const items = new Map<string, MasterEnrichItem>();
    const skipped: SenseSkip[] = [];
    const totalBatches = Math.ceil(words.length / ENRICH_BATCH_SIZE);
    for (let i = 0; i < words.length; i += ENRICH_BATCH_SIZE) {
      const batch = words.slice(i, i + ENRICH_BATCH_SIZE);
      const batchNum = Math.floor(i / ENRICH_BATCH_SIZE) + 1;
      logger.print(`  enrich batch ${batchNum}/${totalBatches} (${batch.length} words)...`);
      const result = await this._generateBatch(batch);
      for (const [id, item] of result.items) items.set(id, item);
      skipped.push(...result.skipped);
      logger.print(`  → ${result.items.size} enriched, ${result.skipped.length} skipped`);
    }
    return { items, skipped };
  }

  private async _generateBatch(words: WordRow[]): Promise<ParsedSenseQuestionResponse> {
    try {
      return await this._generateBatchOnce(words);
    } catch (err) {
      if (err instanceof OpenAiTruncationError) {
        if (words.length <= 1) {
          logger.warn(`enrich truncated for single word '${words[0]?.word ?? '?'}' — skipped as provider_error`);
          return {
            items: new Map(),
            skipped: words.map((w) => ({ word_id: w.id, word: w.word, reason: 'provider_error' })),
          };
        }
        const mid = Math.ceil(words.length / 2);
        logger.warn(`enrich truncated for batch of ${words.length} — splitting into ${mid} + ${words.length - mid}`);
        const left = await this._generateBatch(words.slice(0, mid));
        const right = await this._generateBatch(words.slice(mid));
        return {
          items: new Map([...left.items, ...right.items]),
          skipped: [...left.skipped, ...right.skipped],
        };
      }
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn(`enrich batch failed: ${msg} (${words.length} words → skipped as provider_error)`);
      return {
        items: new Map(),
        skipped: words.map((w) => ({ word_id: w.id, word: w.word, reason: 'provider_error' })),
      };
    }
  }

  private async _generateBatchOnce(words: WordRow[]): Promise<ParsedSenseQuestionResponse> {
    const { system, user } = buildSenseQuestionPrompt(words);
    const messages: { role: 'user' | 'assistant'; content: string }[] = [{ role: 'user', content: user }];
    const first = await this.chat({ model: this.model, system, messages, maxTokens: MAX_TOKENS });
    try {
      return parseSenseQuestionResponse(first.text);
    } catch (parseErr) {
      const errMsg = parseErr instanceof Error ? parseErr.message : String(parseErr);
      logger.warn(`enrich parse failed (${errMsg}) — retrying once with repair prompt`);
      messages.push({ role: 'assistant', content: first.text.trim() || '(empty response)' });
      messages.push({
        role: 'user',
        content: `Your previous response could not be parsed: ${errMsg}. Respond again with ONLY the strict JSON object ({"items":[...],"skipped":[...]}) — no markdown, no other text.`,
      });
      const second = await this.chat({ model: this.model, system, messages, maxTokens: MAX_TOKENS });
      return parseSenseQuestionResponse(second.text);
    }
  }
}
