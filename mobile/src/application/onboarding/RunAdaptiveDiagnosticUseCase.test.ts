import {
  RunAdaptiveDiagnosticUseCase,
  DEFAULT_PSEUDO_BUDGET,
} from '@/application/onboarding/RunAdaptiveDiagnosticUseCase';
import { v1FixedScheduler, DAY_MS } from '@/domain/srs/v1-fixed';
import type { Word } from '@/domain/vocabulary/Word';
import type { WordRepository, WordWithProgress } from '@/domain/vocabulary/WordRepository';
import type { UserProgressRepository } from '@/domain/user/UserProgressRepository';
import type { UserProgress } from '@/domain/user/UserProgress';
import type { PseudoWord, PseudoWordRepository } from '@/domain/onboarding/PseudoWord';
import type { DiagnosticWordAnswer } from '@/domain/onboarding/adaptiveDiagnostic';
import { asTierId, asWordId, type WordId } from '@/domain/vocabulary/ids';

const TIER = asTierId('foundation');
const NOW = Date.UTC(2026, 4, 24, 12, 0, 0);

function word(id: string, frequencyRank?: number): Word {
  return {
    id: asWordId(id),
    word: id,
    definition: `def ${id}`,
    tierId: TIER,
    wordType: 'vocabulary',
    frequencyRank,
    exampleSentence: '_ x',
    synonyms: [],
    antonyms: [],
    isDeleted: false,
  };
}

function answer(w: Word, known: boolean): DiagnosticWordAnswer {
  return { word: w, band: w.frequencyRank ?? 0, claimed: known, known };
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
}

class MockPseudo implements PseudoWordRepository {
  constructor(
    private readonly items: PseudoWord[] = [],
    private readonly throws = false,
  ) {}
  async getPseudoWords(limit: number): Promise<PseudoWord[]> {
    if (this.throws) throw new Error('no pseudo table');
    return this.items.slice(0, limit);
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

describe('RunAdaptiveDiagnosticUseCase.loadPool', () => {
  it('returns the tier pool, pseudo-words, and free pool size', async () => {
    const pool = [word('a', 100), word('b', 2000)];
    const pseudos: PseudoWord[] = [{ id: 'p1', word: 'blurp' }];
    const uc = new RunAdaptiveDiagnosticUseCase(
      new MockWords(pool),
      new MockPseudo(pseudos),
      new MockProgress(),
      v1FixedScheduler,
    );
    const loaded = await uc.loadPool(TIER);
    expect(loaded.pool).toHaveLength(2);
    expect(loaded.pseudoWords).toHaveLength(1);
    expect(loaded.freePoolSize).toBe(2);
  });

  it('limits pseudo-words to the requested budget', async () => {
    const pseudos: PseudoWord[] = Array.from({ length: 10 }, (_, i) => ({
      id: `p${i}`,
      word: `pw${i}`,
    }));
    const uc = new RunAdaptiveDiagnosticUseCase(
      new MockWords([]),
      new MockPseudo(pseudos),
      new MockProgress(),
      v1FixedScheduler,
    );
    const loaded = await uc.loadPool(TIER);
    expect(loaded.pseudoWords).toHaveLength(DEFAULT_PSEUDO_BUDGET);
  });

  it('degrades gracefully when the pseudo-word source throws (no lie detector)', async () => {
    const uc = new RunAdaptiveDiagnosticUseCase(
      new MockWords([word('a', 100)]),
      new MockPseudo([], true),
      new MockProgress(),
      v1FixedScheduler,
    );
    const loaded = await uc.loadPool(TIER);
    expect(loaded.pseudoWords).toEqual([]);
    expect(loaded.pool).toHaveLength(1);
  });
});

describe('RunAdaptiveDiagnosticUseCase.seed', () => {
  it('writes version-tagged seeds with scheduler-derived next review', async () => {
    const progress = new MockProgress();
    const uc = new RunAdaptiveDiagnosticUseCase(
      new MockWords([]),
      new MockPseudo(),
      progress,
      v1FixedScheduler,
    );

    const common = word('common', 300); // ratio .1 → seed 4 → interval 14d
    const edge = word('edge', 2900); // ratio .97 → seed 2 → interval 3d
    await uc.seed({ pool: [common, edge], frontierRank: 3000, answers: [], nowMs: NOW });

    const byId = new Map<WordId, UserProgress>(progress.upserts.map((p) => [p.wordId, p]));
    const c = byId.get(asWordId('common'));
    expect(c?.masteryLevel).toBe(4);
    expect(c?.schedulerVersion).toBe('v1-fixed');
    expect(c?.firstSeenAt).toBe(NOW);
    expect(c?.nextReviewDate).toBe(NOW + 14 * DAY_MS);

    const e = byId.get(asWordId('edge'));
    expect(e?.masteryLevel).toBe(2);
    expect(e?.nextReviewDate).toBe(NOW + 3 * DAY_MS);
  });

  it('a directly-unknown answer seeds mastery 0 due tomorrow', async () => {
    const progress = new MockProgress();
    const uc = new RunAdaptiveDiagnosticUseCase(
      new MockWords([]),
      new MockPseudo(),
      progress,
      v1FixedScheduler,
    );
    const common = word('common', 300); // would be heuristic 4...
    await uc.seed({
      pool: [common],
      frontierRank: 3000,
      answers: [answer(common, false)], // ...but directly missed → 0
      nowMs: NOW,
    });
    const got = progress.upserts.find((p) => p.wordId === asWordId('common'));
    expect(got?.masteryLevel).toBe(0);
    expect(got?.nextReviewDate).toBe(NOW + DAY_MS);
  });

  it('respects the maxSeeds cap', async () => {
    const progress = new MockProgress();
    const uc = new RunAdaptiveDiagnosticUseCase(
      new MockWords([]),
      new MockPseudo(),
      progress,
      v1FixedScheduler,
    );
    const pool = [word('a', 2900), word('b', 2500), word('c', 1500), word('d', 300)];
    await uc.seed({ pool, frontierRank: 3000, answers: [], nowMs: NOW, maxSeeds: 2 });
    expect(progress.upserts).toHaveLength(2); // nearest two to frontier
    const ids = new Set(progress.upserts.map((p) => p.wordId));
    expect(ids.has(asWordId('a'))).toBe(true);
    expect(ids.has(asWordId('b'))).toBe(true);
  });
});
