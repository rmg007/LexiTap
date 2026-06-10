import { describe, it, expect, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  AnthropicSenseProvider,
  MaxTokensTruncationError,
  buildSensePrompt,
  loadFewShotExemplars,
  parseSenseResponse,
  stripMarkdownFences,
  SENSE_BATCH_SIZE,
  DEFAULT_SENSE_MODEL,
} from '@/providers/anthropicSenseProvider';
import { PROJECT_ROOT } from '@/lib/config';
import type { WordRow } from '@/schema/types';

// All tests here are OFFLINE — no network, no API key needed (prompt + parse
// helpers are pure; the constructor only validates the key).

function wordRow(overrides: Partial<WordRow> = {}): WordRow {
  return {
    id: 'word_abc123',
    word: 'bridge',
    definition: 'A structure built over water so people can cross.',
    pos: 'noun',
    cefr_level: 'A2',
    grade_level: null,
    word_type: 'vocabulary',
    difficulty: null,
    frequency_rank: 120,
    theme: null,
    example_sentence: 'They crossed the _ at dawn.',
    image_path: null,
    audio_path: null,
    synonyms: null,
    antonyms: null,
    usage_notes: null,
    definition_license: 'original',
    created_at: 1,
    deleted_at: null,
    ...overrides,
  };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('constructor', () => {
  it('throws at construction when ANTHROPIC_API_KEY is absent', () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '');
    expect(() => new AnthropicSenseProvider()).toThrow(/ANTHROPIC_API_KEY/);
  });

  it('accepts an explicit key and a model override', () => {
    const p = new AnthropicSenseProvider('test-key', 'claude-sonnet-4-6');
    expect(p.model).toBe('claude-sonnet-4-6');
    expect(new AnthropicSenseProvider('test-key').model).toBe(DEFAULT_SENSE_MODEL);
  });
});

describe('loadFewShotExemplars', () => {
  it('returns the plant + borrow lines verbatim from sample-senses.jsonl', () => {
    const samplePath = resolve(PROJECT_ROOT, 'data', 'input', 'sample-senses.jsonl');
    const fileLines = readFileSync(samplePath, 'utf8')
      .split('\n')
      .filter((l) => l.trim());
    const plantLine = fileLines.find((l) => l.includes('"word":"plant"'))!;
    const borrowLine = fileLines.find((l) => l.includes('"word":"borrow"'))!;

    const exemplars = loadFewShotExemplars();
    expect(exemplars).toContain(plantLine.trim());
    expect(exemplars).toContain(borrowLine.trim());
  });
});

describe('buildSensePrompt', () => {
  it('embeds both few-shot exemplars verbatim (multi-sense plant + single-sense borrow)', () => {
    const { system } = buildSensePrompt([wordRow()]);
    // Verbatim prose from the owner-approved sample file:
    expect(system).toContain('A plant is not just something green to put on a shelf');
    expect(system).toContain('to take something temporarily from someone, with the plan to return it');
  });

  it('contains the conservative sense-count rule and the skip rule', () => {
    const { system } = buildSensePrompt([wordRow()]);
    expect(system).toContain('Default to exactly 1 sense');
    expect(system).toContain('SKIP RULE');
    expect(system).toContain('proper noun');
    expect(system).toContain('demonym');
    expect(system).toContain('function word');
    expect(system).toContain('inflected form');
  });

  it('states the strict-JSON output contract with items + skipped and no fences', () => {
    const { system } = buildSensePrompt([wordRow()]);
    expect(system).toContain('"items"');
    expect(system).toContain('"skipped"');
    expect(system).toContain('no markdown fences');
    expect(system).toContain('0-based and contiguous');
    expect(system).toMatch(/ABSOLUTELY NO "_"/);
  });

  it('serializes word_id, word, pos, definition and cefr_level into the user turn', () => {
    const { user } = buildSensePrompt([
      wordRow({ id: 'word_xyz', word: 'culture', pos: 'noun', cefr_level: 'B1' }),
    ]);
    expect(user).toContain('"word_id": "word_xyz"');
    expect(user).toContain('"word": "culture"');
    expect(user).toContain('"pos": "noun"');
    expect(user).toContain('"cefr_level": "B1"');
    expect(user).toContain('"definition"');
  });
});

