import type { QuizSessionRepository } from '@/domain/quiz/repositories';
import type { QuizSession } from '@/domain/quiz/types';
import { asSessionId, type SessionId } from '@/domain/vocabulary/ids';
import type { DatabaseHandle } from '@/infrastructure/db/database';
import { insertSession, completeSession } from '@/infrastructure/db/queries/sessionQueries';

// SQLite implementation of the QuizSessionRepository port. One audit row per
// session. `save` inserts and returns the autoincrement id branded as SessionId.
// total_questions is derived from the session's word count, total_correct from
// correctCount; duration is computed from started/completed when both present.
export class SQLiteQuizSessionRepository implements QuizSessionRepository {
  constructor(private readonly db: DatabaseHandle) {}

  async save(session: QuizSession): Promise<SessionId> {
    const durationSeconds =
      session.completedAt !== undefined
        ? Math.max(0, Math.round((session.completedAt - session.startedAt) / 1000))
        : null;
    const result = await insertSession(this.db, {
      tierId: session.tierId,
      startedAt: session.startedAt,
      completedAt: session.completedAt ?? null,
      totalQuestions: session.words.length,
      totalCorrect: session.correctCount,
      durationSeconds,
      quizMode: session.mode,
    });
    return asSessionId(result.lastInsertRowId);
  }

  async complete(id: SessionId, completedAt: number): Promise<void> {
    await completeSession(this.db, id, completedAt);
  }
}
