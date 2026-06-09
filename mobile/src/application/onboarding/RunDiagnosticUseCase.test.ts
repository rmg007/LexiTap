import { RunDiagnosticUseCase } from '@/application/onboarding/RunDiagnosticUseCase';
import {
  selectDiagnosticSample,
  seedMasteryFor,
  seedMasteryFromResults,
  estimateFrontierFromResults,
} from '@/domain/onboarding/diagnostic';
import { v1FixedScheduler, DAY_MS } from '@/domain/srs/v1-fixed';
import type { Word } from '@/domain/vocabulary/Word';
import type { WordRepository, WordWithProgress } from '@/domain/vocabulary/WordRepository';
import type { UserProgressRepository } from '@/domain/user/UserProgressRepository';
import type { UserProgress } from '@/domain/user/UserProgress';
import { asTierId, asWordId, type WordId } from '@/domain/vocabulary/ids';

const TIER = asTierId('t1');
const NOW = Date.UTC(2026, 4, 24, 12, 0, 0);

function word(id: string, difficulty?: number): Word {
  return {
    id: asWordId(id),
    word: id,
    definition: 'd',
    tierId: TIER,
    wordType: 'vocabulary',
    difficulty,
    exampleSentence: '_ x',
    synonyms: [],
    antonyms: [],
    isDeleted: false,
  };
}

class MockWords implements WordRepository {
  constructor(private readonly byTier: Word[] = []) {}
  async getWordsDueForReview(): Promise<WordWithProgress[]> {
    return [];
  }
  async getNewWords(): Promise<Word[]> {
    return [];
  }
  async getById(): Promise<Word | null> {
    return null;
  }
  async getWordsByTier(): Promise<Word[]> {
    return this.byTier;
  }
  async getSensesForWord(): Promise<never[]> {
    return [];
  }
}

class MockProgress implements UserProgressRepository {
  upserts: UserProgress[] = [];
  async get(): Promise<UserProgress | null> {
    return null;
  }
  async upsert(p: UserProgress): Promise<void> {
    this.upserts.push(p);
  }
  async countDue(): Promise<number> {
    return 0;
  }
}

describe('selectDiagnosticSample', () => {
  it('returns the whole pool when smaller than the sample size', () => {
    const pool = [word('a', 1), word('b', 5)];
    expect(selectDiagnosticSample(pool, 5)).toHaveLength(2);
  });

  it('spans difficulty: includes both easiest and hardest', () => {
    const pool = Array.from({ length: 20 }, (_, i) => word(`w${i}`, (i % 5) + 1));
    const sample = selectDiagnosticSample(pool, 5);
    expect(sample).toHaveLength(5);
    const diffs = sample.map((w) => w.difficulty);
    expect(Math.min(...(diffs as number[]))).toBe(1);
    expect(Math.max(...(diffs as number[]))).toBe(5);
  });

  it('is deterministic for the same input', () => {
    const pool = Array.from({ length: 12 }, (_, i) => word(`w${i}`, (i % 5) + 1));
    expect(selectDiagnosticSample(pool, 5).map((w) => w.id)).toEqual(
      selectDiagnosticSample(pool, 5).map((w) => w.id),
    );
  });
});

describe('seedMasteryFor', () => {
  it('seeds 0 for a wrong answer regardless of difficulty', () => {
    expect(seedMasteryFor({ word: word('a', 5), isCorrect: false })).toBe(0);
  });

  it('seeds higher mastery for a harder word answered correctly', () => {
    expect(seedMasteryFor({ word: word('easy', 1), isCorrect: true })).toBe(2);
    expect(seedMasteryFor({ word: word('mid', 3), isCorrect: true })).toBe(3);
    expect(seedMasteryFor({ word: word('hard', 5), isCorrect: true })).toBe(4);
  });

  it('treats missing difficulty as mid (seed 3 when correct)', () => {
    expect(seedMasteryFor({ word: word('x'), isCorrect: true })).toBe(3);
  });
});

describe('RunDiagnosticUseCase.sample', () => {
  it('samples words spanning the tier', async () => {
    const pool = Array.from({ length: 10 }, (_, i) => word(`w${i}`, (i % 5) + 1));
    const uc = new RunDiagnosticUseCase(new MockWords(pool), new MockProgress(), v1FixedScheduler);
    const { words } = await uc.sample(TIER, 5);
    expect(words).toHaveLength(5);
  });
});

describe('RunDiagnosticUseCase.seed', () => {
  it('upserts version-tagged progress with scheduler-derived next review', async () => {
    const progress = new MockProgress();
    const uc = new RunDiagnosticUseCase(new MockWords([]), progress, v1FixedScheduler);

    const results = [
      { word: word('hard', 5), isCorrect: true }, // seed 4 -> interval for mastery 4 = 14d
      { word: word('miss', 2), isCorrect: false }, // seed 0 -> due in 1d
    ];
    await uc.seed({ results, nowMs: NOW });

    expect(progress.upserts).toHaveLength(2);
    const byId = new Map<WordId, UserProgress>(progress.upserts.map((p) => [p.wordId, p]));

    const hard = byId.get(asWordId('hard'));
    expect(hard?.masteryLevel).toBe(4);
    expect(hard?.schedulerVersion).toBe('v1-fixed');
    expect(hard?.firstSeenAt).toBe(NOW);
    expect(hard?.nextReviewDate).toBe(NOW + 14 * DAY_MS);

    const miss = byId.get(asWordId('miss'));
    expect(miss?.masteryLevel).toBe(0);
    expect(miss?.nextReviewDate).toBe(NOW + DAY_MS);
  });

  it('maps every result to a seed', () => {
    const results = [
      { word: word('a', 1), isCorrect: true },
      { word: word('b', 3), isCorrect: false },
    ];
    expect(seedMasteryFromResults(results)).toEqual([
      { wordId: asWordId('a'), masteryLevel: 2 },
      { wordId: asWordId('b'), masteryLevel: 0 },
    ]);
  });
});

describe('estimateFrontierFromResults', () => {
  it('returns default for empty results', () => {
    expect(estimateFrontierFromResults([])).toBe(2000);
  });

  it('scales from 500 (0 correct) to 3500 (all correct)', () => {
    expect(estimateFrontierFromResults([{ word: word('a'), isCorrect: false }])).toBe(500);
    expect(estimateFrontierFromResults([{ word: word('a'), isCorrect: true }])).toBe(3500);
  });

  it('interpolates for mixed results', () => {
    const half = [
      { word: word('a'), isCorrect: true },
      { word: word('b'), isCorrect: false },
    ];
    expect(estimateFrontierFromResults(half)).toBe(2000); // 50% → mid-range
  });

  it('scales correctly for 3/5 correct', () => {
    const results = [
      { word: word('a'), isCorrect: true },
      { word: word('b'), isCorrect: true },
      { word: word('c'), isCorrect: true },
      { word: word('d'), isCorrect: false },
      { word: word('e'), isCorrect: false },
    ];
    // 3/5 = 60% → 500 + 0.6*3000 = 2300
    expect(estimateFrontierFromResults(results)).toBe(2300);
  });
});