describe('parseSenseResponse', () => {
  const validItem = {
    word_id: 'word_abc123',
    word: 'bridge',
    senses: [
      {
        sense_index: 0,
        pos: 'noun',
        short_gloss: 'a structure built over water so people can cross',
        explanation:
          'A bridge solves a simple problem: there is a gap and you need to get across. It connects two sides that would otherwise stay apart.',
        image_path: null,
        examples: [
          { example_index: 0, text: 'The old stone bridge had stood for centuries.' },
          { example_index: 1, text: 'They built a new bridge to the island.' },
        ],
      },
    ],
  };

  it('parses valid items and skipped entries', () => {
    const text = JSON.stringify({
      items: [validItem],
      skipped: [{ word_id: 'word_junk', word: 'williams', reason: 'proper noun (surname)' }],
    });
    const result = parseSenseResponse(text);
    expect(result.items.size).toBe(1);
    expect(result.items.get('word_abc123')!.word).toBe('bridge');
    expect(result.skipped).toEqual([
      { word_id: 'word_junk', word: 'williams', reason: 'proper noun (surname)' },
    ]);
    expect(result.invalidDropped).toBe(0);
  });

  it('drops items violating the V1–V10 invariants (fail-closed) and counts them', () => {
    const bad = structuredClone(validItem);
    bad.senses[0]!.examples[0]!.text = 'They crossed the _ at dawn.'; // V9 blank
    const text = JSON.stringify({ items: [validItem, { ...bad, word_id: 'word_bad999' }], skipped: [] });
    const result = parseSenseResponse(text);
    expect(result.items.size).toBe(1);
    expect(result.items.has('word_bad999')).toBe(false);
    expect(result.invalidDropped).toBe(1);
  });

  it('throws on malformed JSON or a missing top-level shape (repair-retry path)', () => {
    expect(() => parseSenseResponse('Sure! Here is the JSON: {"items"')).toThrow(/not valid JSON/);
    expect(() => parseSenseResponse('{"items":[]}')).toThrow(/"skipped"/);
    expect(() => parseSenseResponse('[]')).toThrow(/JSON object/);
  });

  it('strips a wrapping ```json fence instead of burning the repair retry', () => {
    const payload = JSON.stringify({ items: [validItem], skipped: [] });
    const fenced = '```json\n' + payload + '\n```';
    const result = parseSenseResponse(fenced);
    expect(result.items.size).toBe(1);
    expect(result.items.get('word_abc123')!.word).toBe('bridge');
    // Bare ``` fence too:
    expect(parseSenseResponse('```\n' + payload + '\n```').items.size).toBe(1);
    // A fenced response with the wrong SHAPE still throws (real malformation):
    expect(() => parseSenseResponse('```json\n{}\n```')).toThrow(/"items"/);
  });

  it('an item that makes the validator THROW is dropped alone, not the whole batch', () => {
    const malformed = structuredClone(validItem) as Record<string, unknown>;
    malformed.word_id = 'word_throw1';
    // Non-string short_gloss: truthy number → `.trim()` throws inside the validator.
    (malformed.senses as Array<Record<string, unknown>>)[0]!.short_gloss = 42;
    const text = JSON.stringify({ items: [validItem, malformed], skipped: [] });
    const result = parseSenseResponse(text);
    expect(result.items.size).toBe(1);
    expect(result.items.has('word_abc123')).toBe(true);
    expect(result.items.has('word_throw1')).toBe(false);
    expect(result.invalidDropped).toBe(1);
  });
});

describe('stripMarkdownFences', () => {
  it('removes ```json and bare ``` fences; leaves unfenced text alone', () => {
    expect(stripMarkdownFences('```json\n{"a":1}\n```')).toBe('{"a":1}');
    expect(stripMarkdownFences('```\n{"a":1}\n```')).toBe('{"a":1}');
    expect(stripMarkdownFences('  {"a":1}  ')).toBe('{"a":1}');
    // Unterminated fence is NOT stripped (truncation symptom — let parse fail):
    expect(stripMarkdownFences('```json\n{"a":1}')).toBe('```json\n{"a":1}');
  });
});

describe('constants', () => {
  it('keeps batches small for long-prose output', () => {
    expect(SENSE_BATCH_SIZE).toBe(8);
  });
});

// ─── generate() against a mocked Anthropic client (offline) ────────────────

type FakeMessage = { content: Array<{ type: string; text?: string }>; stop_reason: string };

function itemFor(word: { id: string; word: string }): object {
  return {
    word_id: word.id,
    word: word.word,
    senses: [
      {
        sense_index: 0,
        pos: 'noun',
        short_gloss: `a one-line gloss for ${word.word}`,
        explanation: `A felt teaching explanation for ${word.word}. It is concrete and plain, and it differs from the gloss.`,
        image_path: null,
        examples: [
          { example_index: 0, text: `Everyone talked about the ${word.word} all afternoon.` },
          { example_index: 1, text: `She wrote a story about a ${word.word} last year.` },
        ],
      },
    ],
  };
}

