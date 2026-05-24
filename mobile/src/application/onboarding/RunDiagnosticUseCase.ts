import type { TierId } from '@/domain/vocabulary/ids';
import type { Word } from '@/domain/vocabulary/Word';
import type { WordRepository } from '@/domain/vocabulary/WordRepository';
import type { UserProgressRepository } from '@/domain/user/UserProgressRepository';
import type { UserProgress, MasteryLevel } from '@/domain/user/UserProgress';
import type { Scheduler } from '@/domain/srs/Scheduler';
import { DAY_MS } from '@/domain/srs/v1-fixed';
import {
  DEFAULT_DIAGNOSTIC_SIZE,
  selectDiagnosticSample,
  seedMasteryFromResults,
  type DiagnosticResult,
} from '@/domain/onboarding/diagnostic';

// First-run onboarding diagnostic. Picks a short sample spanning the tier's
// difficulty range, then (after the learner grades it in the UI) seeds initial
// UserProgress mastery so the first real session is appropriately leveled.
//
// Pure decisions live in @/domain/onboarding/diagnostic; this use case only
// orchestrates I/O through injected ports — NO infrastructure imports.

export interface DiagnosticSampleResult {
  words: Word[];
}

export interface SeedDiagnosticInput {
  // The graded answers for the sampled words (right/wrong per word).
  results: readonly DiagnosticResult[];
  nowMs: number;
}

export class RunDiagnosticUseCase {
  constructor(
    private readonly words: WordRepository,
    private readonly progress: UserProgressRepository,
    private readonly scheduler: Scheduler,
  ) {}

  /** Choose the diagnostic words for a tier (deterministic, spans difficulty). */
  async sample(
    tierId: TierId,
    size: number = DEFAULT_DIAGNOSTIC_SIZE,
  ): Promise<DiagnosticSampleResult> {
    const pool = await this.words.getWordsByTier(tierId);
    return { words: selectDiagnosticSample(pool, size) };
  }

  /**
   * Seed initial UserProgress rows from the graded diagnostic. Every write is
   * tagged with the scheduler version (hard rule). nextReviewDate is derived
   * from the scheduler so the v1-fixed interval ladder stays the single source
   * of interval math.
   */
  async seed(input: SeedDiagnosticInput): Promise<void> {
    const { results, nowMs } = input;
    const seeds = seedMasteryFromResults(results);

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

  // Derive the next-review timestamp for a freshly seeded mastery level. A seed
  // of 0 (didn't know it) is due tomorrow; a positive seed reuses the
  // scheduler's interval for arriving AT that level via a correct step, so the
  // interval ladder lives in exactly one place (v1-fixed).
  private nextReviewForSeed(seed: MasteryLevel, nowMs: number): number {
    if (seed <= 0) return nowMs + DAY_MS;
    const priorLevel = (seed - 1) as MasteryLevel;
    return this.scheduler.next({ masteryLevel: priorLevel, isCorrect: true, now: nowMs })
      .nextReviewDate;
  }
}
