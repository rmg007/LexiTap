import { describe, it, expect } from 'vitest';
import {
  validateRows,
  countBlanks,
  hasInTokenUnderscore,
  isJsonStringArray,
} from '@/commands/validate';
import type { AppConfig } from '@/lib/config';
import type { WordRow } from '@/schema/types';

const config: AppConfig = {
  app_id: 'lexitap',
  tiers: [
    {
      slug: 'foundation',
      name: 'Foundation',
      description: null,
      is_free: true,
      sku: null,
      display_order: 1,
      requires_theme: true,
      audio: false,
    },
    {
      slug: 'toefl',
      name: 'TOEFL',
      description: null,
      is_free: false,
      sku: 'com.lexitap.toefl',
      display_order: 2,
      requires_theme: false,
      audio: true,
    },
  ],
};

function row(overrides: Partial<WordRow> = {}): WordRow {
  return {
    id: 'word_foundation_abc12345',
    word: 'borrow',
    definition: 'To take and return later',
    tier_id: 'foundation',
    pos: 'verb',
    cefr_level: 'A2',
    grade_level: null,
    word_type: 'vocabulary',
    difficulty: 2,
    theme: 'Daily Life',
    example_sentence: 'Can I _ your pen?',
    image_path: null,
    audio_path: null,
    synonyms: null,
    antonyms: null,
    usage_notes: null,
    created_at: 1,
    deleted_at: null,
    ...overrides,
  };
}

function errors(rows: WordRow[], strict = false) {
  return validateRows(rows, config, { strict }).filter((i) => i.level === 'error');
}

describe('helper functions', () => {
  it('countBlanks counts underscores', () => {
    expect(countBlanks('Can I _ your pen?')).toBe(1);
    expect(countBlanks('no blank here')).toBe(0);
    expect(countBlanks('_ and _')).toBe(2);
  });

  it('hasInTokenUnderscore detects glued underscores', () => {
    expect(hasInTokenUnderscore('a _ in the gap')).toBe(false);
    expect(hasInTokenUnderscore('cataly_t reaction')).toBe(true);
  });

  it('isJsonStringArray validates JSON arrays of strings', () => {
    expect(isJsonStringArray(null)).toBe(true);
    expect(isJsonStringArray('["a","b"]')).toBe(true);
    expect(isJsonStringArray('[]')).toBe(true);
    expect(isJsonStringArray('not json')).toBe(false);
    expect(isJsonStringArray('{"a":1}')).toBe(false);
    expect(isJsonStringArray('[1,2]')).toBe(false);
  });
});

describe('validateRows', () => {
  it('passes a clean foundation row', () => {
    expect(errors([row()])).toHaveLength(0);
  });

  it('rule #1: missing required fields', () => {
    const e = errors([row({ definition: '', word: '' })]);
    expect(e.some((i) => i.field === 'definition')).toBe(true);
    expect(e.some((i) => i.field === 'word')).toBe(true);
  });

  it('rule #2: zero blanks', () => {
    const e = errors([row({ example_sentence: 'no blank' })]);
    expect(e.some((i) => i.field === 'example_sentence' && /found 0/.test(i.message))).toBe(true);
  });

  it('rule #2: multiple blanks', () => {
    const e = errors([row({ example_sentence: '_ and _' })]);
    expect(e.some((i) => i.field === 'example_sentence' && /found 2/.test(i.message))).toBe(true);
  });

  it('rule #3: duplicate surface form within a tier', () => {
    const e = errors([
      row({ id: 'a', word: 'Borrow' }),
      row({ id: 'b', word: 'borrow' }),
    ]);
    expect(e.some((i) => i.field === 'word' && /duplicate/.test(i.message))).toBe(true);
  });

  it('rule #3: same word across different tiers is NOT a duplicate', () => {
    const e = errors([
      row({ id: 'a', word: 'analyze', tier_id: 'foundation' }),
      row({ id: 'b', word: 'analyze', tier_id: 'toefl', theme: null }),
    ]);
    expect(e.some((i) => /duplicate/.test(i.message))).toBe(false);
  });

  it('rule #4: unknown tier', () => {
    const e = errors([row({ tier_id: 'nope' })]);
    expect(e.some((i) => i.field === 'tier_id' && /unknown tier/.test(i.message))).toBe(true);
  });

  it('rule #5: theme required for foundation', () => {
    const e = errors([row({ theme: null })]);
    expect(e.some((i) => i.field === 'theme')).toBe(true);
  });

  it('rule #5: theme not required for toefl', () => {
    const e = errors([row({ tier_id: 'toefl', theme: null })]);
    expect(e.some((i) => i.field === 'theme')).toBe(false);
  });

  it('rule #6: invalid JSON arrays', () => {
    const e = errors([row({ synonyms: 'oops', antonyms: '{}' })]);
    expect(e.some((i) => i.field === 'synonyms')).toBe(true);
    expect(e.some((i) => i.field === 'antonyms')).toBe(true);
  });

  it('rule #7: missing asset reference', () => {
    const e = validateRows(
      [row({ audio_path: 'assets/audio/x.mp3' })],
      config,
      {},
      () => false,
    ).filter((i) => i.level === 'error');
    expect(e.some((i) => i.field === 'audio_path')).toBe(true);
  });

  it('rule #8: invalid word_type', () => {
    const e = errors([row({ word_type: 'bogus' })]);
    expect(e.some((i) => i.field === 'word_type')).toBe(true);
  });

  it('multi-word entry must set a multi-word word_type', () => {
    const e = errors([row({ word: 'look up to', word_type: 'vocabulary' })]);
    expect(e.some((i) => i.field === 'word_type' && /multi-word/.test(i.message))).toBe(true);
  });

  it('multi-word entry with phrasal_verb is fine', () => {
    const e = errors([row({ word: 'look up to', word_type: 'phrasal_verb' })]);
    expect(e.some((i) => i.field === 'word_type')).toBe(false);
  });

  it('strict mode warns on in-token underscore', () => {
    const issues = validateRows([row({ example_sentence: 'cataly_t now' })], config, {
      strict: true,
    });
    // exactly one blank, but glued -> warning not error
    expect(issues.some((i) => i.level === 'warning' && i.field === 'example_sentence')).toBe(true);
  });
});
