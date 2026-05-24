import type { WordId } from '@/domain/vocabulary/ids';

// SRS progress per word. Maps to user_progress; mutated only by the scheduler
// (v1-fixed) and the one-time forgiveness re-anchor. See DATA_MODELS.md.

export type MasteryLevel = 0 | 1 | 2 | 3 | 4 | 5;

// Open for a future v2-fsrs scheduler; the `(string & {})` keeps the known
// literal while still accepting other tags (DATA_MODELS.md).
export type SchedulerVersion = 'v1-fixed' | (string & {});

export interface UserProgress {
  wordId: WordId;
  masteryLevel: MasteryLevel;
  nextReviewDate: number;
  lastReviewedAt?: number;
  consecutiveCorrect: number;
  totalAttempts: number;
  totalCorrect: number;
  firstSeenAt?: number;
  schedulerVersion: SchedulerVersion;
}
