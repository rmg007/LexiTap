import { describe, it, expect } from 'vitest';
import { parseSenseIngestFile, ingestSenses, type SenseIngestItem } from '@/commands/ingest-senses';
import { makeSenseId, makeExampleId, makeWordId } from '@/lib/ids';
import { openMemoryContentDb } from '@/lib/db';
import type { WordSenseRow, SenseExampleRow } from '@/schema/types';

// ─── helpers ──────────────────────────────────────────────────────────────

const WORD_ID = makeWordId('plant');

const BASE_SENSES: SenseIngestItem['senses'] = [
  {
    sense_index: 0,
    pos: 'noun',
    short_gloss: 'a living thing that grows in soil',
    explanation: 'A plant pulls water through roots and turns sunlight into energy to grow.',
    image_path: null,
    examples: [
      { example_index: 0, text: 'She waters her plants every morning.' },
      { example_index: 1, text: 'The garden was full of colorful plants.' },
    ],
  },
];

function minItem(overrides: Partial<SenseIngestItem> = {}): SenseIngestItem {
  return {
    word_id: WORD_ID,
    word: 'plant',
    senses: BASE_SENSES,
    ...overrides,
  };
}

function seedWord(db: ReturnType<typeof openMemoryContentDb>, wordId = WORD_ID) {
  db.prepare(
    `INSERT INTO words (id, word, definition, example_sentence, created_at, definition_license)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(wordId, 'plant', 'A living thing with roots.', 'She _ her seeds in the garden.', 1, 'original');
}

// ─── parseSenseIngestFile ──────────────────────────────────────────────────

describe('parseSenseIngestFile', () => {
  it('parses a valid single-line JSONL', () => {
    const line = JSON.stringify(minItem());
    const { items, errors } = parseSenseIngestFile(line);
    expect(errors).toHaveLength(0);
    expect(items).toHaveLength(1);
    expect(items[0]!.word_id).toBe(WORD_ID);
    expect(items[0]!.senses).toHaveLength(1);
  });

  it('parses multiple lines', () => {
    const text = `${JSON.stringify(minItem({ word_id: 'word_aaa' }))}\n${JSON.stringify(minItem({ word_id: 'word_bbb' }))}`;
    const { items, errors } = parseSenseIngestFile(text);
    expect(errors).toHaveLength(0);
    expect(items).toHaveLength(2);
  });

  it('skips blank lines', () => {
    const text = `\n${JSON.stringify(minItem())}\n\n`;
    const { items, errors } = parseSenseIngestFile(text);
    expect(errors).toHaveLength(0);
    expect(items).toHaveLength(1);
  });

  it('records an error for invalid JSON', () => {
    const { errors } = parseSenseIngestFile('not json');
    expect(errors).toHaveLength(1);
    expect(errors[0]!.message).toMatch(/invalid JSON/);
  });

  it('records an error for missing required fields', () => {
    const { errors } = parseSenseIngestFile(JSON.stringify({ word_id: 'x' }));
    expect(errors).toHaveLength(1);
    expect(errors[0]!.message).toMatch(/missing required fields/);
  });

  it('records an error for missing word_id', () => {
    const { errors } = parseSenseIngestFile(JSON.stringify({ senses: [] }));
    expect(errors).toHaveLength(1);
  });
});

// ─── ingestSenses ──────────────────────────────────────────────────────────

describe('ingestSenses', () => {
  it('writes sense + examples to DB', () => {
    const db = openMemoryContentDb();
    seedWord(db);

    const result = ingestSenses(db, [minItem()], { now: () => 1 });
    expect(result.wordsProcessed).toBe(1);
    expect(result.sensesWritten).toBe(1);
    expect(result.examplesWritten).toBe(2);

    const senses = db.prepare('SELECT * FROM word_senses').all() as WordSenseRow[];
    expect(senses).toHaveLength(1);
    expect(senses[0]!.word_id).toBe(WORD_ID);
    expect(senses[0]!.sense_index).toBe(0);
    expect(senses[0]!.short_gloss).toBe('a living thing that grows in soil');
    expect(senses[0]!.deleted_at).toBeNull();

    const examples = db.prepare('SELECT * FROM sense_examples ORDER BY example_index').all() as SenseExampleRow[];
    expect(examples).toHaveLength(2);
    expect(examples[0]!.text).toBe('She waters her plants every morning.');

    db.close();
  });

  it('assigns deterministic IDs', () => {
    const db = openMemoryContentDb();
    seedWord(db);
    ingestSenses(db, [minItem()], { now: () => 1 });

    const senses = db.prepare('SELECT * FROM word_senses').all() as WordSenseRow[];
    const expectedSenseId = makeSenseId(WORD_ID, 0);
    expect(senses[0]!.id).toBe(expectedSenseId);

    const examples = db.prepare('SELECT * FROM sense_examples ORDER BY example_index').all() as SenseExampleRow[];
    expect(examples[0]!.id).toBe(makeExampleId(expectedSenseId, 0));
    expect(examples[1]!.id).toBe(makeExampleId(expectedSenseId, 1));

    db.close();
  });

  it('is idempotent: re-ingesting replaces senses and examples', () => {
    const db = openMemoryContentDb();
    seedWord(db);

    ingestSenses(db, [minItem()], { now: () => 1 });
    // Re-ingest with updated content
    const updated = {
      ...minItem(),
      senses: [
        {
          ...minItem().senses[0]!,
          short_gloss: 'updated gloss',
          examples: [{ example_index: 0, text: 'Updated example sentence here.' }],
        },
      ],
    };
    ingestSenses(db, [updated], { now: () => 2 });

    const senses = db.prepare('SELECT * FROM word_senses WHERE deleted_at IS NULL').all() as WordSenseRow[];
    expect(senses).toHaveLength(1);
    expect(senses[0]!.short_gloss).toBe('updated gloss');

    const examples = db.prepare('SELECT * FROM sense_examples').all() as SenseExampleRow[];
    expect(examples).toHaveLength(1);
    expect(examples[0]!.text).toBe('Updated example sentence here.');

    db.close();
  });

  it('handles a multi-sense word', () => {
    const db = openMemoryContentDb();
    seedWord(db);

    const multiSense = {
      word_id: WORD_ID,
      senses: [
        {
          sense_index: 0,
          pos: 'noun',
          short_gloss: 'a living thing that grows in soil',
          explanation: 'A plant pulls water through roots and turns sunlight into energy.',
          examples: [{ example_index: 0, text: 'She waters her plants every morning.' }],
        },
        {
          sense_index: 1,
          pos: 'verb',
          short_gloss: 'to put a seed or plant into the ground',
          explanation: 'When you plant something, you give it a home in the earth and let it grow.',
          examples: [{ example_index: 0, text: 'They planted tomatoes every spring.' }],
        },
      ],
    };
    const result = ingestSenses(db, [multiSense], { now: () => 1 });
    expect(result.sensesWritten).toBe(2);
    expect(result.examplesWritten).toBe(2);

    const senses = db
      .prepare('SELECT * FROM word_senses ORDER BY sense_index')
      .all() as WordSenseRow[];
    expect(senses).toHaveLength(2);
    expect(senses[0]!.pos).toBe('noun');
    expect(senses[1]!.pos).toBe('verb');

    db.close();
  });

  it('cleans up old senses when re-ingesting (no orphaned examples)', () => {
    const db = openMemoryContentDb();
    seedWord(db);

    // First ingest: 2 senses
    const twoSenses = {
      word_id: WORD_ID,
      senses: [
        {
          sense_index: 0,
          pos: 'noun',
          short_gloss: 'gloss A',
          explanation: 'Felt explanation for sense A that is long enough to qualify.',
          examples: [{ example_index: 0, text: 'First example for sense A.' }],
        },
        {
          sense_index: 1,
          pos: 'verb',
          short_gloss: 'gloss B',
          explanation: 'Felt explanation for sense B that is long enough to qualify.',
          examples: [{ example_index: 0, text: 'First example for sense B.' }],
        },
      ],
    };
    ingestSenses(db, [twoSenses], { now: () => 1 });

    // Re-ingest with only 1 sense
    const oneSense = {
      word_id: WORD_ID,
      senses: [
        {
          sense_index: 0,
          pos: 'noun',
          short_gloss: 'gloss A revised',
          explanation: 'Updated felt explanation for sense A, still long enough to qualify.',
          examples: [{ example_index: 0, text: 'Updated example for sense A.' }],
        },
      ],
    };
    ingestSenses(db, [oneSense], { now: () => 2 });

    const senses = db.prepare('SELECT * FROM word_senses WHERE deleted_at IS NULL').all() as WordSenseRow[];
    expect(senses).toHaveLength(1);

    const examples = db.prepare('SELECT * FROM sense_examples').all() as SenseExampleRow[];
    expect(examples).toHaveLength(1);

    db.close();
  });

  it('returns wordsProcessed = 0 for empty input', () => {
    const db = openMemoryContentDb();
    const result = ingestSenses(db, [], { now: () => 1 });
    expect(result.wordsProcessed).toBe(0);
    expect(result.sensesWritten).toBe(0);
    db.close();
  });

  it('throws a descriptive error when word_id is not in the words table', () => {
    const db = openMemoryContentDb();
    // No seedWord — word_id does not exist.
    expect(() => ingestSenses(db, [minItem()], { now: () => 1 })).toThrow(
      /not found in words table/,
    );
    // No sense rows written (transaction rolled back).
    const senses = db.prepare('SELECT * FROM word_senses').all();
    expect(senses).toHaveLength(0);
    db.close();
  });
});
