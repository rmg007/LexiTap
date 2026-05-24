import type { QuizSession } from '@/domain/quiz/types';
import type { Word } from '@/domain/vocabulary/Word';
import { QuizSessionCompleteError } from '@/domain/quiz/errors';

// Pure helpers operating on the QuizSession value. The entity is immutable;
// each helper returns a new session so the application layer controls
// persistence and there is no hidden mutation.

export function isSessionComplete(session: QuizSession): boolean {
  return session.currentIndex >= session.words.length;
}

export function currentWord(session: QuizSession): Word | null {
  if (isSessionComplete(session)) return null;
  return session.words[session.currentIndex] ?? null;
}

/**
 * Advance the session after an answer, returning a new session. Throws if the
 * session is already complete (a guard against double-advancing).
 */
export function advanceSession(session: QuizSession, wasCorrect: boolean): QuizSession {
  if (isSessionComplete(session)) {
    throw new QuizSessionCompleteError(session.id);
  }
  return {
    ...session,
    currentIndex: session.currentIndex + 1,
    correctCount: session.correctCount + (wasCorrect ? 1 : 0),
  };
}