function okResponse(words: Array<{ id: string; word: string }>): FakeMessage {
  return {
    content: [{ type: 'text', text: JSON.stringify({ items: words.map(itemFor), skipped: [] }) }],
    stop_reason: 'end_turn',
  };
}

const TRUNCATED: FakeMessage = {
  content: [{ type: 'text', text: '{"items":[{"word_id":"word_' }],
  stop_reason: 'max_tokens',
};

/** Provider with the network client replaced by a queue of canned responses. */
function mockedProvider(responses: FakeMessage[]) {
  const provider = new AnthropicSenseProvider('test-key');
  const create = vi.fn(async (_request: unknown) => {
    void _request;
    const next = responses.shift();
    if (!next) throw new Error('mock exhausted — more API calls than expected');
    return next;
  });
  (provider as unknown as { client: { messages: { create: typeof create } } }).client = {
    messages: { create },
  };
  return { provider, create };
}

describe('AnthropicSenseProvider.generate (mocked client)', () => {
  const wordA = wordRow({ id: 'word_aaa111', word: 'anchor' });
  const wordB = wordRow({ id: 'word_bbb222', word: 'beacon' });

  it('stop_reason max_tokens → splits the batch in half and retries each half (no repair retry)', async () => {
    const { provider, create } = mockedProvider([
      TRUNCATED, // full batch [A, B] truncates
      okResponse([wordA]), // left half succeeds
      okResponse([wordB]), // right half succeeds
    ]);
    const result = await provider.generate([wordA, wordB]);
    expect(create).toHaveBeenCalledTimes(3);
    expect([...result.items.keys()].sort()).toEqual(['word_aaa111', 'word_bbb222']);
    expect(result.skipped).toEqual([]);
  });

  it('recursion floor: a single word that still truncates is skipped as provider_error', async () => {
    const { provider, create } = mockedProvider([TRUNCATED, TRUNCATED, TRUNCATED]);
    const result = await provider.generate([wordA, wordB]);
    // batch → truncated; split to [A] → truncated; [B] → truncated. No 4th call.
    expect(create).toHaveBeenCalledTimes(3);
    expect(result.items.size).toBe(0);
    expect(result.skipped).toEqual([
      { word_id: 'word_aaa111', word: 'anchor', reason: 'provider_error' },
      { word_id: 'word_bbb222', word: 'beacon', reason: 'provider_error' },
    ]);
  });

  it('empty first response → repair retry sends "(empty response)" as the assistant turn', async () => {
    const { provider, create } = mockedProvider([
      { content: [], stop_reason: 'end_turn' }, // no text blocks at all
      okResponse([wordA]),
    ]);
    const result = await provider.generate([wordA]);
    expect(create).toHaveBeenCalledTimes(2);
    expect(result.items.has('word_aaa111')).toBe(true);
    const secondCallArgs = create.mock.calls[1]![0] as unknown as {
      messages: Array<{ role: string; content: string }>;
    };
    const assistantTurn = secondCallArgs.messages.find((m) => m.role === 'assistant')!;
    expect(assistantTurn.content).toBe('(empty response)'); // never empty — API rejects empty content
  });

  it('concatenates ALL text blocks of a multi-block response', async () => {
    const full = JSON.stringify({ items: [itemFor(wordA)], skipped: [] });
    const mid = Math.floor(full.length / 2);
    const { provider, create } = mockedProvider([
      {
        content: [
          { type: 'text', text: full.slice(0, mid) },
          { type: 'text', text: full.slice(mid) },
        ],
        stop_reason: 'end_turn',
      },
    ]);
    const result = await provider.generate([wordA]);
    expect(create).toHaveBeenCalledTimes(1); // no repair retry needed
    expect(result.items.has('word_aaa111')).toBe(true);
  });

  it('a ```json-fenced response parses on the first call (no paid repair retry)', async () => {
    const payload = JSON.stringify({ items: [itemFor(wordA)], skipped: [] });
    const { provider, create } = mockedProvider([
      { content: [{ type: 'text', text: '```json\n' + payload + '\n```' }], stop_reason: 'end_turn' },
    ]);
    const result = await provider.generate([wordA]);
    expect(create).toHaveBeenCalledTimes(1);
    expect(result.items.size).toBe(1);
  });

  it('MaxTokensTruncationError is a distinct error type', () => {
    const err = new MaxTokensTruncationError('truncated');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('MaxTokensTruncationError');
  });
});
