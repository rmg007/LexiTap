import type { MasteryLevel, SchedulerVersion } from '@/domain/user/UserProgress';

// Pure scheduler port. The v1-fixed implementation is the only thing that
// mutates mastery_level / next_review_date in the answer-driven path
// (SYSTEM_ARCHITECTURE.md invariant 6: SRS changes are version-tagged).
export interface SchedulerInput {
  masteryLevel: MasteryLevel;
  isCorrect: boolean;
  now: number;
  // Optional "too easy" accelerator. Only meaningful when isCorrect === true.
  // Undefined = today's behavior (mastery +1). 'easy' = bounded accelerator
  // (mastery +2, clamp 5). This lives INSIDE the frozen v1-fixed contract — it
  // is NOT a fork: scheduler_version stays 'v1-fixed' and the ease signal is
  // recorded on the append-only quiz_attempts row for replay. Optional + off by
  // default so every existing caller (incl. the diagnostic seeders that pass no
  // ease) is byte-identical. (WORD_FEEDBACK_PLAN §F1-light.)
  ease?: 'easy';
}

export interface SchedulerResult {
  masteryLevel: MasteryLevel;
  nextReviewDate: number;
}

export interface Scheduler {
  readonly version: SchedulerVersion;
  next(input: SchedulerInput): SchedulerResult;
}
