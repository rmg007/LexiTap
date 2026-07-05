import { AnswerQuestionUseCase } from '@/application/quiz/AnswerQuestionUseCase';
import { WordNotInSessionError } from '@/domain/quiz/errors';
import { v1FixedScheduler, DAY_MS } from '@/domain/srs/v1-fixed';
import type { QuizSession } from '@/domain/quiz/types';
import type { UserProgress } from '@/domain/user/UserProgress';
import type { AnswerWriter, AnswerWrite } from '@/domain/quiz/AnswerWriter';
import type { UserProgressRepository } from '@/domain/user/UserProgressRepository';
import type { AnalyticsPort } from '@/domain/analytics/AnalyticsPort';

const noopAnalytics: AnalyticsPort = { track: () => {} };
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

class MockAnswerWriter implements AnswerWriter {
  writes: AnswerWrite[] = [];
  async write(w: AnswerWrite): Promise<void> {
    this.writes.push(w);
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
    const answerWriter = new MockAnswerWriter();
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
    const uc = new AnswerQuestionUseCase(answerWriter, progress, v1FixedScheduler, noopAnalytics);

    const out = await uc.execute({
      session: session([word('a'), word('b')]),
      wordId: asWordId('a'),
      assessmentType: 'multiple_choice',
      userAnswer: 'x',
      correctAnswer: 'x',
      isCorrect: true,
      nowMs: NOW,
    });

    // single atomic write carrying attempt + progress + event
    expect(answerWriter.writes).toHaveLength(1);
    const written = answerWriter.writes[0]!;

    // append-only attempt with replay fields
    expect(written.attempt).toMatchObject({
      wordId: 'a',
      isCorrect: true,
      preMasteryLevel: 1,
      scheduledReviewDate: NOW + 3 * DAY_MS, // mastery 1->2 = +3d
      schedulerVersion: 'v1-fixed',
    });

    // event_log audit row
    expect(written.event.eventType).toBe('answer_recorded');
    expect(written.event.occurredAt).toBe(NOW);
    expect(JSON.parse(written.event.payload!)).toEqual({
      wordId: 'a',
      sessionId: 1,
      assessmentType: 'multiple_choice',
      isCorrect: true,
      preMastery: 1,
      postMastery: 2,
    });

    // progress written atomically alongside the attempt
    expect(written.progress.masteryLevel).toBe(2);

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
    const answerWriter = new MockAnswerWriter();
    const progress = new MockProgress();
    const uc = new AnswerQuestionUseCase(answerWriter, progress, v1FixedScheduler, noopAnalytics);

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

  it('records ease "easy" on a correct answer and accelerates mastery +2', async () => {
    const answerWriter = new MockAnswerWriter();
    const progress = new MockProgress();
    progress.store.set('a', {
      wordId: asWordId('a'),
      masteryLevel: 1,
      nextReviewDate: NOW,
      consecutiveCorrect: 0,
      totalAttempts: 0,
      totalCorrect: 0,
      schedulerVersion: 'v1-fixed',
    });
    const uc = new AnswerQuestionUseCase(answerWriter, progress, v1FixedScheduler, noopAnalytics);

    const out = await uc.execute({
      session: session([word('a')]),
      wordId: asWordId('a'),
      assessmentType: 'multiple_choice',
      userAnswer: 'x',
      correctAnswer: 'x',
      isCorrect: true,
      nowMs: NOW,
      ease: 'easy',
    });

    // +2 jump (mastery 1 -> 3) and the attempt records the ease signal for replay.
    expect(out.progress.masteryLevel).toBe(3);
    expect(out.progress.nextReviewDate).toBe(NOW + 7 * DAY_MS); // mastery 3 -> +7d
    expect(answerWriter.writes[0]!.attempt.userEase).toBe('easy');
    // scheduler_version stays frozen — replay faithfulness comes from the tag + signal.
    expect(answerWriter.writes[0]!.attempt.schedulerVersion).toBe('v1-fixed');
  });

  it('drops ease on a wrong answer (guard) — no acceleration, no recorded signal', async () => {
    const answerWriter = new MockAnswerWriter();
    const progress = new MockProgress();
    progress.store.set('a', {
      wordId: asWordId('a'),
      masteryLevel: 3,
      nextReviewDate: NOW,
      consecutiveCorrect: 0,
      totalAttempts: 0,
      totalCorrect: 0,
      schedulerVersion: 'v1-fixed',
    });
    const uc = new AnswerQuestionUseCase(answerWriter, progress, v1FixedScheduler, noopAnalytics);

    const out = await uc.execute({
      session: session([word('a')]),
      wordId: asWordId('a'),
      assessmentType: 'multiple_choice',
      userAnswer: 'wrong',
      correctAnswer: 'right',
      isCorrect: false,
      nowMs: NOW,
      ease: 'easy', // ignored — wrong answers can never accelerate
    });

    expect(out.progress.masteryLevel).toBe(2); // 3 - 1, ease ignored
    expect(out.progress.nextReviewDate).toBe(NOW + DAY_MS);
    expect(answerWriter.writes[0]!.attempt.userEase).toBeUndefined();
  });

  it('throws when the answered word is not the current question', async () => {
    const uc = new AnswerQuestionUseCase(
      new MockAnswerWriter(),
      new MockProgress(),
      v1FixedScheduler,
      noopAnalytics,
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
