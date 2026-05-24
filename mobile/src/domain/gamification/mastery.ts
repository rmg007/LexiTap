import type { MasteryLevel } from '@/domain/user/UserProgress';

// Mastery aggregation helpers. Pure functions over a set of per-word mastery
// levels, used for progress dashboards. A word is "mastered" at the top of the
// v1-fixed ladder (mastery 5).

export const MASTERED_LEVEL: MasteryLevel = 5;

export function isMastered(level: MasteryLevel): boolean {
  return level >= MASTERED_LEVEL;
}

export function countMastered(levels: readonly MasteryLevel[]): number {
  return levels.reduce<number>((n, l) => (isMastered(l) ? n + 1 : n), 0);
}

/** Mean mastery across words, 0 when there are no words. */
export function averageMastery(levels: readonly MasteryLevel[]): number {
  if (levels.length === 0) return 0;
  const sum = levels.reduce<number>((acc, l) => acc + l, 0);
  return sum / levels.length;
}

/** Fraction (0..1) of words at the mastered level. 0 when empty. */
export function masteryCompletion(levels: readonly MasteryLevel[]): number {
  if (levels.length === 0) return 0;
  return countMastered(levels) / levels.length;
}
