import { describe, it, expect } from 'vitest';
import {
  coerceMasterWord,
  parseMasterFile,
  importMaster,
  findPruneCandidates,
} from '@/commands/import-master';
import { buildMasterRecords, serializeMasterRecords, type MasterWord } from '@/commands/export-master';
import { openMemoryContentDb, type DB } from '@/lib/db';
import { makeWordId } from '@/lib/ids';

const SLUGS = new Set(['foundation', 'toefl', 'ielts', 'business', 'advanced', 'gre', 'gmat', 'common3k', 'common9k']);

function baseRaw(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    word: 'negotiate',
    pos: 'verb',
    categories: ['B2', 'foundation'],
    reviewed: false,
    definition: 'To discuss to reach agreement',
    example_sentence: 'They met to _ the deal.',
    senses: [],
    questions: [],
    ...overrides,
  };
}

// ─── coerceMasterWord ────────────────────────────────────────────────────────

describe('coerceMasterWord', () => {
  it('accepts a well-formed record', () => {
    const r = coerceMasterWord(baseRaw(), SLUGS);
    expect('record' in r).toBe(true);
  });

  it('rejects an unknown category slug', () => {
    const r = coerceMasterWord(baseRaw({ categories: ['B2', 'nonsense'] }), SLUGS);
    expect('error' in r && r.error).toMatch(/unknown category 'nonsense'/);
  });

  it('accepts CEFR + known tiers in categories', () => {
    const r = coerceMasterWord(baseRaw({ categories: ['C1', 'toefl', 'ielts'] }), SLUGS);
    expect('record' in r).toBe(true);
  });

  it('rejects missing definition', () => {
    const r = coerceMasterWord(baseRaw({ definition: '' }), SLUGS);
    expect('error' in r && r.error).toMatch(/missing\/empty definition/);
  });

  it('rejects an invalid question type', () => {
    const r = coerceMasterWord(
      baseRaw({ questions: [{ question_index: 0, type: 'essay', prompt: 'p', correct: 'c' }] }),
      SLUGS,
    );
    expect('error' in r && r.error).toMatch(/invalid type 'essay'/);
  });

  it('defaults optional fields (reviewed false, empty arrays)', () => {
    const r = coerceMasterWord(
      { word: 'x', categories: ['foundation'], definition: 'd', example_sentence: 'The _ is here.' },
      SLUGS,
    );
    expect('record' in r).toBe(true);
    if ('record' in r) {
      expect(r.record.reviewed).toBe(false);
      expect(r.record.senses).toEqual([]);
      expect(r.record.questions).toEqual([]);
      expect(r.record.synonyms).toEqual([]);
    }
  });
});

// ─── parseMasterFile ───────────────────────────────────────────────────────────

describe('parseMasterFile', () => {
  it('collects per-line errors with 1-based line numbers, skips blanks', () => {
    const text = [
      JSON.stringify(baseRaw({ word: 'a' })),
      '', // blank skipped
      '{ not json',
      JSON.stringify(baseRaw({ word: 'b', categories: ['zzz'] })),
    ].join('\n');
    const { records, errors } = parseMasterFile(text, SLUGS);
    expect(records).toHaveLength(1);
    expect(errors).toHaveLength(2);
    expect(errors[0]!.line).toBe(3);
    expect(errors[1]!.line).toBe(4);
  });
});

// ─── importMaster (DB write) ────────────────────────────────────────────────────

function rec(overrides: Partial<MasterWord> = {}): MasterWord {
  return {
    word: 'negotiate',
    pos: 'verb',
    categories: ['B2', 'foundation', 'business'],
    reviewed: true,
    definition: 'To discuss to reach agreement',
    example_sentence: 'They met to _ the deal.',
    frequency_rank: 100,
    word_type: 'vocabulary',
    difficulty: 3,
    theme: 'Work & Career',
    synonyms: ['bargain'],
    antonyms: [],
    usage_notes: null,
    image_path: null,
    audio_path: null,
    senses: [],
    questions: [],
    ...overrides,
  };
}

