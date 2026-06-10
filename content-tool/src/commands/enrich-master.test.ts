import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  enrichMasterCommand,
  enrichSkipPath,
  validateEnrichItem,
  toSenseIngestItem,
} from '@/commands/enrich-master';
import { serializeMasterRecords, type MasterWord } from '@/commands/export-master';
import { readMasterRecords } from '@/commands/master-store';
import type { WordRow } from '@/schema/types';
import type {
  SenseQuestionProvider,
  MasterEnrichItem,
} from '@/providers/openaiSenseQuestionProvider';

const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

function masterWord(overrides: Partial<MasterWord> = {}): MasterWord {
  return {
    word: 'negotiate',
    pos: 'verb',
    categories: ['B2', 'foundation'],
    reviewed: false,
    definition: 'To discuss to reach agreement.',
    example_sentence: 'They met to _ the deal.',
    frequency_rank: 100,
    word_type: 'vocabulary',
    difficulty: null,
    theme: null,
    synonyms: [],
    antonyms: [],
    usage_notes: null,
    image_path: null,
    audio_path: null,
    senses: [],
    questions: [],
    ...overrides,
  };
}

function fullEnrich(wordId: string, word: string): MasterEnrichItem {
  return {
    word_id: wordId,
    word,
    senses: [
      {
        sense_index: 0,
        pos: 'verb',
        short_gloss: 'discuss to agree',
        explanation: 'When you negotiate you go back and forth until both sides accept a deal.',
        image_path: null,
        examples: ['The union negotiated a raise.', 'She negotiated the price down.'],
      },
    ],
    questions: [
      { question_index: 0, type: 'multiple_choice', prompt: 'Which is right?', correct: 'They negotiated a deal.', distractors: ['a', 'b', 'c'], hint: 'two sides', explanation: 'agreement', reviewed: false },
      { question_index: 1, type: 'definition_match', prompt: word, correct: 'to discuss to agree', distractors: ['x', 'y', 'z'], hint: null, explanation: 'def', reviewed: false },
      { question_index: 2, type: 'fill_blank', prompt: 'They met to ___ a deal.', correct: word, distractors: ['cancel', 'ignore', 'sleep'], hint: null, explanation: 'fill', reviewed: false },
      { question_index: 3, type: 'sentence_order', prompt: 'Arrange:', correct: 'She negotiated a better price.', distractors: [], hint: null, explanation: 'order', reviewed: false },
      { question_index: 4, type: 'true_false', prompt: 'It means to force.', correct: 'False', distractors: ['True'], hint: null, explanation: 'tf', reviewed: false },
    ],
  };
}

function writeMaster(records: MasterWord[]): string {
  const dir = mkdtempSync(join(tmpdir(), 'lexitap-enr-'));
  dirs.push(dir);
  const path = join(dir, 'words_master.jsonl');
  writeFileSync(path, serializeMasterRecords(records), 'utf8');
  return path;
}

function fakeProvider(opts: {
  items?: Record<string, MasterEnrichItem>;
  skip?: { word: string; reason: string }[];
}): SenseQuestionProvider {
  return {
    name: 'fake',
    generate: async (words: WordRow[]) => {
      const items = new Map<string, MasterEnrichItem>();
      for (const w of words) {
        const it = opts.items?.[w.word];
        if (it) items.set(w.id, { ...it, word_id: w.id });
      }
      const skipped = (opts.skip ?? [])
        .map((s) => {
          const w = words.find((x) => x.word === s.word);
          return w ? { word_id: w.id, word: s.word, reason: s.reason } : null;
        })
        .filter((x): x is { word_id: string; word: string; reason: string } => x !== null);
      return { items, skipped };
    },
  };
}

function wordRow(word: string): WordRow {
  return {
    id: 'word_x',
    word,
    definition: 'd',
    pos: 'verb',
    cefr_level: null,
    grade_level: null,
    word_type: null,
    difficulty: null,
    frequency_rank: null,
    theme: null,
    example_sentence: 'The _ is here.',
    image_path: null,
    audio_path: null,
    synonyms: null,
    antonyms: null,
    usage_notes: null,
    definition_license: 'original',
    reviewed: 0,
    created_at: 0,
    deleted_at: null,
  };
}

