import { describe, it, expect } from 'vitest';
import { validateSenseIngestItem, serializeSenseIngestFile } from '@/commands/synthesize-senses';
import { parseSenseIngestFile } from '@/commands/ingest-senses';
import type { SenseIngestItem } from '@/commands/ingest-senses';

// ─── fixtures ─────────────────────────────────────────────────────────────

const WORD_ID = 'word_baf0bf92eb79156b';

const SINGLE_SENSE: SenseIngestItem = {
  word_id: WORD_ID,
  word: 'plant',
  senses: [
    {
      sense_index: 0,
      pos: 'noun',
      short_gloss: 'a living organism that grows in soil',
      explanation:
        'A plant is a living thing that pulls water through roots and turns sunlight into energy to grow. Trees, flowers, and grass are all plants.',
      image_path: null,
      examples: [
        { example_index: 0, text: 'She waters her plants every morning.' },
        { example_index: 1, text: 'The garden was full of colorful plants.' },
      ],
    },
  ],
};

const MULTI_SENSE: SenseIngestItem = {
  word_id: WORD_ID,
  word: 'plant',
  senses: [
    {
      sense_index: 0,
      pos: 'noun',
      short_gloss: 'a living organism that grows in soil',
      explanation:
        'A plant is a living thing that pulls water through roots and turns sunlight into energy. Trees, flowers, and grass are all plants.',
      examples: [
        { example_index: 0, text: 'She waters her plants every morning.' },
        { example_index: 1, text: 'A new plant was growing between the sidewalk cracks.' },
      ],
    },
    {
      sense_index: 1,
      pos: 'verb',
      short_gloss: 'to put seeds or a young plant into the ground',
      explanation:
        'When you plant something, you give it a home in the earth. You dig a small hole, place the seed inside, and cover it gently.',
      examples: [
        { example_index: 0, text: 'They planted tomatoes in the backyard every spring.' },
      ],
    },
  ],
};

// ─── validateSenseIngestItem ──────────────────────────────────────────────

