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
  it('normalizes the surface form and assigns a stable id', () => {
    const r = toWordRow(parsed({ word: '  Look  Up To ' }), 'foundation', 123);
    expect(r.word).toBe('look up to');
    expect(r.id).toBe(makeWordId('look up to', 'foundation'));
    expect(r.tier_id).toBe('foundation');
    expect(r.created_at).toBe(123);
    expect(r.deleted_at).toBeNull();
  });

  it('serializes synonyms/antonyms arrays to JSON text', () => {
    const r = toWordRow(parsed({ synonyms: ['a', 'b'], antonyms: [] }), 'foundation', 1);
    expect(r.synonyms).toBe('["a","b"]');
    expect(r.antonyms).toBe('[]');
  });

  it('leaves synonyms null when not supplied', () => {
    const r = toWordRow(parsed(), 'foundation', 1);
    expect(r.synonyms).toBeNull();
  });
});

describe('importRows', () => {
  it('inserts new rows', () => {
    const db = openMemoryContentDb();
    const summary = importRows(db, [parsed()], {
      tier: 'foundation',
      defaultType: 'vocabulary',
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
      defaultType: 'vocabulary' as const,
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
      defaultType: 'vocabulary' as const,
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
      defaultType: 'vocabulary' as const,
      now: () => 1,
    };
    importRows(db, [parsed()], { ...base, onConflict: 'update' });
    expect(() => importRows(db, [parsed()], { ...base, onConflict: 'error' })).toThrow();
    db.close();
  });
});
