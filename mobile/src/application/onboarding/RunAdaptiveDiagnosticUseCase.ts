import type { TierId } from '@/domain/vocabulary/ids';
import type { Word } from '@/domain/vocabulary/Word';
import type { WordRepository } from '@/domain/vocabulary/WordRepository';
import type { UserProgressRepository } from '@/domain/user/UserProgressRepository';
import type { UserProgress, MasteryLevel } from '@/domain/user/UserProgress';
import type { Scheduler } from '@/domain/srs/Scheduler';
import { DAY_MS } from '@/domain/srs/v1-fixed';
import type { PseudoWord, PseudoWordRepository } from '@/domain/onboarding/PseudoWord';
import type { DiagnosticWordAnswer } from '@/domain/onboarding/adaptiveDiagnostic';
import { buildFrontierSeeds } from '@/domain/onboarding/frontierSeeding';

// DIAG-A use case (PB-4): the I/O orchestration around the pure band-walk engine
// (domain/onboarding/adaptiveDiagnostic) and the pure frontier seeder
// (domain/onboarding/frontierSeeding). The interactive item loop lives in the
// screen (it needs a tap per item); this use case only does the I/O the screen
// can't: load the word + pseudo-word pools, and persist the SRS seeds + nothing
// else. NO infrastructure imports — everything flows through injected ports.

/** Pools + sizing the screen needs to run one diagnostic. */
export interface AdaptiveDiagnosticPool {
  /** Tier words (carry frequencyRank) the engine walks over. */
  pool: Word[];
  /** Interleaved lie-detector non-words for this run. */
  pseudoWords: PseudoWord[];
  /** Free-pool size, for the Knowledge Map known-count cap. */
  freePoolSize: number;
}

export interface SeedAdaptiveDiagnosticInput {
  /** The tier word pool the diagnostic ran against. */
  pool: readonly Word[];
  /** The corrected frontier rank (after pseudo-word correction). */
  frontierRank: number;
  /** The directly-graded real-word answers from the run. */
  answers: readonly DiagnosticWordAnswer[];
  nowMs: number;
  /** Cap on heuristic seeds written (defaults to DEFAULT_MAX_SEEDS). */
  maxSeeds?: number;
}

// Default pseudo-words per run (DIAG_A plan decision point 3: "items 5–20 of ~25").
export const DEFAULT_PSEUDO_BUDGET = 3;

// Cap on heuristic seed writes. Bounds first-run latency: directly-answered words
// are always seeded; the nearest-to-frontier heuristic seeds fill the rest. 400
// near-frontier words is plenty of day-1 review material without thousands of
// synchronous upserts (DIAG_A success criterion: concentrate day-1 reviews).
export const DEFAULT_MAX_SEEDS = 400;

export class RunAdaptiveDiagnosticUseCase {
  constructor(
    private readonly words: WordRepository,
    private readonly pseudoWords: PseudoWordRepository,
    private readonly progress: UserProgressRepository,
    private readonly scheduler: Scheduler,
  ) {}

  /** Load the word pool + pseudo-words for one diagnostic run against `tierId`. */
  async loadPool(
    tierId: TierId,
    pseudoBudget: number = DEFAULT_PSEUDO_BUDGET,
  ): Promise<AdaptiveDiagnosticPool> {
    const pool = await this.words.getWordsByTier(tierId);
    // Pseudo-words are best-effort: a missing table / empty result just means the
    // run has no lie detector (false-alarm rate 0), never a failed diagnostic.
    let pseudoWords: PseudoWord[] = [];
    try {
      pseudoWords = await this.pseudoWords.getPseudoWords(pseudoBudget);
    } catch {
      pseudoWords = [];
    }
    return { pool, pseudoWords, freePoolSize: pool.length };
  }

  /**
   * Seed initial UserProgress from the finished diagnostic. Every write is
   * scheduler-version tagged (hard rule) and its nextReviewDate is derived from
   * the scheduler, so the v1-fixed interval ladder stays the single source of
   * interval math (identical contract to RunDiagnosticUseCase.seed).
   */
  async seed(input: SeedAdaptiveDiagnosticInput): Promise<void> {
    const { pool, frontierRank, answers, nowMs, maxSeeds = DEFAULT_MAX_SEEDS } = input;
    const seeds = buildFrontierSeeds(pool, frontierRank, answers, maxSeeds);

    for (const seed of seeds) {
      const nextReviewDate = this.nextReviewForSeed(seed.masteryLevel, nowMs);
      const progress: UserProgress = {
        wordId: seed.wordId,
        masteryLevel: seed.masteryLevel,
        nextReviewDate,
        consecutiveCorrect: 0,
        totalAttempts: 0,
        totalCorrect: 0,
        firstSeenAt: nowMs,
        schedulerVersion: this.scheduler.version,
      };
      await this.progress.upsert(progress);
    }
  }

  // Next-review timestamp for a freshly seeded mastery level: a 0 seed (new /
  // didn't know it) is due tomorrow; a positive seed reuses the scheduler's
  // interval for arriving AT that level via a correct step, so the interval
  // ladder lives in exactly one place (v1-fixed). Same logic as the DIAG-B seeder.
  private nextReviewForSeed(seed: MasteryLevel, nowMs: number): number {
    if (seed <= 0) return nowMs + DAY_MS;
    const priorLevel = (seed - 1) as MasteryLevel;
    return this.scheduler.next({ masteryLevel: priorLevel, isCorrect: true, now: nowMs })
      .nextReviewDate;
  }
}
