import type { MasteryLevel, SchedulerVersion } from '@/domain/user/UserProgress';
import type { Scheduler, SchedulerInput, SchedulerResult } from '@/domain/srs/Scheduler';

// v1-fixed: locked fixed-interval scheduler (SRS_FORGIVENESS_MECHANICS.md
// Overview, DATABASE_SCHEMA.md). The forgiveness layer wraps this but never
// changes its interval math, so a future FSRS migration can replay attempts.

export const V1_FIXED_VERSION: SchedulerVersion = 'v1-fixed';

export const DAY_MS = 86_400_000;

// Interval (days) indexed by the NEW mastery level after a correct answer.
// mastery 1 -> +1d, 2 -> +3d, 3 -> +7d, 4 -> +14d, 5 -> +30d.
const CORRECT_INTERVALS_DAYS: Readonly<Record<MasteryLevel, number>> = {
  0: 1, // unreachable on a correct answer (min new mastery is 1), defined for totality
  1: 1,
  2: 3,
  3: 7,
  4: 14,
  5: 30,
};

const MIN_MASTERY: MasteryLevel = 0;
const MAX_MASTERY: MasteryLevel = 5;

function clampMastery(value: number): MasteryLevel {
  if (value <= MIN_MASTERY) return MIN_MASTERY;
  if (value >= MAX_MASTERY) return MAX_MASTERY;
  return value as MasteryLevel;
}

/**
 * Compute the next SRS state. Pure: time is injected via `now`.
 * Correct: mastery += 1 (cap 5), next = now + interval[newMastery].
 * Incorrect: mastery -= 1 (min 0), next = now + 1d.
 */
export function computeNextReview(input: SchedulerInput): SchedulerResult {
  const { masteryLevel, isCorrect, now } = input;

  if (isCorrect) {
    const newMastery = clampMastery(masteryLevel + 1);
    const intervalDays = CORRECT_INTERVALS_DAYS[newMastery];
    return { masteryLevel: newMastery, nextReviewDate: now + intervalDays * DAY_MS };
  }

  const newMastery = clampMastery(masteryLevel - 1);
  return { masteryLevel: newMastery, nextReviewDate: now + DAY_MS };
}

// The injectable Scheduler port binding for v1-fixed.
export const v1FixedScheduler: Scheduler = {
  version: V1_FIXED_VERSION,
  next: computeNextReview,
};
