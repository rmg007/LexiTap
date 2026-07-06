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

export interface KnowledgeMapSegments {
  /** Level 5 — the mastered top of the v1-fixed ladder. */
  known: number;
  /** Levels 1–4 — seen at least once, not yet mastered. */
  learning: number;
  /** Level 0 — never studied (includes words with no progress row yet). */
  new: number;
  total: number;
}

/**
 * Splits a tier's per-word mastery levels into the three-segment
 * known/learning/new breakdown (`KnowledgeMapBar`). Pure aggregation, same
 * shape as `countMastered`/`masteryCompletion` — no new domain concept, just
 * a different cut of the same `MasteryLevel[]` those already consume.
 */
export function knowledgeMapSegments(levels: readonly MasteryLevel[]): KnowledgeMapSegments {
  let known = 0;
  let learning = 0;
  let brandNew = 0;
  for (const level of levels) {
    if (isMastered(level)) known += 1;
    else if (level > 0) learning += 1;
    else brandNew += 1;
  }
  return { known, learning, new: brandNew, total: levels.length };
}
