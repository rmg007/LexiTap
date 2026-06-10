import { describe, it, expect } from 'vitest';
import {
  validateRows,
  validateSenseRows,
  countBlanks,
  hasInTokenUnderscore,
  isJsonStringArray,
  exampleLeaksAnswer,
  isGlossStyle,
} from '@/commands/validate';
import type { AppConfig } from '@/lib/config';
import type { WordRow, WordTierRow, WordSenseRow, SenseExampleRow } from '@/schema/types';

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
    reviewed: 0,
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

// ─── Sense + example validation ────────────────────────────────────────────

const WORD_IDS = new Set(['word_plant', 'word_cook']);

function sense(overrides: Partial<WordSenseRow> = {}): WordSenseRow {
  return {
    id: 'sense_s0',
    word_id: 'word_plant',
    sense_index: 0,
    pos: 'noun',
    short_gloss: 'a living organism that grows in soil',
    explanation: 'A plant is a living thing that pulls water through roots and turns sunlight into energy to grow. Trees, flowers, and grass are all plants.',
    image_path: null,
    created_at: 1,
    deleted_at: null,
    ...overrides,
  };
}

function example(overrides: Partial<SenseExampleRow> = {}): SenseExampleRow {
  return {
    id: 'ex_e0',
    sense_id: 'sense_s0',
    example_index: 0,
    text: 'She waters her plants every morning.',
    created_at: 1,
    ...overrides,
  };
}

function senseErrors(
  senses: WordSenseRow[],
  examples: SenseExampleRow[] = [],
  strict = false,
) {
  return validateSenseRows(senses, examples, WORD_IDS, { strict }).filter(
    (i) => i.level === 'error',
  );
}

function senseWarnings(senses: WordSenseRow[], examples: SenseExampleRow[] = []) {
  return validateSenseRows(senses, examples, WORD_IDS, { strict: true }).filter(
    (i) => i.level === 'warning',
  );
}

describe('isGlossStyle', () => {
  it('detects dictionary-style openers', () => {
    expect(isGlossStyle('a word that describes something')).toBe(true);
    expect(isGlossStyle('term for a type of plant')).toBe(true);
    expect(isGlossStyle('A word meaning happy')).toBe(true);
  });

  it('detects expanded common gloss openers', () => {
    expect(isGlossStyle('A person who teaches others.')).toBe(true);
    expect(isGlossStyle('The act of giving something back.')).toBe(true);
    expect(isGlossStyle('The state of being very tired.')).toBe(true);
    expect(isGlossStyle('The quality of being honest.')).toBe(true);
    expect(isGlossStyle('A type of animal with four legs.')).toBe(true);
    expect(isGlossStyle('The condition of having no money.')).toBe(true);
  });

  it('passes felt prose', () => {
    expect(isGlossStyle('When you cook, heat transforms raw ingredients.')).toBe(false);
    expect(isGlossStyle('Effort is the fuel behind everything hard.')).toBe(false);
  });
});

describe('validateSenseRows — word-level rules', () => {
  it('passes a clean single sense', () => {
    expect(senseErrors([sense()])).toHaveLength(0);
  });

  it('S1: unknown word_id is an error', () => {
    const e = senseErrors([sense({ word_id: 'word_ghost' })]);
    expect(e.some((i) => i.field === 'word_id' && /unknown/.test(i.message))).toBe(true);
  });

  it('S2/S6: senses must start at index 0', () => {
    const e = senseErrors([sense({ sense_index: 1 })]);
    expect(e.some((i) => i.field === 'sense_index')).toBe(true);
  });

  it('S2: sense_index gap is an error', () => {
    const s0 = sense({ id: 'sense_s0', sense_index: 0 });
    const s2 = sense({ id: 'sense_s2', sense_index: 2 }); // gap: 1 is missing
    const e = senseErrors([s0, s2]);
    expect(e.some((i) => i.field === 'sense_index' && /gap/.test(i.message))).toBe(true);
  });

  it('S3: empty short_gloss is an error', () => {
    const e = senseErrors([sense({ short_gloss: '' })]);
    expect(e.some((i) => i.field === 'short_gloss')).toBe(true);
  });

  it('S4: empty explanation is an error', () => {
    const e = senseErrors([sense({ explanation: '' })]);
    expect(e.some((i) => i.field === 'explanation' && /empty/.test(i.message))).toBe(true);
  });

  it('S5: explanation identical to short_gloss is an error', () => {
    const s = sense({ short_gloss: 'a living thing', explanation: 'a living thing' });
    const e = senseErrors([s]);
    expect(e.some((i) => i.field === 'explanation' && /identical/.test(i.message))).toBe(true);
  });

  it('S5: case-insensitive comparison', () => {
    const s = sense({ short_gloss: 'A Living Thing', explanation: 'a living thing' });
    const e = senseErrors([s]);
    expect(e.some((i) => i.field === 'explanation' && /identical/.test(i.message))).toBe(true);
  });

  it('S7 strict: identical short_gloss across two senses of same word is an error', () => {
    const s0 = sense({ id: 'sense_s0', sense_index: 0, short_gloss: 'same gloss' });
    const s1 = sense({ id: 'sense_s1', sense_index: 1, short_gloss: 'same gloss' });
    const e = senseErrors([s0, s1], [], true);
    expect(e.some((i) => i.field === 'short_gloss' && /identical/.test(i.message))).toBe(true);
  });

  it('S7 non-strict: identical short_gloss is NOT flagged', () => {
    const s0 = sense({ id: 'sense_s0', sense_index: 0, short_gloss: 'same gloss' });
    const s1 = sense({ id: 'sense_s1', sense_index: 1, short_gloss: 'same gloss' });
    const e = senseErrors([s0, s1], [], false);
    expect(e.some((i) => i.field === 'short_gloss')).toBe(false);
  });

  it('S8 strict: gloss-style explanation is a warning', () => {
    const s = sense({ explanation: 'a word that refers to green living things' });
    const w = senseWarnings([s]);
    expect(w.some((i) => i.field === 'explanation' && /gloss/.test(i.message))).toBe(true);
  });

  it('S9 strict: very short explanation is a warning', () => {
    const s = sense({ explanation: 'It grows.' }); // <50 chars
    const w = senseWarnings([s]);
    expect(w.some((i) => i.field === 'explanation' && /short/.test(i.message))).toBe(true);
  });

  it('two clean senses on one word pass', () => {
    const s0 = sense({ id: 'sense_s0', sense_index: 0, short_gloss: 'gloss A' });
    const s1 = sense({
      id: 'sense_s1',
      sense_index: 1,
      short_gloss: 'gloss B',
      explanation: 'Totally different felt explanation for the second sense of this word.',
    });
    expect(senseErrors([s0, s1])).toHaveLength(0);
  });
});

describe('validateSenseRows — example rules', () => {
  it('E1: empty text is an error', () => {
    const ex = example({ text: '' });
    const e = senseErrors([sense()], [ex]);
    expect(e.some((i) => i.field === 'example_text' && /empty/.test(i.message))).toBe(true);
  });

  it('E2: underscore blank in teaching example is an error', () => {
    const ex = example({ text: 'She _ her plants every morning.' });
    const e = senseErrors([sense()], [ex]);
    expect(e.some((i) => i.field === 'example_text' && /no.*_/.test(i.message))).toBe(true);
  });

  it('clean example with no underscore passes', () => {
    const ex = example({ text: 'She waters her plants every morning.' });
    expect(senseErrors([sense()], [ex])).toHaveLength(0);
  });
});
