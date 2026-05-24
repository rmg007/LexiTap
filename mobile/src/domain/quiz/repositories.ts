import type { QuizAttempt, QuizSession } from '@/domain/quiz/types';
import type { SessionId } from '@/domain/vocabulary/ids';

// Quiz PORTS implemented in infrastructure/db.

export interface QuizSessionRepository {
  save(session: QuizSession): Promise<SessionId>;
  complete(id: SessionId, completedAt: number): Promise<void>;
}

// Deliberately exposes only `append` — there is no update/delete, enforcing
// the append-only invariant at the type level (SYSTEM_ARCHITECTURE.md #5).
export interface QuizAttemptRepository {
  append(attempt: Omit<QuizAttempt, 'id'>): Promise<void>;
}
