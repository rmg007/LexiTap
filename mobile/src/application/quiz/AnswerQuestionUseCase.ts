import type { WordId } from '@/domain/vocabulary/ids';
import type { UserProgress, MasteryLevel } from '@/domain/user/UserProgress';
import type { UserProgressRepository } from '@/domain/user/UserProgressRepository';
import type { QuizAttemptRepository } from '@/domain/quiz/repositories';
import type { AssessmentType, QuizResult, QuizSession } from '@/domain/quiz/types';
import type { Scheduler } from '@/domain/srs/Scheduler';
import { advanceSession, currentWord } from '@/domain/quiz/QuizSession';
import { WordNotInSessionError } from '@/domain/quiz/errors';

// Orchestrates a single answer: append the attempt (append-only), compute the
// next review via the injected scheduler, update progress, advance the
// session, and return the result. No SQL here — everything through ports.

export interface AnswerQuestionInput {
  session: QuizSession;
  wordId: WordId;
  assessmentType: AssessmentType;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  nowMs: number;
  timeToAnswerMs?: number;
}

export interface AnswerQuestionOutput {
  result: QuizResult;
  session: QuizSession; // advanced session (caller persists / re-renders)
  progress: UserProgress; // updated progress (already persisted via repo)
}

export class AnswerQuestionUseCase {
  constructor(
    private readonly attempts: QuizAttemptRepository,
    private readonly progress: UserProgressRepository,
    private readonly scheduler: Scheduler,
  ) {}

  async execute(input: AnswerQuestionInput): Promise<AnswerQuestionOutput> {
    const { session, wordId, isCorrect, nowMs } = input;

    // Guard: the answered word must be the session's current question.
    const expected = currentWord(session);
    if (expected === null || expected.id !== wordId) {
      throw new WordNotInSessionError(session.id, wordId);
    }

    const existing = await this.progress.get(wordId);
    const preMastery: MasteryLevel = existing?.masteryLevel ?? 0;

    // Compute next SRS state via the version-tagged scheduler.
    const next = this.scheduler.next({ masteryLevel: preMastery, isCorrect, now: nowMs });

    // 1. Append the immutable attempt (replay-complete: pre-mastery + schedule).
    await this.attempts.append({
      sessionId: session.id,
      wordId,
      assessmentType: input.assessmentType,
      userAnswer: input.userAnswer,
      correctAnswer: input.correctAnswer,
      isCorrect,
      answeredAt: nowMs,
      timeToAnswerMs: input.timeToAnswerMs,
      preMasteryLevel: preMastery,
      scheduledReviewDate: next.nextReviewDate,
      schedulerVersion: this.scheduler.version,
    });

    // 2. Update progress (mutable SRS state).
    const updated: UserProgress = {
      wordId,
      masteryLevel: next.masteryLevel,
      nextReviewDate: next.nextReviewDate,
      lastReviewedAt: nowMs,
      consecutiveCorrect: isCorrect ? (existing?.consecutiveCorrect ?? 0) + 1 : 0,
      totalAttempts: (existing?.totalAttempts ?? 0) + 1,
      totalCorrect: (existing?.totalCorrect ?? 0) + (isCorrect ? 1 : 0),
      firstSeenAt: existing?.firstSeenAt ?? nowMs,
      schedulerVersion: this.scheduler.version,
    };
    await this.progress.upsert(updated);

    // 3. Advance the session.
    const advanced = advanceSession(session, isCorrect);

    return {
      result: {
        isCorrect,
        totalCorrect: advanced.correctCount,
        isSessionComplete: advanced.currentIndex >= advanced.words.length,
      },
      session: advanced,
      progress: updated,
    };
  }
}
