import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  categorizeCommand,
  categorizeProgressPath,
  mergeCategorization,
} from '@/commands/categorize';
import {
  serializeMasterRecords,
  type MasterWord,
} from '@/commands/export-master';
import { readMasterRecords } from '@/commands/master-store';
import type { CategorizeProvider } from '@/providers/openaiCategorizeProvider';

const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

function masterWord(overrides: Partial<MasterWord> = {}): MasterWord {
  return {
    word: 'negotiate',
    pos: 'verb',
    categories: ['foundation'],
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

function writeMaster(records: MasterWord[]): string {
  const dir = mkdtempSync(join(tmpdir(), 'lexitap-cat-'));
  dirs.push(dir);
  const path = join(dir, 'words_master.jsonl');
  writeFileSync(path, serializeMasterRecords(records), 'utf8');
  return path;
}

/** Fake provider: returns canned CEFR + tiers keyed by word_id. */
function fakeProvider(map: Record<string, { cefr: string | null; tiers: string[] }>): CategorizeProvider {
  return {
    name: 'fake',
    classify: async (words) => {
      const items = new Map<string, { word_id: string; cefr: string | null; tiers: string[] }>();
      for (const w of words) {
        const c = map[w.word];
        if (c) items.set(w.id, { word_id: w.id, ...c });
      }
      return { items };
    },
  };
}

describe('mergeCategorization', () => {
  it('adds CEFR + tiers without dropping foundation, dedupes + sorts', () => {
    const rec = masterWord({ categories: ['foundation'] });
    const m = mergeCategorization(rec, 'B2', ['toefl', 'foundation', 'business']);
    expect(rec.categories).toEqual(['B2', 'business', 'foundation', 'toefl']);
    expect(m.cefrAdded).toBe(1);
    expect(m.tiersAdded).toBe(2); // toefl, business (foundation already present)
  });

  it('keeps existing CEFR when the model returns null', () => {
    const rec = masterWord({ categories: ['A2', 'foundation'] });
    mergeCategorization(rec, null, ['ielts']);
    expect(rec.categories).toEqual(['A2', 'foundation', 'ielts']);
  });

  it('counts a CEFR change', () => {
    const rec = masterWord({ categories: ['A2', 'foundation'] });
    const m = mergeCategorization(rec, 'B1', []);
    expect(rec.categories[0]).toBe('B1');
    expect(m.cefrChanged).toBe(1);
  });
});

describe('categorizeCommand', () => {
  it('merges model categories into the master file + writes a progress sidecar', async () => {
    const path = writeMaster([
      masterWord({ word: 'negotiate', frequency_rank: 1 }),
      masterWord({ word: 'cat', frequency_rank: 2, categories: ['foundation'] }),
    ]);
    await categorizeCommand(['--limit', '10', '--master', path], {
      providerFactory: () =>
        fakeProvider({
          negotiate: { cefr: 'B2', tiers: ['business', 'toefl'] },
          cat: { cefr: 'A1', tiers: ['common3k', 'common9k'] },
        }),
    });

    const recs = readMasterRecords(path);
    const negotiate = recs.find((r) => r.word === 'negotiate')!;
    expect(negotiate.categories).toEqual(['B2', 'business', 'foundation', 'toefl']);
    const cat = recs.find((r) => r.word === 'cat')!;
    expect(cat.categories).toEqual(['A1', 'common3k', 'common9k', 'foundation']);

    expect(existsSync(categorizeProgressPath(path))).toBe(true);
  });

  it('resumes: a second run skips already-done words', async () => {
    const path = writeMaster([masterWord({ word: 'negotiate', frequency_rank: 1 })]);
    const factory = () => fakeProvider({ negotiate: { cefr: 'B2', tiers: ['toefl'] } });
    await categorizeCommand(['--limit', '10', '--master', path], { providerFactory: factory });

    // Second run: nothing left — must NOT call the provider (would throw if it did).
    const throwing: CategorizeProvider = {
      name: 'throwing',
      classify: async () => {
        throw new Error('should not be called on resume');
      },
    };
    await expect(
      categorizeCommand(['--limit', '10', '--master', path], { providerFactory: () => throwing }),
    ).resolves.toBeUndefined();
  });

  it('dry-run writes nothing and constructs no provider', async () => {
    const path = writeMaster([masterWord({ word: 'negotiate' })]);
    const before = readFileSync(path, 'utf8');
    await categorizeCommand(['--limit', '10', '--master', path, '--dry-run'], {
      providerFactory: () => {
        throw new Error('provider must not be constructed in dry-run');
      },
    });
    expect(readFileSync(path, 'utf8')).toBe(before);
  });

  it('rejects a missing --limit and unknown flags', async () => {
    const path = writeMaster([masterWord()]);
    await expect(categorizeCommand(['--master', path], {})).rejects.toThrow(/requires --limit/);
    await expect(categorizeCommand(['--limit', '1', '--bogus', '--master', path], {})).rejects.toThrow(/unknown flag/);
  });
});
