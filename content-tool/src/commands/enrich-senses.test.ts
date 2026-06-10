import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  selectWordsForSenseEnrichment,
  readResumeWordIds,
  runEnrichSenses,
  enrichSensesCommand,
  estimateSenseEnrichmentCostUsd,
  EST_INPUT_TOKENS_PER_WORD,
  EST_OUTPUT_TOKENS_PER_WORD,
  MODEL_PRICES_USD_PER_MTOK,
} from '@/commands/enrich-senses';
import { parseSenseIngestFile, type SenseIngestItem } from '@/commands/ingest-senses';
import { serializeSenseIngestFile } from '@/commands/synthesize-senses';
import { openMemoryContentDb } from '@/lib/db';
import { makeSenseId } from '@/lib/ids';
import type { DB } from '@/lib/db';
import type { WordRow } from '@/schema/types';
import type { SenseProvider, SenseGenerationResult } from '@/providers/types';

// ─── fixtures ──────────────────────────────────────────────────────────────

function seedWord(
  db: DB,
  id: string,
  word: string,
  frequencyRank: number | null,
  tier = 'foundation',
): void {
  db.prepare(
    `INSERT INTO words (id, word, definition, pos, cefr_level, frequency_rank, example_sentence, definition_license, created_at)
     VALUES (?, ?, ?, 'noun', 'A2', ?, ?, 'original', 1)`,
  ).run(id, word, `A definition of ${word}.`, frequencyRank, `She used the _ today.`);
  db.prepare(`INSERT INTO word_tiers (word_id, tier_id) VALUES (?, ?)`).run(id, tier);
}

function seedSense(db: DB, wordId: string, deleted = false): void {
  db.prepare(
    `INSERT INTO word_senses (id, word_id, sense_index, pos, short_gloss, explanation, image_path, created_at, deleted_at)
     VALUES (?, ?, 0, 'noun', 'gloss', 'A felt explanation that differs from the gloss.', NULL, 1, ?)`,
  ).run(makeSenseId(wordId, 0), wordId, deleted ? 99 : null);
}

function validItem(wordId: string, word: string): SenseIngestItem {
  return {
    word_id: wordId,
    word,
    senses: [
      {
        sense_index: 0,
        pos: 'noun',
        short_gloss: `a one-line gloss for ${word}`,
        explanation: `A felt teaching explanation for ${word}. It is concrete and plain, and it differs from the gloss.`,
        image_path: null,
        examples: [
          { example_index: 0, text: `Everyone talked about the ${word} all afternoon.` },
          { example_index: 1, text: `She wrote a story about a ${word} last year.` },
        ],
      },
    ],
  };
}

function fakeProvider(
  fn: (words: WordRow[]) => SenseGenerationResult,
  calls?: WordRow[][],
): SenseProvider {
  return {
    name: 'fake',
    async generate(words: WordRow[]) {
      calls?.push(words);
      return fn(words);
    },
  };
}

let tmpDir: string;
beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'enrich-senses-'));
});
afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

// ─── selection ─────────────────────────────────────────────────────────────

describe('selectWordsForSenseEnrichment', () => {
  it('orders by frequency_rank ASC with NULLs last and applies limit', () => {
    const db = openMemoryContentDb();
    seedWord(db, 'w_null', 'zebra', null);
    seedWord(db, 'w_300', 'cat', 300);
    seedWord(db, 'w_10', 'the', 10);
    seedWord(db, 'w_50', 'house', 50);

    const all = selectWordsForSenseEnrichment(db, { limit: 10 });
    expect(all.map((w) => w.id)).toEqual(['w_10', 'w_50', 'w_300', 'w_null']);

    const limited = selectWordsForSenseEnrichment(db, { limit: 2 });
    expect(limited.map((w) => w.id)).toEqual(['w_10', 'w_50']);
  });

  it('excludes words that already have non-deleted senses (deleted senses do not exclude)', () => {
    const db = openMemoryContentDb();
    seedWord(db, 'w_a', 'apple', 1);
    seedWord(db, 'w_b', 'bird', 2);
    seedWord(db, 'w_c', 'coat', 3);
    seedSense(db, 'w_a'); // active sense → excluded
    seedSense(db, 'w_c', true); // soft-deleted sense → still eligible

    const rows = selectWordsForSenseEnrichment(db, { limit: 10 });
    expect(rows.map((w) => w.id)).toEqual(['w_b', 'w_c']);
  });

  it('filters to the given tier via the word↔tier junction', () => {
    const db = openMemoryContentDb();
    seedWord(db, 'w_f', 'foundationword', 1, 'foundation');
    seedWord(db, 'w_t', 'toeflword', 2, 'toefl');

    const rows = selectWordsForSenseEnrichment(db, { limit: 10, tier: 'toefl' });
    expect(rows.map((w) => w.id)).toEqual(['w_t']);
  });

  it('excludes word_ids from the exclude set (resume)', () => {
    const db = openMemoryContentDb();
    seedWord(db, 'w_1', 'one', 1);
    seedWord(db, 'w_2', 'two', 2);
    seedWord(db, 'w_3', 'three', 3);

    const rows = selectWordsForSenseEnrichment(db, {
      limit: 2,
      excludeWordIds: new Set(['w_1']),
    });
    // limit applies AFTER exclusion — w_2 and w_3 both selected
    expect(rows.map((w) => w.id)).toEqual(['w_2', 'w_3']);
  });
});

