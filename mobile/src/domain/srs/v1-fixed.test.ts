import { computeNextReview, v1FixedScheduler, DAY_MS, V1_FIXED_VERSION } from '@/domain/srs/v1-fixed';
import type { MasteryLevel } from '@/domain/user/UserProgress';

const NOW = 1_700_000_000_000;

describe('computeNextReview — correct path', () => {
  const cases: Array<[MasteryLevel, MasteryLevel, number]> = [
    [0, 1, 1],
    [1, 2, 3],
    [2, 3, 7],
    [3, 4, 14],
    [4, 5, 30],
    [5, 5, 30], // capped at 5, stays at +30d
  ];

  it.each(cases)('mastery %i correct -> mastery %i, +%id', (from, toMastery, days) => {
    const res = computeNextReview({ masteryLevel: from, isCorrect: true, now: NOW });
    expect(res.masteryLevel).toBe(toMastery);
    expect(res.nextReviewDate).toBe(NOW + days * DAY_MS);
  });
});

describe('computeNextReview — incorrect path', () => {
  const cases: Array<[MasteryLevel, MasteryLevel]> = [
    [0, 0],
    [1, 0],
    [2, 1],
    [3, 2],
    [4, 3],
    [5, 4],
  ];

  it.each(cases)('mastery %i incorrect -> mastery %i, +1d', (from, toMastery) => {
    const res = computeNextReview({ masteryLevel: from, isCorrect: false, now: NOW });
    expect(res.masteryLevel).toBe(toMastery);
    expect(res.nextReviewDate).toBe(NOW + DAY_MS);
  });
});

describe('v1FixedScheduler port', () => {
  it('tags scheduler version v1-fixed', () => {
    expect(v1FixedScheduler.version).toBe('v1-fixed');
    expect(V1_FIXED_VERSION).toBe('v1-fixed');
  });

  it('delegates to computeNextReview', () => {
    expect(v1FixedScheduler.next({ masteryLevel: 2, isCorrect: true, now: NOW })).toEqual(
      computeNextReview({ masteryLevel: 2, isCorrect: true, now: NOW }),
    );
  });
});