describe('validateSenseIngestItem', () => {
  describe('clean inputs', () => {
    it('passes a clean single-sense item', () => {
      expect(validateSenseIngestItem(SINGLE_SENSE)).toHaveLength(0);
    });

    it('passes a clean multi-sense item', () => {
      expect(validateSenseIngestItem(MULTI_SENSE)).toHaveLength(0);
    });

    it('passes when optional pos and image_path are absent', () => {
      const item: SenseIngestItem = {
        word_id: WORD_ID,
        senses: [
          {
            sense_index: 0,
            short_gloss: 'some gloss',
            explanation:
              'This is a felt explanation that is definitely long enough to count as teaching prose.',
            examples: [{ example_index: 0, text: 'A full teaching sentence here.' }],
          },
        ],
      };
      expect(validateSenseIngestItem(item)).toHaveLength(0);
    });
  });

  describe('V1 — word_id format', () => {
    it('rejects empty word_id', () => {
      const item = { ...SINGLE_SENSE, word_id: '' };
      const errs = validateSenseIngestItem(item);
      expect(errs.some((e) => e.field === 'word_id')).toBe(true);
    });

    it('rejects word_id that does not start with "word_"', () => {
      const item = { ...SINGLE_SENSE, word_id: 'sense_abc' };
      const errs = validateSenseIngestItem(item);
      expect(errs.some((e) => e.field === 'word_id' && /must start with/.test(e.message))).toBe(true);
    });

    it('accepts a valid word_ prefixed id', () => {
      const errs = validateSenseIngestItem(SINGLE_SENSE);
      expect(errs.some((e) => e.field === 'word_id')).toBe(false);
    });
  });

  describe('V2 — senses non-empty', () => {
    it('rejects empty senses array', () => {
      const item: SenseIngestItem = { word_id: WORD_ID, senses: [] };
      const errs = validateSenseIngestItem(item);
      expect(errs.some((e) => e.field === 'senses')).toBe(true);
    });
  });

  describe('V3 — contiguous sense_index from 0', () => {
    it('rejects sense_index starting at 1', () => {
      const item: SenseIngestItem = {
        word_id: WORD_ID,
        senses: [{ ...SINGLE_SENSE.senses[0]!, sense_index: 1 }],
      };
      const errs = validateSenseIngestItem(item);
      expect(errs.some((e) => /sense_index/.test(e.field) && /start at 0/.test(e.message))).toBe(true);
    });

    it('rejects a gap in sense_index (0, 2 missing 1)', () => {
      const item: SenseIngestItem = {
        word_id: WORD_ID,
        senses: [
          { ...SINGLE_SENSE.senses[0]!, sense_index: 0 },
          { ...SINGLE_SENSE.senses[0]!, sense_index: 2 },
        ],
      };
      const errs = validateSenseIngestItem(item);
      expect(errs.some((e) => /sense_index/.test(e.field) && /gap/.test(e.message))).toBe(true);
    });

    it('passes [0, 1] contiguous senses', () => {
      const errs = validateSenseIngestItem(MULTI_SENSE);
      expect(errs.some((e) => /sense_index/.test(e.field))).toBe(false);
    });
  });

  describe('V4 — short_gloss non-empty', () => {
    it('rejects empty short_gloss', () => {
      const item: SenseIngestItem = {
        word_id: WORD_ID,
        senses: [{ ...SINGLE_SENSE.senses[0]!, short_gloss: '' }],
      };
      const errs = validateSenseIngestItem(item);
      expect(errs.some((e) => /short_gloss/.test(e.field))).toBe(true);
    });

    it('rejects whitespace-only short_gloss', () => {
      const item: SenseIngestItem = {
        word_id: WORD_ID,
        senses: [{ ...SINGLE_SENSE.senses[0]!, short_gloss: '   ' }],
      };
      const errs = validateSenseIngestItem(item);
      expect(errs.some((e) => /short_gloss/.test(e.field))).toBe(true);
    });
  });

  describe('V5 — explanation non-empty', () => {
    it('rejects empty explanation', () => {
      const item: SenseIngestItem = {
        word_id: WORD_ID,
        senses: [{ ...SINGLE_SENSE.senses[0]!, explanation: '' }],
      };
      const errs = validateSenseIngestItem(item);
      expect(errs.some((e) => /explanation/.test(e.field) && /non-empty/.test(e.message))).toBe(true);
    });
  });

  describe('V6 — explanation != short_gloss', () => {
    it('rejects explanation identical to short_gloss', () => {
      const item: SenseIngestItem = {
        word_id: WORD_ID,
        senses: [
          {
            ...SINGLE_SENSE.senses[0]!,
            short_gloss: 'same text',
            explanation: 'same text',
          },
        ],
      };
      const errs = validateSenseIngestItem(item);
      expect(errs.some((e) => /explanation/.test(e.field) && /differ/.test(e.message))).toBe(true);
    });

    it('rejects case-insensitive match', () => {
      const item: SenseIngestItem = {
        word_id: WORD_ID,
        senses: [
          {
            ...SINGLE_SENSE.senses[0]!,
            short_gloss: 'Same Text',
            explanation: 'same text',
          },
        ],
      };
      const errs = validateSenseIngestItem(item);
      expect(errs.some((e) => /explanation/.test(e.field) && /differ/.test(e.message))).toBe(true);
    });
  });

  describe('V7 — examples non-empty', () => {
    it('rejects empty examples array', () => {
      const item: SenseIngestItem = {
        word_id: WORD_ID,
        senses: [{ ...SINGLE_SENSE.senses[0]!, examples: [] }],
      };
      const errs = validateSenseIngestItem(item);
      expect(errs.some((e) => /examples/.test(e.field) && /non-empty/.test(e.message))).toBe(true);
    });
  });

  describe('V8 — example text non-empty', () => {
    it('rejects empty example text', () => {
      const item: SenseIngestItem = {
        word_id: WORD_ID,
        senses: [
          {
            ...SINGLE_SENSE.senses[0]!,
            examples: [{ example_index: 0, text: '' }],
          },
        ],
      };
      const errs = validateSenseIngestItem(item);
      expect(errs.some((e) => /text/.test(e.field) && /non-empty/.test(e.message))).toBe(true);
    });
  });

  describe('V9 — example text has no "_" blank', () => {
    it('rejects an example with a cloze blank', () => {
      const item: SenseIngestItem = {
        word_id: WORD_ID,
        senses: [
          {
            ...SINGLE_SENSE.senses[0]!,
            examples: [{ example_index: 0, text: 'She _ her plants every morning.' }],
          },
        ],
      };
      const errs = validateSenseIngestItem(item);
      expect(errs.some((e) => /text/.test(e.field) && /no.*_/.test(e.message))).toBe(true);
    });

    it('accepts example text with no underscore', () => {
      const errs = validateSenseIngestItem(SINGLE_SENSE);
      expect(errs.some((e) => /text/.test(e.field))).toBe(false);
    });
  });

  describe('V10 — contiguous example_index from 0', () => {
    it('rejects example_index starting at 1', () => {
      const item: SenseIngestItem = {
        word_id: WORD_ID,
        senses: [
          {
            ...SINGLE_SENSE.senses[0]!,
            examples: [{ example_index: 1, text: 'A full sentence here.' }],
          },
        ],
      };
      const errs = validateSenseIngestItem(item);
      expect(errs.some((e) => /example_index/.test(e.field) && /start at 0/.test(e.message))).toBe(true);
    });

    it('rejects a gap in example_index (0, 2 missing 1)', () => {
      const item: SenseIngestItem = {
        word_id: WORD_ID,
        senses: [
          {
            ...SINGLE_SENSE.senses[0]!,
            examples: [
              { example_index: 0, text: 'First example sentence here.' },
              { example_index: 2, text: 'Third example skipping second.' },
            ],
          },
        ],
      };
      const errs = validateSenseIngestItem(item);
      expect(errs.some((e) => /example_index/.test(e.field) && /gap/.test(e.message))).toBe(true);
    });

    it('passes [0, 1, 2] contiguous examples', () => {
      const item: SenseIngestItem = {
        word_id: WORD_ID,
        senses: [
          {
            ...SINGLE_SENSE.senses[0]!,
            examples: [
              { example_index: 0, text: 'First full sentence here.' },
              { example_index: 1, text: 'Second full sentence here.' },
              { example_index: 2, text: 'Third full sentence here.' },
            ],
          },
        ],
      };
      expect(validateSenseIngestItem(item)).toHaveLength(0);
    });
  });

  describe('multiple errors', () => {
    it('accumulates errors from multiple senses', () => {
      const item: SenseIngestItem = {
        word_id: WORD_ID,
        senses: [
          {
            sense_index: 0,
            short_gloss: '',          // V4 violation
            explanation: '',          // V5 violation
            examples: [],             // V7 violation
          },
          {
            sense_index: 1,
            short_gloss: 'valid gloss',
            explanation: 'valid gloss', // V6 violation (same as gloss)
            examples: [{ example_index: 0, text: 'Has an _ blank.' }], // V9 violation
          },
        ],
      };
      const errs = validateSenseIngestItem(item);
      // Should have at least 5 errors across the two senses
      expect(errs.length).toBeGreaterThanOrEqual(5);
    });
  });
});

