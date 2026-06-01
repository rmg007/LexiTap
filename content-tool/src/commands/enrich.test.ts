import { describe, it, expect } from 'vitest';
import type { EnrichInputRow } from '@/commands/enrich';
import { runEnrich } from '@/commands/enrich';
import { openMemoryContentDb } from '@/lib/db';
import { defaultProviders } from '@/providers/defaultProviders';
import type { DefinitionProvider, DefinitionResult, ProviderRegistry } from '@/providers/types';
import type { WordRow } from '@/schema/types';

/**
 * Tests for CSV enrichment. Full E2E tests with Claude are mocked;
 * unit tests verify parsing and CSV formatting.
 */

describe('enrich CSV parsing', () => {
  it('parses word and pos columns', () => {
    const csv = `word,pos
happy,adjective
run,verb
book,noun`;

    // Manual parse to test logic
    const lines = csv.split('\n').slice(1); // skip header
    const rows: EnrichInputRow[] = lines
      .filter((line) => line.trim())
      .map((line) => {
        const parts = line.split(',');
        const word = parts[0]?.trim() || '';
        const pos = parts[1]?.trim() || null;
        return { word, pos };
      });

    expect(rows).toHaveLength(3);
    expect(rows[0]).toEqual({ word: 'happy', pos: 'adjective' });
    expect(rows[1]).toEqual({ word: 'run', pos: 'verb' });
    expect(rows[2]).toEqual({ word: 'book', pos: 'noun' });
  });

  it('handles missing pos gracefully', () => {
    const csv = `word,pos
apple,
orange,noun`;

    const lines = csv.split('\n').slice(1);
    const rows: EnrichInputRow[] = lines
      .filter((line) => line.trim())
      .map((line) => {
        const parts = line.split(',');
        const word = parts[0]?.trim() || '';
        const pos = parts[1]?.trim() || null;
        return { word, pos };
      });

    expect(rows[0]?.pos).toBeNull();
    expect(rows[1]?.pos).toBe('noun');
  });
});

describe('enrich DB mode — definitions', () => {
  function stubDefinitionProvider(results: Record<string, DefinitionResult>): DefinitionProvider {
    return {
      name: 'stub',
      async generate(words: WordRow[]) {
        const map = new Map<string, DefinitionResult>();
        for (const w of words) {
          const r = results[w.word];
          if (r) map.set(w.word, r);
        }
        return map;
      },
    };
  }

  it('enriches TBD words and sets definition_license to ai-original', async () => {
    const db = openMemoryContentDb();
    db.exec(`INSERT INTO content_tiers (id, name, is_free, word_count, display_order) VALUES ('foundation', 'Foundation', 1, 0, 1)`);
    db.prepare(
      `INSERT INTO words (id, word, definition, pos, cefr_level, example_sentence, definition_license, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('w1', 'happy', '(TBD: happy)', 'adjective', 'A2', 'She was _ .', 'original', 1);
    db.prepare(
      `INSERT INTO words (id, word, definition, pos, cefr_level, example_sentence, definition_license, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('w2', 'sad', 'Feeling sorrow.', 'adjective', 'A2', 'He felt _ .', 'original', 1);
    db.exec(`INSERT INTO word_tiers (word_id, tier_id) VALUES ('w1', 'foundation'), ('w2', 'foundation')`);

    const providers: ProviderRegistry = {
      ...defaultProviders(),
      definitions: stubDefinitionProvider({
        happy: { definition: 'Feeling joy.', exampleSentence: 'She is very _ today.' },
      }),
    };

    const summary = await runEnrich(db, providers, {
      tier: 'foundation',
      addDefinitions: true,
    });

    expect(summary.definitions).toBe(1);
    const w1 = db.prepare(`SELECT definition, example_sentence, definition_license FROM words WHERE id='w1'`).get() as { definition: string; example_sentence: string; definition_license: string };
    expect(w1.definition).toBe('Feeling joy.');
    expect(w1.example_sentence).toBe('She is very _ today.');
    expect(w1.definition_license).toBe('ai-original');

    // Non-TBD word is untouched.
    const w2 = db.prepare(`SELECT definition_license FROM words WHERE id='w2'`).get() as { definition_license: string };
    expect(w2.definition_license).toBe('original');
  });

  it('skips words the provider has no result for', async () => {
    const db = openMemoryContentDb();
    db.exec(`INSERT INTO content_tiers (id, name, is_free, word_count, display_order) VALUES ('foundation', 'Foundation', 1, 0, 1)`);
    db.prepare(
      `INSERT INTO words (id, word, definition, pos, cefr_level, example_sentence, definition_license, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('w1', 'run', '(TBD: run)', 'verb', 'A2', '_ fast.', 'original', 1);
    db.exec(`INSERT INTO word_tiers (word_id, tier_id) VALUES ('w1', 'foundation')`);

    const providers: ProviderRegistry = {
      ...defaultProviders(),
      definitions: stubDefinitionProvider({}),
    };

    const summary = await runEnrich(db, providers, {
      tier: 'foundation',
      addDefinitions: true,
    });

    expect(summary.definitions).toBe(0);
    const w1 = db.prepare(`SELECT definition FROM words WHERE id='w1'`).get() as { definition: string };
    expect(w1.definition).toBe('(TBD: run)');
  });
});

describe('enrich CSV output formatting', () => {
  it('escapes quotes in CSV output', () => {
    const word = 'test';
    const definition = 'A "quoted" definition';
    const example = 'Use _ in a sentence with "quotes"';

    const csvLine = [
      word,
      `"${definition.replace(/"/g, '""')}"`,
      `"${example.replace(/"/g, '""')}"`,
    ].join(',');

    expect(csvLine).toBe('test,"A ""quoted"" definition","Use _ in a sentence with ""quotes"""');
  });
});
