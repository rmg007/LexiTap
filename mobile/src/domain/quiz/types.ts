import type { SessionId, TierId, WordId } from '@/domain/vocabulary/ids';
import type { Word } from '@/domain/vocabulary/Word';
import type { MasteryLevel, SchedulerVersion } from '@/domain/user/UserProgress';

// Quiz domain types. Shapes mirror DATA_MODELS.md. quiz_attempts is
// append-only (SYSTEM_ARCHITECTURE.md invariant 5).

export type AssessmentType =
  | 'multiple_choice'
  | 'drag_drop'
  | 'image_match'
  | 'classification';
export type QuizMode = 'review' | 'learn';

export interface QuizSession {
  id: SessionId;
  tierId: TierId;
  mode: QuizMode;
  words: Word[];
  currentIndex: number;
  correctCount: number;
  startedAt: number;
  completedAt?: number;
}

// Append-only review event (maps to quiz_attempts; never mutated).
export interface QuizAttempt {
  id: number;
  sessionId: SessionId;
  wordId: WordId;
  assessmentType: AssessmentType;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  answeredAt: number;
  timeToAnswerMs?: number;
  preMasteryLevel?: MasteryLevel; // mastery before this attempt (replay)
  scheduledReviewDate?: number; // schedule the scheduler set (replay)
  schedulerVersion?: SchedulerVersion;
}

export interface QuizResult {
  isCorrect: boolean;
  totalCorrect: number;
  isSessionComplete: boolean;
}
