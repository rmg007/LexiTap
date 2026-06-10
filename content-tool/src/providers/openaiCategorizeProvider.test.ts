import { describe, it, expect, vi } from 'vitest';
import {
  OpenAiCategorizeProvider,
  buildCategorizePrompt,
  parseCategorizeResponse,
  SPECIALTY_TIERS,
  DEFAULT_CATEGORIZE_MODEL,
} from '@/providers/openaiCategorizeProvider';
import type { OpenAiChatFn } from '@/providers/openaiClient';
import { OpenAiTruncationError } from '@/providers/openaiClient';
import type { WordRow } from '@/schema/types';

function wordRow(overrides: Partial<WordRow> = {}): WordRow {
  return {
    id: 'word_001',
    word: 'mitigate',
    definition: 'To make less severe.',
    pos: 'verb',
    cefr_level: null,
    grade_level: null,
    word_type: 'vocabulary',
    difficulty: null,
    frequency_rank: 4000,
    theme: null,
    example_sentence: 'They acted to _ the damage.',
    image_path: null,
    audio_path: null,
    synonyms: null,
    antonyms: null,
    usage_notes: null,
    definition_license: 'original',
    reviewed: 0,
    created_at: 1,
    deleted_at: null,
    ...overrides,
  };
}

describe('parseCategorizeResponse', () => {
  it('keeps valid CEFR + known tiers, drops foundation/unknown/dupes', () => {
    const map = parseCategorizeResponse(
      JSON.stringify({
        items: [
          { word_id: 'word_001', cefr: 'C1', tiers: ['gre', 'gre', 'foundation', 'bogus', 'business'] },
          { word_id: 'word_002', cefr: 'ZZ', tiers: ['toefl'] },
        ],
      }),
    );
    expect(map.get('word_001')).toEqual({ word_id: 'word_001', cefr: 'C1', tiers: ['gre', 'business'] });
    // invalid cefr -> null; valid tier kept
    expect(map.get('word_002')).toEqual({ word_id: 'word_002', cefr: null, tiers: ['toefl'] });
  });

  it('throws when items is missing', () => {
    expect(() => parseCategorizeResponse('{"nope":1}')).toThrow(/items/);
  });

  it('SPECIALTY_TIERS never includes foundation', () => {
    expect(SPECIALTY_TIERS).not.toContain('foundation');
  });
});

describe('buildCategorizePrompt', () => {
  it('embeds each word_id and forbids returning foundation', () => {
    const { system, user } = buildCategorizePrompt([wordRow(), wordRow({ id: 'word_002', word: 'cat' })]);
    expect(user).toContain('word_001');
    expect(user).toContain('word_002');
    expect(system).toMatch(/Do NOT return "foundation"/);
  });
});

describe('classify', () => {
  it('returns categorizations from the injected chat fn', async () => {
    const chat: OpenAiChatFn = vi.fn(async () => ({
      text: JSON.stringify({ items: [{ word_id: 'word_001', cefr: 'C1', tiers: ['gre', 'gmat'] }] }),
      usage: null,
    }));
    const provider = new OpenAiCategorizeProvider(chat, DEFAULT_CATEGORIZE_MODEL);
    const { items } = await provider.classify([wordRow()]);
    expect(items.get('word_001')?.tiers).toEqual(['gre', 'gmat']);
    expect(chat).toHaveBeenCalledOnce();
  });

  it('retries once on a parse failure', async () => {
    const chat = vi
      .fn<OpenAiChatFn>()
      .mockResolvedValueOnce({ text: 'garbage', usage: null })
      .mockResolvedValueOnce({ text: JSON.stringify({ items: [{ word_id: 'word_001', cefr: 'B2', tiers: [] }] }), usage: null });
    const provider = new OpenAiCategorizeProvider(chat);
    const { items } = await provider.classify([wordRow()]);
    expect(items.get('word_001')?.cefr).toBe('B2');
    expect(chat).toHaveBeenCalledTimes(2);
  });

  it('leaves words unclassified (empty map) when a batch fails fully', async () => {
    const chat = vi.fn<OpenAiChatFn>().mockResolvedValue({ text: 'garbage', usage: null });
    const provider = new OpenAiCategorizeProvider(chat);
    const { items } = await provider.classify([wordRow()]);
    expect(items.size).toBe(0); // fail-closed, retry-eligible next run
  });

  it('splits the batch on truncation', async () => {
    const chat = vi.fn<OpenAiChatFn>(async (req) => {
      // First call (2 words) truncates; the split single-word calls succeed.
      if (req.messages[0]!.content.includes('word_001') && req.messages[0]!.content.includes('word_002')) {
        throw new OpenAiTruncationError('truncated');
      }
      const id = req.messages[0]!.content.includes('word_001') ? 'word_001' : 'word_002';
      return { text: JSON.stringify({ items: [{ word_id: id, cefr: 'B1', tiers: [] }] }), usage: null };
    });
    const provider = new OpenAiCategorizeProvider(chat);
    const { items } = await provider.classify([wordRow(), wordRow({ id: 'word_002', word: 'dog' })]);
    expect(items.size).toBe(2);
  });
});
