import {
  isMastered,
  countMastered,
  averageMastery,
  masteryCompletion,
  knowledgeMapSegments,
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

  it('knowledgeMapSegments splits known(5)/learning(1-4)/new(0)', () => {
    // levels = [0, 2, 5, 5, 3] -> new:1 (the 0), learning:2 (2 and 3), known:2 (the two 5s)
    expect(knowledgeMapSegments(levels)).toEqual({ known: 2, learning: 2, new: 1, total: 5 });
    expect(knowledgeMapSegments([])).toEqual({ known: 0, learning: 0, new: 0, total: 0 });
  });
});
