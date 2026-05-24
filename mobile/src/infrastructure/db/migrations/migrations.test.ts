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
