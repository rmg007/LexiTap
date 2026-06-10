import { describe, it, expect } from 'vitest';
import {
  buildMasterRecords,
  serializeMasterRecords,
  type MasterWord,
} from '@/commands/export-master';
import { openMemoryContentDb, type DB } from '@/lib/db';
import { makeWordId, makeSenseId, makeExampleId, makeQuestionId } from '@/lib/ids';

function seedWord(
  db: DB,
  word: string,
  overrides: Partial<{
    cefr_level: string | null;
    reviewed: number;
    frequency_rank: number | null;
    synonyms: string | null;
  }> = {},
): string {
  const id = makeWordId(word);
  db.prepare(
    `INSERT INTO words (id, word, definition, pos, cefr_level, example_sentence,
       frequency_rank, word_type, difficulty, theme, synonyms, definition_license, reviewed, created_at)
     VALUES (@id, @word, @definition, @pos, @cefr_level, @example_sentence,
       @frequency_rank, @word_type, @difficulty, @theme, @synonyms, 'original', @reviewed, 1)`,
  ).run({
    id,
    word,
    definition: `def of ${word}`,
    pos: 'verb',
    cefr_level: overrides.cefr_level ?? 'B2',
    example_sentence: `They _ the deal.`,
    frequency_rank: overrides.frequency_rank ?? null,
    word_type: 'vocabulary',
    difficulty: 3,
    theme: 'Work & Career',
    synonyms: overrides.synonyms ?? null,
    reviewed: overrides.reviewed ?? 0,
  });
  return id;
}

function tag(db: DB, wordId: string, tierId: string): void {
  db.prepare(`INSERT INTO word_tiers (word_id, tier_id) VALUES (?, ?)`).run(wordId, tierId);
}

describe('buildMasterRecords', () => {
  it('merges cefr_level + tier slugs into categories (cefr first)', () => {
    const db = openMemoryContentDb();
    const id = seedWord(db, 'negotiate', { cefr_level: 'B2', frequency_rank: 10 });
    tag(db, id, 'toefl');
    tag(db, id, 'business');
    tag(db, id, 'foundation');

    const [rec] = buildMasterRecords(db);
    expect(rec!.word).toBe('negotiate');
    expect(rec!.categories[0]).toBe('B2'); // CEFR first
    // tier slugs follow, sorted (business, foundation, toefl)
    expect(rec!.categories.slice(1)).toEqual(['business', 'foundation', 'toefl']);
    db.close();
  });

  it('exposes reviewed as a boolean', () => {
    const db = openMemoryContentDb();
    seedWord(db, 'alpha', { reviewed: 1, frequency_rank: 1 });
    seedWord(db, 'beta', { reviewed: 0, frequency_rank: 2 });
    const recs = buildMasterRecords(db);
    expect(recs.find((r) => r.word === 'alpha')!.reviewed).toBe(true);
    expect(recs.find((r) => r.word === 'beta')!.reviewed).toBe(false);
    db.close();
  });

  it('un-enriched words have empty senses + questions arrays', () => {
    const db = openMemoryContentDb();
    seedWord(db, 'plain', { frequency_rank: 1 });
    const [rec] = buildMasterRecords(db);
    expect(rec!.senses).toEqual([]);
    expect(rec!.questions).toEqual([]);
    db.close();
  });

  it('nests senses with their examples (as plain strings)', () => {
    const db = openMemoryContentDb();
    const id = seedWord(db, 'plant', { frequency_rank: 1 });
    const senseId = makeSenseId(id, 0);
    db.prepare(
      `INSERT INTO word_senses (id, word_id, sense_index, pos, short_gloss, explanation, image_path, created_at)
       VALUES (?, ?, 0, 'noun', 'a living thing', 'A plant grows from soil.', null, 1)`,
    ).run(senseId, id);
    db.prepare(
      `INSERT INTO sense_examples (id, sense_id, example_index, text, created_at) VALUES (?, ?, 0, 'The plant grew tall.', 1)`,
    ).run(makeExampleId(senseId, 0), senseId);

    const [rec] = buildMasterRecords(db);
    expect(rec!.senses).toHaveLength(1);
    expect(rec!.senses[0]!.short_gloss).toBe('a living thing');
    expect(rec!.senses[0]!.examples).toEqual(['The plant grew tall.']);
    db.close();
  });

  it('nests questions with parsed distractors + boolean reviewed', () => {
    const db = openMemoryContentDb();
    const id = seedWord(db, 'plant', { frequency_rank: 1 });
    db.prepare(
      `INSERT INTO word_questions (id, word_id, question_index, type, prompt, correct, distractors, hint, explanation, reviewed, created_at)
       VALUES (?, ?, 0, 'multiple_choice', 'pick one', 'right', ?, 'a hint', 'because', 1, 1)`,
    ).run(makeQuestionId(id, 0), id, JSON.stringify(['wrong1', 'wrong2', 'wrong3']));

    const [rec] = buildMasterRecords(db);
    expect(rec!.questions).toHaveLength(1);
    const q = rec!.questions[0]!;
    expect(q.type).toBe('multiple_choice');
    expect(q.distractors).toEqual(['wrong1', 'wrong2', 'wrong3']);
    expect(q.hint).toBe('a hint');
    expect(q.reviewed).toBe(true);
    db.close();
  });

  it('orders by frequency_rank ASC with NULLs last', () => {
    const db = openMemoryContentDb();
    seedWord(db, 'third', { frequency_rank: null });
    seedWord(db, 'first', { frequency_rank: 1 });
    seedWord(db, 'second', { frequency_rank: 5 });
    const recs = buildMasterRecords(db);
    expect(recs.map((r) => r.word)).toEqual(['first', 'second', 'third']);
    db.close();
  });

  it('parses synonyms JSON-array TEXT into a string[]', () => {
    const db = openMemoryContentDb();
    seedWord(db, 'happy', { synonyms: JSON.stringify(['glad', 'joyful']), frequency_rank: 1 });
    const [rec] = buildMasterRecords(db);
    expect(rec!.synonyms).toEqual(['glad', 'joyful']);
    db.close();
  });
});

describe('serializeMasterRecords', () => {
  it('emits one \\n-terminated JSON object per line that round-trips', () => {
    const db = openMemoryContentDb();
    seedWord(db, 'alpha', { frequency_rank: 1 });
    seedWord(db, 'beta', { frequency_rank: 2 });
    const recs = buildMasterRecords(db);

    const text = serializeMasterRecords(recs);
    const lines = text.split('\n').filter(Boolean);
    expect(lines).toHaveLength(2);
    const parsed = lines.map((l) => JSON.parse(l) as MasterWord);
    expect(parsed[0]!.word).toBe('alpha');
    expect(parsed).toEqual(recs);
    db.close();
  });

  it('emits empty string for no records', () => {
    expect(serializeMasterRecords([])).toBe('');
  });
});
