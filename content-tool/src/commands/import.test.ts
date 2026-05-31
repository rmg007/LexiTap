import { describe, it, expect } from 'vitest';
import { toWordRow, importRows } from '@/commands/import';
import { makeWordId } from '@/lib/ids';
import { openMemoryContentDb } from '@/lib/db';
import type { ParsedInputRow } from '@/lib/csv';
import type { WordRow } from '@/schema/types';

function parsed(overrides: Partial<ParsedInputRow> = {}): ParsedInputRow {
  return {
    word: 'Borrow',
    definition: 'To take and return later',
    example_sentence: 'Can I _ it?',
    pos: 'verb',
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

describe('toWordRow', () => {
  it('normalizes the surface form and assigns a category-independent stable id', () => {
    const r = toWordRow(parsed({ word: '  Look  Up To ' }), 123);
    expect(r.word).toBe('look up to');
    expect(r.id).toBe(makeWordId('look up to'));
    expect(r.created_at).toBe(123);
    expect(r.deleted_at).toBeNull();
  });

  it('serializes synonyms/antonyms arrays to JSON text', () => {
    const r = toWordRow(parsed({ synonyms: ['a', 'b'], antonyms: [] }), 1);
    expect(r.synonyms).toBe('["a","b"]');
    expect(r.antonyms).toBe('[]');
  });

  it('leaves synonyms null when not supplied', () => {
    const r = toWordRow(parsed(), 1);
    expect(r.synonyms).toBeNull();
  });
});

describe('importRows', () => {
  it('inserts new rows', () => {
    const db = openMemoryContentDb();
    const summary = importRows(db, [parsed()], {
      tier: 'foundation',
      onConflict: 'update',
      now: () => 1,
    });
    expect(summary.imported).toBe(1);
    const rows = db.prepare('SELECT * FROM words').all() as WordRow[];
    expect(rows).toHaveLength(1);
    expect(rows[0]!.word).toBe('borrow');
    db.close();
  });

  it('is idempotent: re-import updates the same stable id', () => {
    const db = openMemoryContentDb();
    const opts = {
      tier: 'foundation' as const,
      onConflict: 'update' as const,
      now: () => 1,
    };
    importRows(db, [parsed()], opts);
    const second = importRows(db, [parsed({ definition: 'Updated def' })], opts);
    expect(second.updated).toBe(1);
    const rows = db.prepare('SELECT * FROM words').all() as WordRow[];
    expect(rows).toHaveLength(1);
    expect(rows[0]!.definition).toBe('Updated def');
    db.close();
  });

  it('skip policy leaves the existing row untouched', () => {
    const db = openMemoryContentDb();
    const base = {
      tier: 'foundation' as const,
      now: () => 1,
    };
    importRows(db, [parsed()], { ...base, onConflict: 'update' });
    const summary = importRows(db, [parsed({ definition: 'X' })], { ...base, onConflict: 'skip' });
    expect(summary.skipped).toBe(1);
    const rows = db.prepare('SELECT * FROM words').all() as WordRow[];
    expect(rows[0]!.definition).toBe('To take and return later');
    db.close();
  });

  it('error policy throws on conflict', () => {
    const db = openMemoryContentDb();
    const base = {
      tier: 'foundation' as const,
      now: () => 1,
    };
    importRows(db, [parsed()], { ...base, onConflict: 'update' });
    expect(() => importRows(db, [parsed()], { ...base, onConflict: 'error' })).toThrow();
    db.close();
  });

  it('records a word_tiers membership for the imported tier', () => {
    const db = openMemoryContentDb();
    importRows(db, [parsed()], { tier: 'foundation', onConflict: 'update', now: () => 1 });
    const tags = db
      .prepare('SELECT tier_id FROM word_tiers WHERE word_id = ?')
      .all(makeWordId('borrow')) as { tier_id: string }[];
    expect(tags.map((t) => t.tier_id)).toEqual(['foundation']);
    db.close();
  });
});

// The Stage-1 DONE criterion: one word tagged into ≥2 categories must resolve to
// a SINGLE content row (and therefore a single user_progress row), because the
// id is category-independent. Proven against a real SQLite engine.
describe('many-to-many: one word in two categories => one progress row', () => {
  it('collapses to a single content row tagged into both categories', () => {
    const db = openMemoryContentDb();
    const opts = (tier: string) => ({ tier, onConflict: 'update' as const, now: () => 1 });
    importRows(db, [parsed({ word: 'feature' })], opts('foundation'));
    importRows(db, [parsed({ word: 'feature' })], opts('toefl'));

    // ONE content row, keyed by the category-independent id.
    const words = db.prepare('SELECT * FROM words').all() as WordRow[];
    expect(words).toHaveLength(1);
    const wordId = words[0]!.id;
    expect(wordId).toBe(makeWordId('feature'));

    // ...tagged into BOTH categories.
    const tiers = (
      db.prepare('SELECT tier_id FROM word_tiers WHERE word_id = ? ORDER BY tier_id').all(wordId) as {
        tier_id: string;
      }[]
    ).map((r) => r.tier_id);
    expect(tiers).toEqual(['foundation', 'toefl']);

    // The device user_progress is keyed by word_id. Because the id is shared, a
    // single progress row serves the word whichever category you browse it from.
    db.exec('CREATE TABLE user_progress (word_id TEXT PRIMARY KEY, mastery_level INTEGER NOT NULL)');
    db.prepare('INSERT INTO user_progress (word_id, mastery_level) VALUES (?, 4)').run(wordId);

    const browseVia = (tier: string) =>
      db
        .prepare(
          `SELECT p.word_id, p.mastery_level
           FROM words w
           JOIN word_tiers wt ON wt.word_id = w.id
           JOIN user_progress p ON p.word_id = w.id
           WHERE wt.tier_id = ?`,
        )
        .all(tier) as { word_id: string; mastery_level: number }[];

    const viaFoundation = browseVia('foundation');
    const viaToefl = browseVia('toefl');
    expect(viaFoundation).toHaveLength(1);
    expect(viaToefl).toHaveLength(1);
    expect(viaFoundation[0]!.word_id).toBe(viaToefl[0]!.word_id);
    expect(viaFoundation[0]!.mastery_level).toBe(4);

    db.close();
  });
});