// ─── resume file parsing ───────────────────────────────────────────────────

describe('readResumeWordIds', () => {
  it('returns empty set when the file does not exist', () => {
    expect(readResumeWordIds(join(tmpDir, 'missing.jsonl')).size).toBe(0);
  });

  it('parses word_ids from an existing output file', () => {
    const path = join(tmpDir, 'out.jsonl');
    writeFileSync(path, serializeSenseIngestFile([validItem('word_aaa', 'apple'), validItem('word_bbb', 'bird')]));
    const ids = readResumeWordIds(path);
    expect(ids).toEqual(new Set(['word_aaa', 'word_bbb']));
  });
});

// ─── cost estimate ─────────────────────────────────────────────────────────

describe('estimateSenseEnrichmentCostUsd', () => {
  it('computes count × (in-tokens × in-price + out-tokens × out-price) / 1M', () => {
    const opus = MODEL_PRICES_USD_PER_MTOK['claude-opus-4-8']!;
    const expected =
      (300 * (EST_INPUT_TOKENS_PER_WORD * opus.input + EST_OUTPUT_TOKENS_PER_WORD * opus.output)) / 1_000_000;
    expect(estimateSenseEnrichmentCostUsd(300, 'claude-opus-4-8')).toBeCloseTo(expected, 10);
    // sanity: 300 words on opus ≈ $7.58 with the current constants
    expect(estimateSenseEnrichmentCostUsd(300, 'claude-opus-4-8')).toBeCloseTo(7.575, 3);
  });

  it('sonnet is cheaper than opus; unknown models priced as opus', () => {
    const sonnet = estimateSenseEnrichmentCostUsd(100, 'claude-sonnet-4-6');
    const opus = estimateSenseEnrichmentCostUsd(100, 'claude-opus-4-8');
    expect(sonnet).toBeLessThan(opus);
    expect(estimateSenseEnrichmentCostUsd(100, 'some-future-model')).toBeCloseTo(opus, 10);
  });
});

// ─── core run: validate + append ───────────────────────────────────────────

describe('runEnrichSenses', () => {
  it('appends valid items, drops invalid items, counts model skips', async () => {
    const db = openMemoryContentDb();
    seedWord(db, 'word_v', 'valid', 1);
    seedWord(db, 'word_i', 'invalid', 2);
    seedWord(db, 'word_s', 'skippy', 3);
    const words = selectWordsForSenseEnrichment(db, { limit: 10 });

    const invalid = validItem('word_i', 'invalid');
    // V9 violation: a "_" cloze blank in a teaching example
    invalid.senses[0]!.examples[0]!.text = 'She used the _ yesterday.';

    const provider = fakeProvider(() => ({
      items: new Map([
        ['word_v', validItem('word_v', 'valid')],
        ['word_i', invalid],
      ]),
      skipped: [{ word_id: 'word_s', word: 'skippy', reason: 'proper noun (surname)' }],
    }));

    const outputPath = join(tmpDir, 'out.jsonl');
    const summary = await runEnrichSenses(provider, { words, outputPath });

    expect(summary.enriched).toBe(1);
    expect(summary.invalidDropped).toBe(1);
    expect(summary.skippedByModel).toBe(1);
    expect(summary.batches).toBe(1);

    const { items, errors } = parseSenseIngestFile(readFileSync(outputPath, 'utf8'));
    expect(errors).toHaveLength(0);
    expect(items).toHaveLength(1);
    expect(items[0]!.word_id).toBe('word_v');
  });

  it('appends per batch and the output round-trips through parseSenseIngestFile', async () => {
    const db = openMemoryContentDb();
    // 10 words → 2 batches of 8 + 2
    for (let i = 0; i < 10; i++) seedWord(db, `word_${i}`, `word${i}`, i + 1);
    const words = selectWordsForSenseEnrichment(db, { limit: 10 });

    const calls: WordRow[][] = [];
    const provider = fakeProvider(
      (batch) => ({
        items: new Map(batch.map((w) => [w.id, validItem(w.id, w.word)])),
        skipped: [],
      }),
      calls,
    );

    const outputPath = join(tmpDir, 'out.jsonl');
    const summary = await runEnrichSenses(provider, { words, outputPath });

    expect(summary.batches).toBe(2);
    expect(calls.map((c) => c.length)).toEqual([8, 2]);
    expect(summary.enriched).toBe(10);

    const { items, errors } = parseSenseIngestFile(readFileSync(outputPath, 'utf8'));
    expect(errors).toHaveLength(0);
    expect(items.map((i) => i.word_id)).toEqual(words.map((w) => w.id));
  });
});