// ─── serializeSenseIngestFile ─────────────────────────────────────────────

describe('serializeSenseIngestFile', () => {
  it('serializes a single item to one JSONL line', () => {
    const result = serializeSenseIngestFile([SINGLE_SENSE]);
    const lines = result.trim().split('\n');
    expect(lines).toHaveLength(1);
    expect(() => JSON.parse(lines[0]!)).not.toThrow();
  });

  it('serializes multiple items to one line each', () => {
    const items = [SINGLE_SENSE, MULTI_SENSE];
    const result = serializeSenseIngestFile(items);
    const lines = result.trim().split('\n');
    expect(lines).toHaveLength(2);
    for (const line of lines) {
      expect(() => JSON.parse(line)).not.toThrow();
    }
  });

  it('emits an empty string for empty input', () => {
    expect(serializeSenseIngestFile([])).toBe('');
  });

  it('output is newline-terminated', () => {
    const result = serializeSenseIngestFile([SINGLE_SENSE]);
    expect(result.endsWith('\n')).toBe(true);
  });

  it('preserves word_id and senses data', () => {
    const result = serializeSenseIngestFile([SINGLE_SENSE]);
    const parsed = JSON.parse(result.trim()) as { word_id: string; senses: unknown[] };
    expect(parsed.word_id).toBe(SINGLE_SENSE.word_id);
    expect(Array.isArray(parsed.senses)).toBe(true);
  });

  it('serializes multi-sense items faithfully', () => {
    const result = serializeSenseIngestFile([MULTI_SENSE]);
    const parsed = JSON.parse(result.trim()) as { senses: Array<{ sense_index: number }> };
    expect(parsed.senses).toHaveLength(2);
    expect(parsed.senses[0]!.sense_index).toBe(0);
    expect(parsed.senses[1]!.sense_index).toBe(1);
  });

  it('omits "word" field when not present in the original item', () => {
    const item: SenseIngestItem = {
      word_id: WORD_ID,
      senses: SINGLE_SENSE.senses,
    };
    const result = serializeSenseIngestFile([item]);
    const parsed = JSON.parse(result.trim()) as Record<string, unknown>;
    expect('word' in parsed).toBe(false);
  });

  it('includes "word" field when present in the original item', () => {
    const result = serializeSenseIngestFile([SINGLE_SENSE]);
    const parsed = JSON.parse(result.trim()) as Record<string, unknown>;
    expect(parsed['word']).toBe('plant');
  });
});

