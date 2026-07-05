import type { QuizAttemptRepository } from '@/domain/quiz/repositories';
import type { QuizAttempt } from '@/domain/quiz/types';
import type { DatabaseHandle } from '@/infrastructure/db/database';
import { insertAttempt } from '@/infrastructure/db/queries/attemptQueries';

// SQLite implementation of the QuizAttemptRepository port. Append-only: the port
// exposes only `append`, and the underlying query module offers no UPDATE/DELETE
// (SYSTEM_ARCHITECTURE.md invariant 5). Corrections are compensating inserts.
export class SQLiteQuizAttemptRepository implements QuizAttemptRepository {
  constructor(private readonly db: DatabaseHandle) {}

  async append(attempt: Omit<QuizAttempt, 'id'>): Promise<void> {
    await insertAttempt(this.db, {
      sessionId: attempt.sessionId,
      wordId: attempt.wordId,
      assessmentType: attempt.assessmentType,
      userAnswer: attempt.userAnswer,
      correctAnswer: attempt.correctAnswer,
      isCorrect: attempt.isCorrect ? 1 : 0,
      answeredAt: attempt.answeredAt,
      timeToAnswerMs: attempt.timeToAnswerMs ?? null,
      preMasteryLevel: attempt.preMasteryLevel ?? null,
      scheduledReviewDate: attempt.scheduledReviewDate ?? null,
      schedulerVersion: attempt.schedulerVersion ?? null,
      userEase: attempt.userEase ?? null,
    });
  }
}