describe('validateEnrichItem', () => {
  it('accepts a full valid item', () => {
    expect(validateEnrichItem(fullEnrich('word_x', 'negotiate'), wordRow('negotiate')).ok).toBe(true);
  });

  it('rejects a word-identity mismatch', () => {
    const v = validateEnrichItem(fullEnrich('word_x', 'banana'), wordRow('negotiate'));
    expect(v.ok).toBe(false);
    expect(v.reason).toMatch(/!= batch word/);
  });

  it('rejects when questions != 5', () => {
    const item = fullEnrich('word_x', 'negotiate');
    item.questions = item.questions.slice(0, 3);
    const v = validateEnrichItem(item, wordRow('negotiate'));
    expect(v.ok).toBe(false);
    expect(v.reason).toMatch(/expected exactly 5/);
  });

  it('rejects an example containing a cloze blank', () => {
    const item = fullEnrich('word_x', 'negotiate');
    item.senses[0]!.examples = ['They met to _ the deal.'];
    const v = validateEnrichItem(item, wordRow('negotiate'));
    expect(v.ok).toBe(false);
    expect(v.reason).toMatch(/senses:/);
  });

  it('toSenseIngestItem numbers examples 0-based', () => {
    const s = toSenseIngestItem(fullEnrich('word_x', 'negotiate'));
    expect(s.senses[0]!.examples.map((e) => e.example_index)).toEqual([0, 1]);
  });
});

describe('enrichMasterCommand', () => {
  it('writes senses + 5 questions back into the master file', async () => {
    const path = writeMaster([masterWord({ word: 'negotiate', frequency_rank: 1 })]);
    await enrichMasterCommand(['--limit', '5', '--master', path], {
      providerFactory: () => fakeProvider({ items: { negotiate: fullEnrich('x', 'negotiate') } }),
    });
    const rec = readMasterRecords(path).find((r) => r.word === 'negotiate')!;
    expect(rec.senses).toHaveLength(1);
    expect(rec.questions).toHaveLength(5);
    expect(rec.questions[4]!.type).toBe('true_false');
  });

  it('drops an invalid item (does not write partial content)', async () => {
    const bad = fullEnrich('x', 'negotiate');
    bad.questions = bad.questions.slice(0, 2); // fails the 5-count rule
    const path = writeMaster([masterWord({ word: 'negotiate' })]);
    await enrichMasterCommand(['--limit', '5', '--master', path], {
      providerFactory: () => fakeProvider({ items: { negotiate: bad } }),
    });
    const rec = readMasterRecords(path).find((r) => r.word === 'negotiate')!;
    expect(rec.senses).toHaveLength(0);
    expect(rec.questions).toHaveLength(0);
  });

  it('persists content skips and excludes them on resume', async () => {
    const path = writeMaster([masterWord({ word: 'davis', frequency_rank: 1 })]);
    await enrichMasterCommand(['--limit', '5', '--master', path], {
      providerFactory: () => fakeProvider({ skip: [{ word: 'davis', reason: 'proper noun (surname)' }] }),
    });
    expect(existsSync(enrichSkipPath(path))).toBe(true);

    // Resume: davis is content-skipped → not re-selected → provider must not run.
    const throwing: SenseQuestionProvider = {
      name: 't',
      generate: async () => {
        throw new Error('should not be called on resume');
      },
    };
    await expect(
      enrichMasterCommand(['--limit', '5', '--master', path], { providerFactory: () => throwing }),
    ).resolves.toBeUndefined();
  });

  it('does not re-select words that already have senses', async () => {
    const enriched = masterWord({
      word: 'negotiate',
      senses: [{ sense_index: 0, pos: 'verb', short_gloss: 'g', explanation: 'e', image_path: null, examples: ['One.'] }],
    });
    const path = writeMaster([enriched]);
    const throwing: SenseQuestionProvider = {
      name: 't',
      generate: async () => {
        throw new Error('should not be called — word already has senses');
      },
    };
    await expect(
      enrichMasterCommand(['--limit', '5', '--master', path], { providerFactory: () => throwing }),
    ).resolves.toBeUndefined();
  });

  it('dry-run writes nothing', async () => {
    const path = writeMaster([masterWord({ word: 'negotiate' })]);
    const before = readFileSync(path, 'utf8');
    await enrichMasterCommand(['--limit', '5', '--master', path, '--dry-run'], {
      providerFactory: () => {
        throw new Error('no provider in dry-run');
      },
    });
    expect(readFileSync(path, 'utf8')).toBe(before);
  });

  it('rejects a missing --limit and unknown flags', async () => {
    const path = writeMaster([masterWord()]);
    await expect(enrichMasterCommand(['--master', path], {})).rejects.toThrow(/requires --limit/);
    await expect(enrichMasterCommand(['--limit', '1', '--nope', '--master', path], {})).rejects.toThrow(/unknown flag/);
  });
});
