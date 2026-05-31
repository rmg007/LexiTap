import { buildDailyProgressQueries } from '@/infrastructure/db/queries/dailyProgressQueries';
import type { DatabaseHandle } from '@/infrastructure/db/database';
import { startOfLocalDay } from '@/domain/time/civilDate';
import { FORGIVENESS } from '@/domain/srs/forgiveness';

// getDailyProgress issues three `db.first` reads in order:
//   1. reviews completed today (correct attempts since local midnight)
//   2. distinct new words completed today
//   3. due-word count (drives the effective cap via forgiveness)
// These tests stub the handle's `first` to return those three rows in sequence,
// so they pin the result mapping and the offline zero-state without a real DB.

const TZ = 'America/New_York';
const NOW = 1_700_000_000_000; // fixed; no Date.now()

function handleReturning(rows: Array<unknown>): {
  db: DatabaseHandle;
  first: jest.Mock;
} {
  const first = jest.fn();
  rows.forEach((r) => first.mockResolvedValueOnce(r));
  const db = {
    first,
    all: jest.fn(),
    run: jest.fn(),
    transaction: jest.fn(),
  } as unknown as DatabaseHandle;
  return { db, first };
}

describe('buildDailyProgressQueries.getDailyProgress', () => {
  it('maps the three reads to metrics under a light load (due ≤ base cap)', async () => {
    const { db, first } = handleReturning([{ count: 5 }, { count: 2 }, { n: 10 }]);
    const { getDailyProgress } = buildDailyProgressQueries(db);

    const result = await getDailyProgress('tier-foundation', NOW, TZ);

    expect(result).toEqual({
      reviewsCompletedToday: 5,
      effectiveDailyCap: FORGIVENESS.BASE_DAILY_CAP, // 40; due (10) ≤ 40 → no catch-up
      newWordsCompletedToday: 2,
      newWordsBudget: FORGIVENESS.NEW_WORDS_PER_DAY, // min(10, 40-5) = 10
    });

    // First read scopes to tier + local-midnight start, never the raw nowMs.
    const startOfToday = startOfLocalDay(NOW, TZ);
    expect(first.mock.calls[0][1]).toEqual(['tier-foundation', startOfToday]);
  });

  it('raises the cap with the catch-up budget when due exceeds the base cap', async () => {
    // due (100) > 40 → cap = min(40+20, 200) = 60; reviews 55 → budget = min(10, 60-55) = 5
    const { db } = handleReturning([{ count: 55 }, { count: 3 }, { n: 100 }]);
    const { getDailyProgress } = buildDailyProgressQueries(db);

    const result = await getDailyProgress('tier-foundation', NOW, TZ);

    expect(result.effectiveDailyCap).toBe(
      FORGIVENESS.BASE_DAILY_CAP + FORGIVENESS.CATCH_UP_BUDGET,
    );
    expect(result.newWordsBudget).toBe(5);
  });

  it('treats null/empty reads as zero counts', async () => {
    const { db } = handleReturning([null, null, null]);
    const { getDailyProgress } = buildDailyProgressQueries(db);

    const result = await getDailyProgress('tier-foundation', NOW, TZ);

    expect(result).toEqual({
      reviewsCompletedToday: 0,
      effectiveDailyCap: FORGIVENESS.BASE_DAILY_CAP,
      newWordsCompletedToday: 0,
      newWordsBudget: FORGIVENESS.NEW_WORDS_PER_DAY,
    });
  });

  it('returns the zero-state on any DB error (offline-first, never throws)', async () => {
    const first = jest.fn().mockRejectedValue(new Error('db unavailable'));
    const db = {
      first,
      all: jest.fn(),
      run: jest.fn(),
      transaction: jest.fn(),
    } as unknown as DatabaseHandle;
    const { getDailyProgress } = buildDailyProgressQueries(db);

    await expect(getDailyProgress('tier-foundation', NOW, TZ)).resolves.toEqual({
      reviewsCompletedToday: 0,
      effectiveDailyCap: FORGIVENESS.BASE_DAILY_CAP,
      newWordsCompletedToday: 0,
      newWordsBudget: FORGIVENESS.NEW_WORDS_PER_DAY,
    });
  });
});
