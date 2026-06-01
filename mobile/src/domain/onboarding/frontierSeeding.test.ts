import {
  seedMasteryForRank,
  buildFrontierSeeds,
  estimateKnownCount,
} from '@/domain/onboarding/frontierSeeding';
import type { DiagnosticWordAnswer } from '@/domain/onboarding/adaptiveDiagnostic';
import type { Word } from '@/domain/vocabulary/Word';
import { asTierId, asWordId } from '@/domain/vocabulary/ids';

const TIER = asTierId('foundation');

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

describe('seedMasteryForRank', () => {
  it('seeds higher for words far more common than the frontier', () => {
    expect(seedMasteryForRank(400, 3000)).toBe(4); // ratio .13
    expect(seedMasteryForRank(1500, 3000)).toBe(3); // ratio .5
    expect(seedMasteryForRank(2800, 3000)).toBe(2); // ratio .93
  });

  it('seeds 1 just past the frontier (learning zone)', () => {
    expect(seedMasteryForRank(3300, 3000)).toBe(1); // ratio 1.1
  });

  it('seeds 0 well past the frontier (new)', () => {
    expect(seedMasteryForRank(6000, 3000)).toBe(0); // ratio 2.0
  });

  it('never seeds 5 even for the most common words', () => {
    expect(seedMasteryForRank(1, 9000)).toBeLessThanOrEqual(4);
  });

  it('returns 0 for a non-positive frontier', () => {
    expect(seedMasteryForRank(100, 0)).toBe(0);
  });
});

describe('buildFrontierSeeds', () => {
  const pool = [
    word('common', 300), // ratio .1 → 4
    word('mid', 1500), // ratio .5 → 3
    word('edge', 2900), // ratio .97 → 2
    word('beyond', 6000), // ratio 2 → 0, unanswered → NOT emitted
    word('noRank'), // no rank, unanswered → NOT emitted
  ];
  const FRONTIER = 3000;

  it('emits rank-heuristic seeds for unanswered ranked words above 0', () => {
    const seeds = buildFrontierSeeds(pool, FRONTIER, []);
    const byId = new Map(seeds.map((s) => [s.wordId, s.masteryLevel]));
    expect(byId.get(asWordId('common'))).toBe(4);
    expect(byId.get(asWordId('mid'))).toBe(3);
    expect(byId.get(asWordId('edge'))).toBe(2);
  });

  it('does NOT emit rows for words past the frontier or without a rank', () => {
    const seeds = buildFrontierSeeds(pool, FRONTIER, []);
    const ids = new Set(seeds.map((s) => s.wordId));
    expect(ids.has(asWordId('beyond'))).toBe(false);
    expect(ids.has(asWordId('noRank'))).toBe(false);
  });

  it('a directly-known answer overrides to at least seed 2', () => {
    const beyond = pool[3] as Word; // rank 6000, heuristic 0
    const seeds = buildFrontierSeeds(pool, FRONTIER, [answer(beyond, true)]);
    const got = seeds.find((s) => s.wordId === asWordId('beyond'));
    expect(got?.masteryLevel).toBe(2);
  });

  it('a directly-unknown answer emits a seed-0 row (prioritized, not left new)', () => {
    const common = pool[0] as Word; // rank 300, heuristic 4
    const seeds = buildFrontierSeeds(pool, FRONTIER, [answer(common, false)]);
    const got = seeds.find((s) => s.wordId === asWordId('common'));
    expect(got?.masteryLevel).toBe(0);
  });

  it('a directly-known answer keeps the higher rank heuristic when above 2', () => {
    const common = pool[0] as Word; // rank 300, heuristic 4
    const seeds = buildFrontierSeeds(pool, FRONTIER, [answer(common, true)]);
    const got = seeds.find((s) => s.wordId === asWordId('common'));
    expect(got?.masteryLevel).toBe(4);
  });

  it('seeds a directly-answered word even when it has no frequency rank', () => {
    const noRank = pool[4] as Word;
    const seeds = buildFrontierSeeds(pool, FRONTIER, [answer(noRank, true)]);
    const got = seeds.find((s) => s.wordId === asWordId('noRank'));
    expect(got?.masteryLevel).toBe(2); // max(2, heuristic 0)
  });

  it('caps heuristic seeds at maxSeeds, keeping the nearest-to-frontier', () => {
    // 5 ranked words below frontier 3000; cap heuristic seeds to 2 → keep the
    // two closest (2900, 2500), drop the far ones (300, 800, 1500).
    const dense = [
      word('r300', 300),
      word('r800', 800),
      word('r1500', 1500),
      word('r2500', 2500),
      word('r2900', 2900),
    ];
    const seeds = buildFrontierSeeds(dense, 3000, [], 2);
    const ids = new Set(seeds.map((s) => s.wordId));
    expect(seeds).toHaveLength(2);
    expect(ids.has(asWordId('r2900'))).toBe(true);
    expect(ids.has(asWordId('r2500'))).toBe(true);
  });

  it('the cap never drops directly-answered words', () => {
    const dense = [word('r300', 300), word('r800', 800), word('r2900', 2900)];
    const far = dense[0] as Word; // rank 300, far from frontier
    const seeds = buildFrontierSeeds(dense, 3000, [answer(far, true)], 1);
    const ids = new Set(seeds.map((s) => s.wordId));
    expect(ids.has(asWordId('r300'))).toBe(true); // directly answered, kept
    expect(seeds.length).toBe(2); // 1 direct + 1 heuristic (nearest = r2900)
  });
});

describe('estimateKnownCount', () => {
  it('is the frontier rank when the pool is larger', () => {
    expect(estimateKnownCount(2600, 3000)).toBe(2600);
  });

  it('is capped by the free pool size', () => {
    expect(estimateKnownCount(5000, 3000)).toBe(3000);
  });

  it('is 0 for a non-positive or non-finite frontier', () => {
    expect(estimateKnownCount(0, 3000)).toBe(0);
    expect(estimateKnownCount(Number.NaN, 3000)).toBe(0);
  });
});
