import { describe, it, expect } from 'vitest';
import {
  validateRows,
  countBlanks,
  hasInTokenUnderscore,
  isJsonStringArray,
  exampleLeaksAnswer,
} from '@/commands/validate';
import type { AppConfig } from '@/lib/config';
import type { WordRow, WordTierRow } from '@/schema/types';

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
      audio: true,
    },
    {
      slug: 'toefl',
      name: 'TOEFL',
      description: null,
      is_free: false,
      sku: 'com.lexitap.exam.toefl',
      display_order: 2,
      requires_theme: false,
      audio: true,
    },
  ],
};

function row(overrides: Partial<WordRow> = {}): WordRow {
  return {
    id: 'word_borrow0001',
    word: 'borrow',
    definition: 'To take and return later',
    pos: 'verb',
    cefr_level: 'A2',
    grade_level: null,
    word_type: 'vocabulary',
    difficulty: 2,
    frequency_rank: null,
    theme: 'Daily Life',
    example_sentence: 'Can I _ your pen?',
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

const mem = (word_id: string, tier_id: string): WordTierRow => ({ word_id, tier_id });
// Default: every word is tagged into `foundation` unless a test overrides.
const inFoundation = (words: WordRow[]): WordTierRow[] => words.map((w) => mem(w.id, 'foundation'));

function errors(words: WordRow[], memberships: WordTierRow[] = inFoundation(words), strict = false) {
  return validateRows(words, memberships, config, { strict }).filter((i) => i.level === 'error');
}

function strictErrors(words: WordRow[], memberships: WordTierRow[] = inFoundation(words)) {
  return errors(words, memberships, true);
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

  it('hasInTokenUnderscore treats a blank next to punctuation as a bare blank (not glue)', () => {
    // Terminal/clause punctuation right after the blank is normal English.
    expect(hasInTokenUnderscore('She had eggs and toast for _.')).toBe(false);
    expect(hasInTokenUnderscore('Can you help _?')).toBe(false);
    expect(hasInTokenUnderscore('First _, then we go.')).toBe(false);
    expect(hasInTokenUnderscore('Put it in the "_" box.')).toBe(false);
    // ...but an alphanumeric fused to the blank is still in-token glue.
    expect(hasInTokenUnderscore('She _s in a hospital.')).toBe(true);
    expect(hasInTokenUnderscore('water is made of two _s')).toBe(true);
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

  it('rule #1: a word with no category membership is an error', () => {
    const e = errors([row()], []);
    expect(e.some((i) => i.field === 'membership')).toBe(true);
  });

  it('rule #2: zero blanks', () => {
    const e = errors([row({ example_sentence: 'no blank' })]);
    expect(e.some((i) => i.field === 'example_sentence' && /found 0/.test(i.message))).toBe(true);
  });

  it('rule #2: multiple blanks', () => {
    const e = errors([row({ example_sentence: '_ and _' })]);
    expect(e.some((i) => i.field === 'example_sentence' && /found 2/.test(i.message))).toBe(true);
  });

  it('many-to-many: one word tagged into two categories validates clean', () => {
    const w = row();
    const e = errors([w], [mem(w.id, 'foundation'), mem(w.id, 'toefl')]);
    expect(e).toHaveLength(0);
  });

  it('rule #4: membership referencing an unknown tier', () => {
    const w = row();
    const e = errors([w], [mem(w.id, 'nope')]);
    expect(e.some((i) => i.field === 'tier_id' && /unknown tier/.test(i.message))).toBe(true);
  });

  it('rule #4: membership referencing an unknown word', () => {
    const e = errors([row()], [mem('word_ghost', 'foundation'), mem('word_borrow0001', 'foundation')]);
    expect(e.some((i) => i.field === 'word_id' && /unknown word/.test(i.message))).toBe(true);
  });

  it('rule #5: theme required for foundation', () => {
    const e = errors([row({ theme: null })]);
    expect(e.some((i) => i.field === 'theme')).toBe(true);
  });

  it('rule #5: theme not required for toefl-only', () => {
    const w = row({ theme: null });
    const e = errors([w], [mem(w.id, 'toefl')]);
    expect(e.some((i) => i.field === 'theme')).toBe(false);
  });

  it('rule #5: theme required if ANY category requires it (foundation + toefl)', () => {
    const w = row({ theme: null });
    const e = errors([w], [mem(w.id, 'foundation'), mem(w.id, 'toefl')]);
    expect(e.some((i) => i.field === 'theme')).toBe(true);
  });

  it('rule #6: invalid JSON arrays', () => {
    const e = errors([row({ synonyms: 'oops', antonyms: '{}' })]);
    expect(e.some((i) => i.field === 'synonyms')).toBe(true);
    expect(e.some((i) => i.field === 'antonyms')).toBe(true);
  });

  it('rule #7: missing asset reference', () => {
    const w = row({ audio_path: 'assets/audio/x.mp3' });
    const e = validateRows([w], inFoundation([w]), config, {}, () => false).filter(
      (i) => i.level === 'error',
    );
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
    const w = row({ example_sentence: 'cataly_t now' });
    const issues = validateRows([w], inFoundation([w]), config, { strict: true });
    // exactly one blank, but glued -> warning not error
    expect(issues.some((i) => i.level === 'warning' && i.field === 'example_sentence')).toBe(true);
  });
});

describe('C7 strict: orphan / dup-leak / provenance', () => {
  it('orphan (always-on): word with no membership errors even without --strict', () => {
    const e = errors([row()], []);
    expect(e.some((i) => i.field === 'membership')).toBe(true);
  });

  it('orphan (always-on): membership pointing at a missing word errors', () => {
    const e = errors([row()], [mem('word_ghost', 'foundation'), mem('word_borrow0001', 'foundation')]);
    expect(e.some((i) => i.field === 'word_id' && /unknown word/.test(i.message))).toBe(true);
  });

  it('exampleLeaksAnswer detects the answer word spelled out', () => {
    expect(exampleLeaksAnswer('borrow', 'Can I _ your pen?')).toBe(false);
    expect(exampleLeaksAnswer('borrow', 'I borrow and _ books.')).toBe(true);
    // case-insensitive, whole-token (does not match "borrowing" substring)
    expect(exampleLeaksAnswer('borrow', 'Borrow it: can I _ it?')).toBe(true);
    expect(exampleLeaksAnswer('row', 'We grow a _ of plants.')).toBe(false);
  });

  it('strict: example leaking the answer word is an error', () => {
    const e = strictErrors([row({ example_sentence: 'I borrow and _ pens.' })]);
    expect(e.some((i) => i.field === 'example_sentence' && /leaks the answer/.test(i.message))).toBe(true);
  });

  it('non-strict: an answer leak is NOT flagged', () => {
    const e = errors([row({ example_sentence: 'I borrow and _ pens.' })]);
    expect(e.some((i) => /leaks the answer/.test(i.message))).toBe(false);
  });

  it('strict: missing provenance/license is an error', () => {
    const e = strictErrors([row({ definition_license: null })]);
    expect(e.some((i) => i.field === 'definition_license' && /missing/.test(i.message))).toBe(true);
  });

  it('strict: invalid provenance/license value is an error', () => {
    const e = strictErrors([row({ definition_license: 'webster-1913' })]);
    expect(e.some((i) => i.field === 'definition_license' && /invalid/.test(i.message))).toBe(true);
  });

  it('strict: a valid provenance tag passes', () => {
    const e = strictErrors([row({ definition_license: 'ai-original' })]);
    expect(e.some((i) => i.field === 'definition_license')).toBe(false);
  });

  it('non-strict: missing provenance/license is NOT flagged', () => {
    const e = errors([row({ definition_license: null })]);
    expect(e.some((i) => i.field === 'definition_license')).toBe(false);
  });

  it('strict: two distinct words sharing one definition are flagged', () => {
    const a = row({ id: 'word_a', word: 'big', definition: 'large in size', example_sentence: 'a _ house' });
    const b = row({ id: 'word_b', word: 'huge', definition: 'Large in size', example_sentence: 'a _ ship' });
    const e = validateRows([a, b], inFoundation([a, b]), config, { strict: true }).filter(
      (i) => i.level === 'error',
    );
    const dups = e.filter((i) => i.field === 'definition' && /duplicate definition/.test(i.message));
    expect(dups.map((i) => i.wordId).sort()).toEqual(['word_a', 'word_b']);
  });

  it('non-strict: duplicate definitions are NOT flagged', () => {
    const a = row({ id: 'word_a', word: 'big', definition: 'large in size', example_sentence: 'a _ house' });
    const b = row({ id: 'word_b', word: 'huge', definition: 'large in size', example_sentence: 'a _ ship' });
    const e = errors([a, b]);
    expect(e.some((i) => /duplicate definition/.test(i.message))).toBe(false);
  });
});
