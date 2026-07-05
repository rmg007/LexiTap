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

describe('computeNextReview — "too easy" accelerator (ease === "easy")', () => {
  // Correct + easy jumps mastery +2 (clamp 5) and uses that mastery's interval.
  const cases: Array<[MasteryLevel, MasteryLevel, number]> = [
    [0, 2, 3], // +2 -> mastery 2 -> +3d
    [1, 3, 7], // +2 -> mastery 3 -> +7d
    [3, 5, 30], // +2 -> mastery 5 -> +30d
    [4, 5, 30], // clamp: 4+2=6 -> 5, +30d (no overflow)
    [5, 5, 30], // already max -> stays 5, +30d
  ];

  it.each(cases)('mastery %i correct+easy -> mastery %i, +%id', (from, toMastery, days) => {
    const res = computeNextReview({ masteryLevel: from, isCorrect: true, now: NOW, ease: 'easy' });
    expect(res.masteryLevel).toBe(toMastery);
    expect(res.nextReviewDate).toBe(NOW + days * DAY_MS);
  });

  it('ignores ease on an incorrect answer (still mastery -1, +1d)', () => {
    const res = computeNextReview({ masteryLevel: 3, isCorrect: false, now: NOW, ease: 'easy' });
    expect(res.masteryLevel).toBe(2);
    expect(res.nextReviewDate).toBe(NOW + DAY_MS);
  });

  it('undefined ease is byte-identical to the frozen +1 path (regression lock)', () => {
    // This is what the diagnostic seeders rely on: no ease => exactly today's math.
    for (let m = 0 as MasteryLevel; m <= 5; m = (m + 1) as MasteryLevel) {
      const withUndefined = computeNextReview({ masteryLevel: m, isCorrect: true, now: NOW });
      const explicitNoEase = computeNextReview({
        masteryLevel: m,
        isCorrect: true,
        now: NOW,
        ease: undefined,
      });
      expect(withUndefined).toEqual(explicitNoEase);
      // and equals the classic +1 lookup
      const expectedMastery = Math.min(5, m + 1);
      expect(withUndefined.masteryLevel).toBe(expectedMastery);
    }
  });
});

describe('v1FixedScheduler port', () => {
  it('tags scheduler version v1-fixed (unchanged by the ease accelerator)', () => {
    expect(v1FixedScheduler.version).toBe('v1-fixed');
    expect(V1_FIXED_VERSION).toBe('v1-fixed');
  });

  it('delegates to computeNextReview', () => {
    expect(v1FixedScheduler.next({ masteryLevel: 2, isCorrect: true, now: NOW })).toEqual(
      computeNextReview({ masteryLevel: 2, isCorrect: true, now: NOW }),
    );
  });
});