// ─── command: guards, dry-run, resume round-trip ───────────────────────────

describe('enrichSensesCommand', () => {
  it('refuses to run without --limit', async () => {
    await expect(enrichSensesCommand([])).rejects.toThrow(/--limit/);
    await expect(enrichSensesCommand(['--dry-run'])).rejects.toThrow(/--limit/);
  });

  it('rejects a non-positive or non-numeric --limit', async () => {
    await expect(enrichSensesCommand(['--limit', '0'])).rejects.toThrow(/positive integer/);
    await expect(enrichSensesCommand(['--limit', 'lots'])).rejects.toThrow(/positive integer/);
  });

  it('dry-run never constructs the provider (works with no API key)', async () => {
    const db = openMemoryContentDb();
    seedWord(db, 'word_x', 'example', 1);
    const outputPath = join(tmpDir, 'out.jsonl');

    await enrichSensesCommand(['--limit', '5', '--dry-run', '--output', outputPath], {
      openDb: () => db,
      providerFactory: () => {
        throw new Error('provider must NOT be constructed in dry-run');
      },
    });

    expect(existsSync(outputPath)).toBe(false); // nothing written
  });

  it('live run appends, then a re-run resumes (skips already-enriched word_ids)', async () => {
    const outputPath = join(tmpDir, 'out.jsonl');
    const calls: WordRow[][] = [];
    const deps = {
      openDb: () => {
        const db = openMemoryContentDb();
        seedWord(db, 'word_1', 'one', 1);
        seedWord(db, 'word_2', 'two', 2);
        return db;
      },
      providerFactory: () =>
        fakeProvider(
          (batch) => ({
            items: new Map(batch.map((w) => [w.id, validItem(w.id, w.word)])),
            skipped: [],
          }),
          calls,
        ),
    };

    // First run: limit 1 → only word_1 enriched.
    await enrichSensesCommand(['--limit', '1', '--output', outputPath], deps);
    expect(readResumeWordIds(outputPath)).toEqual(new Set(['word_1']));

    // Second run: word_1 excluded by resume → word_2 enriched, appended.
    await enrichSensesCommand(['--limit', '1', '--output', outputPath], deps);
    const { items, errors } = parseSenseIngestFile(readFileSync(outputPath, 'utf8'));
    expect(errors).toHaveLength(0);
    expect(items.map((i) => i.word_id)).toEqual(['word_1', 'word_2']);
    expect(calls.flat().map((w) => w.id)).toEqual(['word_1', 'word_2']);
  });

  it('--no-resume truncates the output file and re-enriches from scratch', async () => {
    const outputPath = join(tmpDir, 'out.jsonl');
    writeFileSync(outputPath, serializeSenseIngestFile([validItem('word_1', 'one')]));

    const deps = {
      openDb: () => {
        const db = openMemoryContentDb();
        seedWord(db, 'word_1', 'one', 1);
        return db;
      },
      providerFactory: () =>
        fakeProvider((batch) => ({
          items: new Map(batch.map((w) => [w.id, validItem(w.id, w.word)])),
          skipped: [],
        })),
    };

    await enrichSensesCommand(['--limit', '5', '--output', outputPath, '--no-resume'], deps);
    const { items } = parseSenseIngestFile(readFileSync(outputPath, 'utf8'));
    expect(items.map((i) => i.word_id)).toEqual(['word_1']); // fresh file, single entry
  });

  it('rejects an unknown tier', async () => {
    await expect(enrichSensesCommand(['--limit', '5', '--tier', 'nope'])).rejects.toThrow(/unknown tier/);
  });
});
