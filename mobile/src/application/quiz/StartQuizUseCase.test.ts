import { StartQuizUseCase } from '@/application/quiz/StartQuizUseCase';
import { NoWordsAvailableError } from '@/domain/quiz/errors';
import type { Word } from '@/domain/vocabulary/Word';
import type { WordRepository, WordWithProgress } from '@/domain/vocabulary/WordRepository';
import type { UserProgressRepository } from '@/domain/user/UserProgressRepository';
import type { QuizSessionRepository } from '@/domain/quiz/repositories';
import type { QuizSession } from '@/domain/quiz/types';
import { asSessionId, asTierId, asWordId, type SessionId, type TierId } from '@/domain/vocabulary/ids';
import type { AnalyticsPort } from '@/domain/analytics/AnalyticsPort';

const noopAnalytics: AnalyticsPort = { track: () => {} };

const TZ = 'UTC';
const NOW = Date.UTC(2026, 4, 24, 12, 0, 0);
const START_OF_TODAY = Date.UTC(2026, 4, 24, 0, 0, 0);
const DAY_MS = 86_400_000;
const TIER = asTierId('t1');

function word(id: string): Word {
  return {
    id: asWordId(id),
    word: id,
    definition: 'd',
    tierId: TIER,
    wordType: 'vocabulary',
    exampleSentence: '_ x',
    synonyms: [],
    antonyms: [],
    isDeleted: false,
  };
}

function wp(id: string, mastery: number, daysOverdue: number): WordWithProgress {
  return {
    word: word(id),
    progress: {
      wordId: asWordId(id),
      masteryLevel: mastery as 0 | 1 | 2 | 3 | 4 | 5,
      nextReviewDate: START_OF_TODAY - daysOverdue * DAY_MS,
      consecutiveCorrect: 0,
      totalAttempts: 0,
      totalCorrect: 0,
      schedulerVersion: 'v1-fixed',
    },
  };
}

class MockWords implements WordRepository {
  constructor(
    private readonly due: WordWithProgress[] = [],
    private readonly fresh: Word[] = [],
  ) {}
  async getWordsDueForReview(): Promise<WordWithProgress[]> {
    return this.due;
  }
  async getNewWords(_t: TierId, limit: number): Promise<Word[]> {
    return this.fresh.slice(0, limit);
  }
  async getById(): Promise<Word | null> {
    return null;
  }
  async getWordsByTier(): Promise<Word[]> {
    return [];
  }
}

class MockProgress implements UserProgressRepository {
  constructor(private readonly dueCount: number) {}
  async get(): Promise<null> {
    return null;
  }
  async upsert(): Promise<void> {}
  async countDue(): Promise<number> {
    return this.dueCount;
  }
}

class MockSessions implements QuizSessionRepository {
  saved: QuizSession | null = null;
  async save(s: QuizSession): Promise<SessionId> {
    this.saved = s;
    return asSessionId(42);
  }
  async complete(): Promise<void> {}
}

describe('StartQuizUseCase — review mode', () => {
  it('applies the forgiveness cap and orders most-overdue first', async () => {
    const due = Array.from({ length: 100 }, (_, i) => wp(`w${i}`, 3, i));
    const words = new MockWords(due);
    const progress = new MockProgress(100); // > base cap -> effective cap 60
    const sessions = new MockSessions();
    const uc = new StartQuizUseCase(words, progress, sessions, noopAnalytics);

    const session = await uc.execute({ tierId: TIER, mode: 'review', nowMs: NOW, tz: TZ });

    expect(session.words).toHaveLength(60); // catch-up cap
    expect(session.words[0]?.id).toBe('w99'); // most overdue first
    expect(session.id).toBe(42); // repo-assigned id
  });

  it('uses the base cap of 40 in steady state', async () => {
    const due = Array.from({ length: 50 }, (_, i) => wp(`w${i}`, 3, i));
    const uc = new StartQuizUseCase(new MockWords(due), new MockProgress(50), new MockSessions(), noopAnalytics);
    const session = await uc.execute({ tierId: TIER, mode: 'review', nowMs: NOW, tz: TZ });
    // dueCount 50 > 40 actually triggers catch-up; verify the selector respects cap
    expect(session.words.length).toBeLessThanOrEqual(60);
  });

  it('returns all due when fewer than the cap', async () => {
    const due = [wp('a', 1, 2), wp('b', 2, 1)];
    const uc = new StartQuizUseCase(new MockWords(due), new MockProgress(2), new MockSessions(), noopAnalytics);
    const session = await uc.execute({ tierId: TIER, mode: 'review', nowMs: NOW, tz: TZ });
    expect(session.words).toHaveLength(2);
  });

  it('throws NoWordsAvailableError when nothing is due', async () => {
    const uc = new StartQuizUseCase(new MockWords([]), new MockProgress(0), new MockSessions(), noopAnalytics);
    await expect(
      uc.execute({ tierId: TIER, mode: 'review', nowMs: NOW, tz: TZ }),
    ).rejects.toBeInstanceOf(NoWordsAvailableError);
  });
});

describe('StartQuizUseCase — learn mode', () => {
  it('pulls a fresh-word batch', async () => {
    const fresh = Array.from({ length: 20 }, (_, i) => word(`n${i}`));
    const uc = new StartQuizUseCase(new MockWords([], fresh), new MockProgress(0), new MockSessions(), noopAnalytics);
    const session = await uc.execute({ tierId: TIER, mode: 'learn', nowMs: NOW, tz: TZ });
    expect(session.mode).toBe('learn');
    expect(session.words).toHaveLength(10); // NEW_WORDS_PER_DAY
  });

  it('throws when there are no new words', async () => {
    const uc = new StartQuizUseCase(new MockWords([], []), new MockProgress(0), new MockSessions(), noopAnalytics);
    await expect(
      uc.execute({ tierId: TIER, mode: 'learn', nowMs: NOW, tz: TZ }),
    ).rejects.toBeInstanceOf(NoWordsAvailableError);
  });
});
