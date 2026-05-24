import type { MasteryLevel, SchedulerVersion } from '@/domain/user/UserProgress';

// Pure scheduler port. The v1-fixed implementation is the only thing that
// mutates mastery_level / next_review_date in the answer-driven path
// (SYSTEM_ARCHITECTURE.md invariant 6: SRS changes are version-tagged).
export interface SchedulerInput {
  masteryLevel: MasteryLevel;
  isCorrect: boolean;
  now: number;
}

export interface SchedulerResult {
  masteryLevel: MasteryLevel;
  nextReviewDate: number;
}

export interface Scheduler {
  readonly version: SchedulerVersion;
  next(input: SchedulerInput): SchedulerResult;
}
