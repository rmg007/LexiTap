import { describe, it, expect } from 'vitest';
import { runReleasePipeline } from '@/commands/release';
import { importRows } from '@/commands/import';
import { runEnrich } from '@/commands/enrich';
import { defaultProviders } from '@/providers/defaultProviders';
import { openMemoryContentDb } from '@/lib/db';
import type { AppConfig } from '@/lib/config';
import type { ParsedInputRow } from '@/lib/csv';

const config: AppConfig = {
  app_id: 'lexitap',
  tiers: [
    {
      slug: 'foundation',
      name: 'Foundation',
      description: 'free tier',
      is_free: true,
      sku: null,
      display_order: 1,
      requires_theme: true,
      audio: false,
    },
  ],
};

function parsed(word: string, overrides: Partial<ParsedInputRow> = {}): ParsedInputRow {
  return {
    word,
    definition: `meaning of ${word}`,
    example_sentence: `Use _ in a sentence.`,
    pos: 'noun',
    cefr_level: 'A2',
    theme: 'Daily Life',
    difficulty: 2,
    word_type: 'vocabulary',
    synonyms: null,
    antonyms: null,
    usage_notes: null,
    ...overrides,
  };
}

function seed(rows: ParsedInputRow[]) {
  const working = openMemoryContentDb();
  importRows(working, rows, { tier: 'foundation', onConflict: 'update', now: () => 1 });
  return working;
}

describe('runReleasePipeline (C8 fail-closed)', () => {
  it('copies the DB only after a clean strict validate + export', () => {
    const working = seed([parsed('alpha'), parsed('beta')]);
    const output = openMemoryContentDb();
    let copyCalls = 0;

    const result = runReleasePipeline(
      working,
      output,
      config,
      { bump: 'patch', copy: true, priorVersion: 10200 },
      () => {
        copyCalls += 1;
      },
    );

    expect(result.copied).toBe(true);
    expect(copyCalls).toBe(1);
    expect(result.userVersion).toBe(10201);
    expect(result.totalWords).toBe(2);

    working.close();
    output.close();
  });

  it('a failing strict validate ABORTS the chain and never copies', () => {
    // Missing theme on a foundation word -> strict (and non-strict) error.
    const working = seed([parsed('orphan', { theme: null })]);
    const output = openMemoryContentDb();
    let copyCalls = 0;

    expect(() =>
      runReleasePipeline(
        working,
        output,
        config,
        { bump: 'patch', copy: true, priorVersion: 0 },
        () => {
          copyCalls += 1;
        },
      ),
    ).toThrow(/release aborted: validate --strict/);

    // Fail-closed: the copy callback must NOT have run.
    expect(copyCalls).toBe(0);

    working.close();
    output.close();
  });

  it('a strict-only error (dup-leak) also aborts and never copies', () => {
    // Example sentence leaks the answer word: passes non-strict, fails strict.
    const working = seed([parsed('alpha', { example_sentence: 'I see alpha and _ here.' })]);
    const output = openMemoryContentDb();
    let copyCalls = 0;

    expect(() =>
      runReleasePipeline(
        working,
        output,
        config,
        { bump: 'patch', copy: true, priorVersion: 0 },
        () => {
          copyCalls += 1;
        },
      ),
    ).toThrow(/release aborted/);
    expect(copyCalls).toBe(0);

    working.close();
    output.close();
  });

  it('--no-copy builds + validates but skips the copy', async () => {
    const working = seed([parsed('alpha')]);
    await runEnrich(working, defaultProviders(), {
      tier: 'foundation',
      addSynonyms: true,
      addAudio: false,
      addImages: false,
      force: false,
    });
    const output = openMemoryContentDb();
    let copyCalls = 0;

    const result = runReleasePipeline(
      working,
      output,
      config,
      { bump: 'patch', copy: false, priorVersion: 0 },
      () => {
        copyCalls += 1;
      },
    );

    expect(result.copied).toBe(false);
    expect(copyCalls).toBe(0);

    working.close();
    output.close();
  });
});
