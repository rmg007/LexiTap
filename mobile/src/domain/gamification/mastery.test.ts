import {
  isMastered,
  countMastered,
  averageMastery,
  masteryCompletion,
} from '@/domain/gamification/mastery';
import type { MasteryLevel } from '@/domain/user/UserProgress';

const levels: MasteryLevel[] = [0, 2, 5, 5, 3];

describe('mastery aggregation', () => {
  it('isMastered only at level 5', () => {
    expect(isMastered(5)).toBe(true);
    expect(isMastered(4)).toBe(false);
  });

  it('countMastered counts level-5 words', () => {
    expect(countMastered(levels)).toBe(2);
  });

  it('averageMastery is the mean, 0 on empty', () => {
    expect(averageMastery(levels)).toBeCloseTo(3);
    expect(averageMastery([])).toBe(0);
  });

  it('masteryCompletion is the mastered fraction, 0 on empty', () => {
    expect(masteryCompletion(levels)).toBeCloseTo(2 / 5);
    expect(masteryCompletion([])).toBe(0);
  });
});
