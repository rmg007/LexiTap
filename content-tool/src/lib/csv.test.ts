import { describe, it, expect } from 'vitest';
import { parseCsv, parseJson, parseByExtension } from '@/lib/csv';

const CSV = `word,definition,pos,cefr_level,theme,example_sentence,difficulty,word_type
borrow,To take and return later,verb,A2,Daily Life,Can I _ your pen?,2,vocabulary
"weather","The sky, and air",noun,A2,Nature & Environment,The _ is sunny.,,vocabulary
,no word here,noun,A2,Daily Life,A _ thing.,3,vocabulary`;

describe('parseCsv', () => {
  it('maps named columns to ParsedInputRow', () => {
    const { rows } = parseCsv(CSV);
    expect(rows).toHaveLength(2);
    const first = rows[0]!;
    expect(first.word).toBe('borrow');
    expect(first.pos).toBe('verb');
    expect(first.difficulty).toBe(2);
    expect(first.word_type).toBe('vocabulary');
    expect(first.synonyms).toBeNull();
  });

  it('handles quoted fields containing commas', () => {
    const { rows } = parseCsv(CSV);
    expect(rows[1]!.definition).toBe('The sky, and air');
  });

  it('defaults difficulty to 3 when absent', () => {
    const { rows } = parseCsv(CSV);
    expect(rows[1]!.difficulty).toBe(3);
  });

  it('skips rows missing a required field and reports them', () => {
    const { rows, skipped } = parseCsv(CSV);
    expect(rows).toHaveLength(2);
    expect(skipped).toHaveLength(1);
    expect(skipped[0]!.reason).toMatch(/word/);
  });

  it('applies the default word_type for rows lacking the column', () => {
    const csv = `word,definition,example_sentence\nx,def,a _ b`;
    const { rows } = parseCsv(csv, 'idiom');
    expect(rows[0]!.word_type).toBe('idiom');
  });

  it('parses frequency_rank when present (DIAG-A PA-1) and null otherwise', () => {
    const csv = `word,definition,example_sentence,frequency_rank
the,article,_ cat,1
rareword,obscure,a _ thing,`;
    const { rows } = parseCsv(csv);
    expect(rows[0]!.frequency_rank).toBe(1);
    expect(rows[1]!.frequency_rank).toBeNull();
  });

  it('treats a non-positive or non-numeric frequency_rank as null', () => {
    const csv = `word,definition,example_sentence,frequency_rank
a,def,_ x,0
b,def,_ y,abc`;
    const { rows } = parseCsv(csv);
    expect(rows[0]!.frequency_rank).toBeNull();
    expect(rows[1]!.frequency_rank).toBeNull();
  });
});

describe('parseJson', () => {
  it('stores synonyms/antonyms arrays directly', () => {
    const json = JSON.stringify([
      {
        word: 'break the ice',
        definition: 'To make people relax socially',
        word_type: 'idiom',
        example_sentence: 'She told a joke to _ at the meeting.',
        synonyms: ['loosen up'],
        antonyms: [],
      },
    ]);
    const { rows } = parseJson(json);
    expect(rows[0]!.synonyms).toEqual(['loosen up']);
    expect(rows[0]!.antonyms).toEqual([]);
    expect(rows[0]!.word_type).toBe('idiom');
  });

  it('throws on non-array JSON', () => {
    expect(() => parseJson('{}')).toThrow();
  });
});

describe('parseByExtension', () => {
  it('rejects unsupported extensions', () => {
    expect(() => parseByExtension('foo.txt', 'x')).toThrow(/Unsupported/);
  });
});
