import { AnswerQuestionUseCase } from '@/application/quiz/AnswerQuestionUseCase';
import { WordNotInSessionError } from '@/domain/quiz/errors';
import { v1FixedScheduler, DAY_MS } from '@/domain/srs/v1-fixed';
import type { QuizAttempt, QuizSession } from '@/domain/quiz/types';
import type { UserProgress } from '@/domain/user/UserProgress';
import type { QuizAttemptRepository } from '@/domain/quiz/repositories';
import type { UserProgressRepository } from '@/domain/user/UserProgressRepository';
import type { Word } from '@/domain/vocabulary/Word';
import { asSessionId, asTierId, asWordId, type WordId } from '@/domain/vocabulary/ids';

const NOW = 1_700_000_000_000;

function word(id: string): Word {
  return {
    id: asWordId(id),
    word: id,
    definition: 'd',
    tierId: asTierId('t1'),
    wordType: 'vocabulary',
    exampleSentence: '_ x',
    synonyms: [],
    antonyms: [],
    isDeleted: false,
  };
}

function session(words: Word[], idx = 0): QuizSession {
  return {
    id: asSessionId(1),
    tierId: asTierId('t1'),
    mode: 'review',
    words,
    currentIndex: idx,
    correctCount: 0,
    startedAt: NOW,
  };
}

class MockAttempts implements QuizAttemptRepository {
  appended: Array<Omit<QuizAttempt, 'id'>> = [];
  async append(a: Omit<QuizAttempt, 'id'>): Promise<void> {
    this.appended.push(a);
  }
}

class MockProgress implements UserProgressRepository {
  store = new Map<string, UserProgress>();
  async get(wordId: WordId): Promise<UserProgress | null> {
    return this.store.get(wordId) ?? null;
  }
  async upsert(p: UserProgress): Promise<void> {
    this.store.set(p.wordId, p);
  }
  async countDue(): Promise<number> {
    return 0;
  }
}

describe('AnswerQuestionUseCase', () => {
  it('appends an attempt, updates progress via SRS, advances session (correct)', async () => {
    const attempts = new MockAttempts();
    const progress = new MockProgress();
    progress.store.set('a', {
      wordId: asWordId('a'),
      masteryLevel: 1,
      nextReviewDate: NOW,
      consecutiveCorrect: 2,
      totalAttempts: 3,
      totalCorrect: 2,
      schedulerVersion: 'v1-fixed',
    });
    const uc = new AnswerQuestionUseCase(attempts, progress, v1FixedScheduler);

    const out = await uc.execute({
      session: session([word('a'), word('b')]),
      wordId: asWordId('a'),
      assessmentType: 'multiple_choice',
      userAnswer: 'x',
      correctAnswer: 'x',
      isCorrect: true,
      nowMs: NOW,
    });

    // append-only attempt with replay fields
    expect(attempts.appended).toHaveLength(1);
    expect(attempts.appended[0]).toMatchObject({
      wordId: 'a',
      isCorrect: true,
      preMasteryLevel: 1,
      scheduledReviewDate: NOW + 3 * DAY_MS, // mastery 1->2 = +3d
      schedulerVersion: 'v1-fixed',
    });

    // progress updated
    expect(out.progress.masteryLevel).toBe(2);
    expect(out.progress.consecutiveCorrect).toBe(3);
    expect(out.progress.totalAttempts).toBe(4);
    expect(out.progress.totalCorrect).toBe(3);

    // session advanced
    expect(out.session.currentIndex).toBe(1);
    expect(out.result).toEqual({ isCorrect: true, totalCorrect: 1, isSessionComplete: false });
  });

  it('handles a first-time word (no existing progress) on an incorrect answer', async () => {
    const attempts = new MockAttempts();
    const progress = new MockProgress();
    const uc = new AnswerQuestionUseCase(attempts, progress, v1FixedScheduler);

    const out = await uc.execute({
      session: session([word('a')]),
      wordId: asWordId('a'),
      assessmentType: 'classification',
      userAnswer: 'wrong',
      correctAnswer: 'right',
      isCorrect: false,
      nowMs: NOW,
    });

    expect(out.progress.masteryLevel).toBe(0); // 0 - 1 clamps to 0
    expect(out.progress.nextReviewDate).toBe(NOW + DAY_MS);
    expect(out.progress.consecutiveCorrect).toBe(0);
    expect(out.progress.firstSeenAt).toBe(NOW);
    expect(out.result.isSessionComplete).toBe(true);
  });

  it('throws when the answered word is not the current question', async () => {
    const uc = new AnswerQuestionUseCase(
      new MockAttempts(),
      new MockProgress(),
      v1FixedScheduler,
    );
    await expect(
      uc.execute({
        session: session([word('a'), word('b')]),
        wordId: asWordId('b'),
        assessmentType: 'multiple_choice',
        userAnswer: 'x',
        correctAnswer: 'x',
        isCorrect: true,
        nowMs: NOW,
      }),
    ).rejects.toBeInstanceOf(WordNotInSessionError);
  });
});
