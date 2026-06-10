import { describe, it, expect, vi } from 'vitest';
import {
  OpenAiSenseQuestionProvider,
  buildSenseQuestionPrompt,
  parseSenseQuestionResponse,
  DEFAULT_ENRICH_MODEL,
} from '@/providers/openaiSenseQuestionProvider';
import type { OpenAiChatFn } from '@/providers/openaiClient';
import { OpenAiTruncationError } from '@/providers/openaiClient';
import type { WordRow } from '@/schema/types';

function wordRow(overrides: Partial<WordRow> = {}): WordRow {
  return {
    id: 'word_001',
    word: 'negotiate',
    definition: 'To discuss to reach agreement.',
    pos: 'verb',
    cefr_level: 'B2',
    grade_level: null,
    word_type: 'vocabulary',
    difficulty: null,
    frequency_rank: 1800,
    theme: null,
    example_sentence: 'They met to _ the deal.',
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

function fullItem(wordId = 'word_001', word = 'negotiate') {
  return {
    word_id: wordId,
    word,
    senses: [
      { sense_index: 0, pos: 'verb', short_gloss: 'discuss to agree', explanation: 'When you negotiate you go back and forth until both sides accept a deal.', image_path: null, examples: ['The union negotiated a raise.', 'She negotiated the price down.'] },
    ],
    questions: [
      { question_index: 0, type: 'multiple_choice', prompt: 'Which uses it right?', correct: 'They negotiated a deal.', distractors: ['He negotiated the soup.', 'She negotiated a window.', 'It negotiated loudly.'], hint: 'two sides agree', explanation: 'You negotiate an agreement.', reviewed: false },
    ],
  };
}

describe('parseSenseQuestionResponse', () => {
  it('coerces senses (string examples), questions, and skips', () => {
    const text = JSON.stringify({ items: [fullItem()], skipped: [{ word_id: 'word_009', word: 'davis', reason: 'proper noun' }] });
    const { items, skipped } = parseSenseQuestionResponse(text);
    const it = items.get('word_001')!;
    expect(it.senses[0]!.examples).toEqual(['The union negotiated a raise.', 'She negotiated the price down.']);
    expect(it.questions[0]!.type).toBe('multiple_choice');
    expect(skipped[0]).toEqual({ word_id: 'word_009', word: 'davis', reason: 'proper noun' });
  });

  it('throws when items/skipped arrays are missing', () => {
    expect(() => parseSenseQuestionResponse('{"items":[]}')).toThrow(/skipped/);
  });
});

describe('buildSenseQuestionPrompt', () => {
  it('embeds the word + requires 5 click/drag questions, no typing', () => {
    const { system, user } = buildSenseQuestionPrompt([wordRow()]);
    expect(user).toContain('word_001');
    expect(system).toMatch(/EXACTLY 5 questions/);
    expect(system).toMatch(/NEVER by typing/);
  });
});

describe('generate', () => {
  it('returns items + skips from the injected chat fn', async () => {
    const chat: OpenAiChatFn = vi.fn(async () => ({
      text: JSON.stringify({ items: [fullItem()], skipped: [] }),
      usage: null,
    }));
    const provider = new OpenAiSenseQuestionProvider(chat, DEFAULT_ENRICH_MODEL);
    const { items, skipped } = await provider.generate([wordRow()]);
    expect(items.get('word_001')?.questions).toHaveLength(1);
    expect(skipped).toEqual([]);
  });

  it('skips a whole batch as provider_error when it fails to parse', async () => {
    const chat = vi.fn<OpenAiChatFn>().mockResolvedValue({ text: 'garbage', usage: null });
    const provider = new OpenAiSenseQuestionProvider(chat);
    const { items, skipped } = await provider.generate([wordRow()]);
    expect(items.size).toBe(0);
    expect(skipped[0]?.reason).toBe('provider_error');
  });

  it('splits the batch on truncation down to single words', async () => {
    const chat = vi.fn<OpenAiChatFn>(async (req) => {
      const both = req.messages[0]!.content.includes('word_001') && req.messages[0]!.content.includes('word_002');
      if (both) throw new OpenAiTruncationError('truncated');
      const id = req.messages[0]!.content.includes('word_001') ? 'word_001' : 'word_002';
      return { text: JSON.stringify({ items: [fullItem(id, id === 'word_001' ? 'negotiate' : 'dog')], skipped: [] }), usage: null };
    });
    const provider = new OpenAiSenseQuestionProvider(chat);
    const { items } = await provider.generate([wordRow(), wordRow({ id: 'word_002', word: 'dog' })]);
    expect(items.size).toBe(2);
  });
});
