import type { QuizMode } from '@/domain/quiz/types';

// Typed domain errors. The domain throws these and never catches
// infrastructure errors (CODING_STANDARDS.md error-handling).

export class NoWordsAvailableError extends Error {
  constructor(
    public readonly tierId: string,
    public readonly mode: QuizMode,
  ) {
    super(`No ${mode} words available for tier ${tierId}`);
    this.name = 'NoWordsAvailableError';
  }
}

export class QuizSessionCompleteError extends Error {
  constructor(public readonly sessionId: number) {
    super(`Quiz session ${sessionId} is already complete`);
    this.name = 'QuizSessionCompleteError';
  }
}

export class WordNotInSessionError extends Error {
  constructor(
    public readonly sessionId: number,
    public readonly wordId: string,
  ) {
    super(`Word ${wordId} is not the current question in session ${sessionId}`);
    this.name = 'WordNotInSessionError';
  }
}

export class TierLockedError extends Error {
  constructor(public readonly tierId: string) {
    super(`Tier ${tierId} is locked`);
    this.name = 'TierLockedError';
  }
}
