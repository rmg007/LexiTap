import { describe, it, expect, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  AnthropicSenseProvider,
  buildSensePrompt,
  loadFewShotExemplars,
  parseSenseResponse,
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
    expect(() => parseSenseResponse('```json\n{}\n```')).toThrow(/not valid JSON/);
    expect(() => parseSenseResponse('{"items":[]}')).toThrow(/"skipped"/);
    expect(() => parseSenseResponse('[]')).toThrow(/JSON object/);
  });
});

describe('constants', () => {
  it('keeps batches small for long-prose output', () => {
    expect(SENSE_BATCH_SIZE).toBe(8);
  });
});