describe('importMaster', () => {
  it('routes CEFR -> cefr_level and tier slugs -> word_tiers', () => {
    const db = openMemoryContentDb();
    const r = importMaster(db, [rec()], { now: () => 1 });
    expect(r.words).toBe(1);
    expect(r.memberships).toBe(2); // foundation + business (B2 is not a tier)

    const id = makeWordId('negotiate');
    const w = db.prepare(`SELECT cefr_level, reviewed, synonyms FROM words WHERE id=?`).get(id) as {
      cefr_level: string;
      reviewed: number;
      synonyms: string;
    };
    expect(w.cefr_level).toBe('B2');
    expect(w.reviewed).toBe(1);
    expect(JSON.parse(w.synonyms)).toEqual(['bargain']);

    const tiers = db.prepare(`SELECT tier_id FROM word_tiers WHERE word_id=? ORDER BY tier_id`).all(id) as { tier_id: string }[];
    expect(tiers.map((t) => t.tier_id)).toEqual(['business', 'foundation']);
    db.close();
  });

  it('ingests nested senses + examples and questions', () => {
    const db = openMemoryContentDb();
    importMaster(
      db,
      [
        rec({
          senses: [
            { sense_index: 0, pos: 'verb', short_gloss: 'g', explanation: 'e', image_path: null, examples: ['One.', 'Two.'] },
          ],
          questions: [
            { question_index: 0, type: 'true_false', prompt: 'p', correct: 'False', distractors: ['True'], hint: null, explanation: 'because', reviewed: false },
          ],
        }),
      ],
      { now: () => 1 },
    );
    const id = makeWordId('negotiate');
    expect((db.prepare(`SELECT COUNT(*) n FROM word_senses WHERE word_id=?`).get(id) as { n: number }).n).toBe(1);
    expect((db.prepare(`SELECT COUNT(*) n FROM sense_examples`).get() as { n: number }).n).toBe(2);
    const q = db.prepare(`SELECT type, distractors FROM word_questions WHERE word_id=?`).get(id) as { type: string; distractors: string };
    expect(q.type).toBe('true_false');
    expect(JSON.parse(q.distractors)).toEqual(['True']);
    db.close();
  });

  it('re-import replaces tiers/senses/questions clean-slate (no stale rows)', () => {
    const db = openMemoryContentDb();
    importMaster(db, [rec({ categories: ['B2', 'foundation', 'business'], senses: [
      { sense_index: 0, pos: null, short_gloss: 'g', explanation: 'e', image_path: null, examples: ['x'] },
    ] })], { now: () => 1 });
    // Re-import same word with fewer tiers + no senses.
    importMaster(db, [rec({ categories: ['B2', 'foundation'], senses: [] })], { now: () => 2 });

    const id = makeWordId('negotiate');
    const tiers = db.prepare(`SELECT tier_id FROM word_tiers WHERE word_id=?`).all(id) as { tier_id: string }[];
    expect(tiers.map((t) => t.tier_id)).toEqual(['foundation']); // business dropped
    expect((db.prepare(`SELECT COUNT(*) n FROM word_senses WHERE word_id=?`).get(id) as { n: number }).n).toBe(0);
    db.close();
  });

  it('counts a >1-CEFR record as a warning and keeps the first', () => {
    const db = openMemoryContentDb();
    const r = importMaster(db, [rec({ categories: ['B2', 'C1', 'foundation'] })], { now: () => 1 });
    expect(r.multiCefrWarnings).toBe(1);
    const w = db.prepare(`SELECT cefr_level FROM words WHERE id=?`).get(makeWordId('negotiate')) as { cefr_level: string };
    expect(w.cefr_level).toBe('B2');
    db.close();
  });
});

// ─── round-trip: export-master -> import-master ────────────────────────────────

describe('round-trip export-master <-> import-master', () => {
  it('import(export(db)) reproduces the same master records', () => {
    const src: DB = openMemoryContentDb();
    importMaster(
      src,
      [
        rec({ word: 'alpha', frequency_rank: 1, categories: ['A2', 'foundation'] }),
        rec({
          word: 'beta',
          frequency_rank: 2,
          categories: ['B2', 'foundation', 'toefl'],
          senses: [{ sense_index: 0, pos: 'noun', short_gloss: 'g', explanation: 'e', image_path: null, examples: ['Ex one.'] }],
          questions: [{ question_index: 0, type: 'multiple_choice', prompt: 'p', correct: 'c', distractors: ['x', 'y', 'z'], hint: 'h', explanation: 'why', reviewed: true }],
        }),
      ],
      { now: () => 1 },
    );

    const exported = buildMasterRecords(src);
    const text = serializeMasterRecords(exported);

    const dst: DB = openMemoryContentDb();
    const { records, errors } = parseMasterFile(text, SLUGS);
    expect(errors).toEqual([]);
    importMaster(dst, records, { now: () => 1 });

    const reExported = buildMasterRecords(dst);
    expect(reExported).toEqual(exported);
    src.close();
    dst.close();
  });
});

// ─── prune: a word removed from the master file must not zombie forever ───────

