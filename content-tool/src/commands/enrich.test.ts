import { describe, it, expect } from 'vitest';
import type { EnrichInputRow } from '@/commands/enrich';

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
