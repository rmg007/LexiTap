import { describe, it, expect } from 'vitest';
import { buildOutputDb, computeUserVersion } from '@/commands/export';
import { importRows } from '@/commands/import';
import { runEnrich } from '@/commands/enrich';
import { defaultProviders } from '@/providers/defaultProviders';
import { openMemoryContentDb } from '@/lib/db';
import type { AppConfig } from '@/lib/config';
import type { ParsedInputRow } from '@/lib/csv';
import type { TierRow, WordRow } from '@/schema/types';

const config: AppConfig = {
  app_id: 'lexitap',
  tiers: [
    {
      slug: 'foundation',
      name: 'Foundation',
      description: 'free tier',
      is_free: true,
      price_usd: null,
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
      price_usd: 14.99,
      sku: 'com.lexitap.toefl',
      display_order: 2,
      requires_theme: false,
      audio: true,
    },
  ],
};

function parsed(word: string, theme: string | null = 'Daily Life'): ParsedInputRow {
  return {
    word,
    definition: `meaning of ${word}`,
    example_sentence: `Use _ in a sentence.`,
    pos: 'noun',
    cefr_level: 'A2',
    theme,
    difficulty: 2,
    word_type: 'vocabulary',
    synonyms: null,
    antonyms: null,
    usage_notes: null,
  };
}

function seedWorking() {
  const working = openMemoryContentDb();
  importRows(working, [parsed('alpha'), parsed('beta'), parsed('gamma')], {
    tier: 'foundation',
    defaultType: 'vocabulary',
    onConflict: 'update',
    now: () => 1,
  });
  importRows(working, [parsed('delta', null)], {
    tier: 'toefl',
    defaultType: 'vocabulary',
    onConflict: 'update',
    now: () => 1,
  });
  return working;
}

describe('computeUserVersion', () => {
  it('bumps patch/minor/major correctly', () => {
    expect(computeUserVersion(0, 'patch')).toBe(1);
    expect(computeUserVersion(10200, 'patch')).toBe(10201);
    expect(computeUserVersion(10200, 'minor')).toBe(10300);
    expect(computeUserVersion(10200, 'major')).toBe(20000);
  });
});

describe('buildOutputDb (export smoke test)', () => {
  it('creates schema, indexes, user_version, and observed word_count', async () => {
    const working = seedWorking();
    const output = openMemoryContentDb();

    const result = buildOutputDb(working, output, config, 10201);

    // user_version set
    expect(Number(output.pragma('user_version', { simple: true }))).toBe(10201);

    // tables exist
    const tables = (
      output.prepare(`SELECT name FROM sqlite_master WHERE type='table'`).all() as {
        name: string;
      }[]
    ).map((t) => t.name);
    expect(tables).toContain('content_tiers');
    expect(tables).toContain('words');

    // indexes exist
    const indexes = (
      output.prepare(`SELECT name FROM sqlite_master WHERE type='index'`).all() as {
        name: string;
      }[]
    ).map((i) => i.name);
    expect(indexes).toContain('idx_words_tier');
    expect(indexes).toContain('idx_words_cefr');
    expect(indexes).toContain('idx_words_active');

    // word_count matches actual rows per tier
    const foundationCount = (
      output.prepare(`SELECT word_count FROM content_tiers WHERE id='foundation'`).get() as TierRow
    ).word_count;
    const actualFoundation = (
      output.prepare(`SELECT COUNT(*) AS n FROM words WHERE tier_id='foundation'`).get() as {
        n: number;
      }
    ).n;
    expect(foundationCount).toBe(3);
    expect(foundationCount).toBe(actualFoundation);
    expect(result.tierCounts['toefl']).toBe(1);

    working.close();
    output.close();
  });

  it('aborts when working data has a validation error', () => {
    const working = openMemoryContentDb();
    // foundation row missing theme -> validation error
    importRows(working, [parsed('orphan', null)], {
      tier: 'foundation',
      defaultType: 'vocabulary',
      onConflict: 'update',
      now: () => 1,
    });
    const output = openMemoryContentDb();
    expect(() => buildOutputDb(working, output, config, 1)).toThrow(/validation error/);
    working.close();
    output.close();
  });

  it('assigns audio paths for audio tiers via offline enrich, persisted to output', async () => {
    const working = seedWorking();
    await runEnrich(working, defaultProviders(), {
      tier: 'toefl',
      addSynonyms: true,
      addAudio: true,
      addImages: false,
      force: false,
    });
    const output = openMemoryContentDb();
    buildOutputDb(working, output, config, 1);
    const toeflRow = output
      .prepare(`SELECT * FROM words WHERE tier_id='toefl'`)
      .get() as WordRow;
    expect(toeflRow.audio_path).toMatch(/^assets\/audio\/.*\.mp3$/);
    expect(toeflRow.synonyms).toBe('[]');
    working.close();
    output.close();
  });
});