// ─── round-trip ───────────────────────────────────────────────────────────

describe('round-trip: serialize → parse', () => {
  it('serialize then parse recovers items for single sense', () => {
    const jsonl = serializeSenseIngestFile([SINGLE_SENSE]);
    const { items, errors } = parseSenseIngestFile(jsonl);
    expect(errors).toHaveLength(0);
    expect(items).toHaveLength(1);
    expect(items[0]!.word_id).toBe(SINGLE_SENSE.word_id);
    expect(items[0]!.senses).toHaveLength(1);
    expect(items[0]!.senses[0]!.short_gloss).toBe(SINGLE_SENSE.senses[0]!.short_gloss);
    expect(items[0]!.senses[0]!.explanation).toBe(SINGLE_SENSE.senses[0]!.explanation);
    expect(items[0]!.senses[0]!.examples).toHaveLength(2);
  });

  it('serialize then parse recovers items for multi-sense', () => {
    const jsonl = serializeSenseIngestFile([MULTI_SENSE]);
    const { items, errors } = parseSenseIngestFile(jsonl);
    expect(errors).toHaveLength(0);
    expect(items).toHaveLength(1);
    expect(items[0]!.senses).toHaveLength(2);
    expect(items[0]!.senses[0]!.pos).toBe('noun');
    expect(items[0]!.senses[1]!.pos).toBe('verb');
  });

  it('serialize then parse is stable over multiple items', () => {
    const items = [SINGLE_SENSE, MULTI_SENSE];
    const jsonl = serializeSenseIngestFile(items);
    const { items: parsed, errors } = parseSenseIngestFile(jsonl);
    expect(errors).toHaveLength(0);
    expect(parsed).toHaveLength(2);
    expect(parsed[0]!.word_id).toBe(SINGLE_SENSE.word_id);
    expect(parsed[1]!.word_id).toBe(MULTI_SENSE.word_id);
  });
});