describe('importMaster pruning', () => {
  it('regression: N words imported, one removed from the file, re-import prunes exactly that word', () => {
    const db = openMemoryContentDb();
    importMaster(
      db,
      [rec({ word: 'alpha' }), rec({ word: 'beta' }), rec({ word: 'gamma' })],
      { now: () => 1 },
    );
    expect(
      (db.prepare(`SELECT COUNT(*) n FROM words WHERE deleted_at IS NULL`).get() as { n: number }).n,
    ).toBe(3);

    // 'beta' removed from the master file — re-import the remaining 2.
    const r = importMaster(db, [rec({ word: 'alpha' }), rec({ word: 'gamma' })], { now: () => 2 });

    expect(r.pruned).toBe(1);
    const betaId = makeWordId('beta');
    const beta = db.prepare(`SELECT deleted_at FROM words WHERE id=?`).get(betaId) as {
      deleted_at: number | null;
    };
    expect(beta.deleted_at).toBe(2);

    for (const word of ['alpha', 'gamma']) {
      const row = db.prepare(`SELECT deleted_at FROM words WHERE id=?`).get(makeWordId(word)) as {
        deleted_at: number | null;
      };
      expect(row.deleted_at).toBeNull();
    }
    expect(
      (db.prepare(`SELECT COUNT(*) n FROM words WHERE deleted_at IS NULL`).get() as { n: number }).n,
    ).toBe(2);
    db.close();
  });

  it('cascades the prune to word_tiers/word_senses/sense_examples/word_questions', () => {
    const db = openMemoryContentDb();
    importMaster(
      db,
      [
        rec({
          word: 'beta',
          categories: ['B2', 'foundation', 'business'],
          senses: [
            { sense_index: 0, pos: null, short_gloss: 'g', explanation: 'e', image_path: null, examples: ['x', 'y'] },
          ],
          questions: [
            { question_index: 0, type: 'true_false', prompt: 'p', correct: 'False', distractors: ['True'], hint: null, explanation: 'because', reviewed: false },
          ],
        }),
      ],
      { now: () => 1 },
    );
    const betaId = makeWordId('beta');
    expect((db.prepare(`SELECT COUNT(*) n FROM word_tiers WHERE word_id=?`).get(betaId) as { n: number }).n).toBe(2);
    expect((db.prepare(`SELECT COUNT(*) n FROM word_senses WHERE word_id=?`).get(betaId) as { n: number }).n).toBe(1);
    expect((db.prepare(`SELECT COUNT(*) n FROM sense_examples`).get() as { n: number }).n).toBe(2);
    expect((db.prepare(`SELECT COUNT(*) n FROM word_questions WHERE word_id=?`).get(betaId) as { n: number }).n).toBe(1);

    // 'beta' removed entirely from the next import.
    const r = importMaster(db, [], { now: () => 2 });
    expect(r.pruned).toBe(1);

    expect((db.prepare(`SELECT COUNT(*) n FROM word_tiers WHERE word_id=?`).get(betaId) as { n: number }).n).toBe(0);
    expect((db.prepare(`SELECT COUNT(*) n FROM word_senses WHERE word_id=?`).get(betaId) as { n: number }).n).toBe(0);
    expect((db.prepare(`SELECT COUNT(*) n FROM sense_examples`).get() as { n: number }).n).toBe(0);
    expect((db.prepare(`SELECT COUNT(*) n FROM word_questions WHERE word_id=?`).get(betaId) as { n: number }).n).toBe(0);
    db.close();
  });

  it('{ prune: false } leaves an absent word untouched', () => {
    const db = openMemoryContentDb();
    importMaster(db, [rec({ word: 'alpha' }), rec({ word: 'beta' })], { now: () => 1 });

    const r = importMaster(db, [rec({ word: 'alpha' })], { now: () => 2, prune: false });
    expect(r.pruned).toBe(0);

    const beta = db.prepare(`SELECT deleted_at FROM words WHERE id=?`).get(makeWordId('beta')) as {
      deleted_at: number | null;
    };
    expect(beta.deleted_at).toBeNull();
    db.close();
  });

  it('re-adding a pruned word later restores it via the normal upsert (deleted_at cleared)', () => {
    const db = openMemoryContentDb();
    importMaster(db, [rec({ word: 'alpha' }), rec({ word: 'beta' })], { now: () => 1 });
    importMaster(db, [rec({ word: 'alpha' })], { now: () => 2 }); // beta pruned
    importMaster(db, [rec({ word: 'alpha' }), rec({ word: 'beta' })], { now: () => 3 }); // beta returns

    const beta = db.prepare(`SELECT deleted_at FROM words WHERE id=?`).get(makeWordId('beta')) as {
      deleted_at: number | null;
    };
    expect(beta.deleted_at).toBeNull();
    db.close();
  });

  it('findPruneCandidates reports active words absent from the given records, without writing', () => {
    const db = openMemoryContentDb();
    importMaster(db, [rec({ word: 'alpha' }), rec({ word: 'beta' })], { now: () => 1 });

    const candidates = findPruneCandidates(db, [rec({ word: 'alpha' })]);
    expect(candidates.map((c) => c.word)).toEqual(['beta']);

    // Nothing was written — a real re-import still reports beta as prunable.
    const stillActive = db.prepare(`SELECT deleted_at FROM words WHERE id=?`).get(makeWordId('beta')) as {
      deleted_at: number | null;
    };
    expect(stillActive.deleted_at).toBeNull();
    db.close();
  });
});
