import {
  MIGRATIONS,
  TARGET_USER_VERSION,
  pendingMigrations,
} from '@/infrastructure/db/migrations';

describe('migration ledger', () => {
  it('is ordered by strictly ascending version', () => {
    for (let i = 1; i < MIGRATIONS.length; i++) {
      const prev = MIGRATIONS[i - 1];
      const cur = MIGRATIONS[i];
      expect(prev).toBeDefined();
      expect(cur).toBeDefined();
      if (prev && cur) expect(cur.version).toBeGreaterThan(prev.version);
    }
  });

  it('TARGET_USER_VERSION equals the highest migration version', () => {
    const max = MIGRATIONS.reduce((m, x) => Math.max(m, x.version), 0);
    expect(TARGET_USER_VERSION).toBe(max);
  });

  it('every migration carries non-empty SQL', () => {
    for (const m of MIGRATIONS) {
      expect(m.sql.trim().length).toBeGreaterThan(0);
    }
  });

  it('targets user_version 3 with the additive word-feedback migration', () => {
    expect(TARGET_USER_VERSION).toBe(3);
    const m003 = MIGRATIONS.find((m) => m.version === 3);
    expect(m003?.name).toBe('003_word_feedback');
    // Additive-only: a new table, a new nullable column, and a single-row table.
    expect(m003?.sql).toContain('CREATE TABLE IF NOT EXISTS saved_words');
    expect(m003?.sql).toContain('ALTER TABLE quiz_attempts ADD COLUMN user_ease');
    expect(m003?.sql).toContain('CREATE TABLE IF NOT EXISTS active_session');
    // Never edits/DROPs an existing table.
    expect(m003?.sql).not.toMatch(/\bDROP\b/i);
  });
});

describe('pendingMigrations for the 003 upgrade path', () => {
  it('an existing v2 device applies exactly [003] on next launch', () => {
    const pending = pendingMigrations(2);
    expect(pending.map((m) => m.version)).toEqual([3]);
    expect(pending[0]?.name).toBe('003_word_feedback');
  });
});

describe('pendingMigrations', () => {
  it('returns all migrations for a fresh DB (version 0)', () => {
    expect(pendingMigrations(0)).toEqual(MIGRATIONS);
  });

  it('returns none when already at target', () => {
    expect(pendingMigrations(TARGET_USER_VERSION)).toHaveLength(0);
  });

  it('returns none when ahead of target (defensive)', () => {
    expect(pendingMigrations(TARGET_USER_VERSION + 5)).toHaveLength(0);
  });

  it('returns only versions strictly greater than current, in order', () => {
    const result = pendingMigrations(0);
    const versions = result.map((m) => m.version);
    const sorted = [...versions].sort((a, b) => a - b);
    expect(versions).toEqual(sorted);
    expect(versions.every((v) => v > 0)).toBe(true);
  });
});
