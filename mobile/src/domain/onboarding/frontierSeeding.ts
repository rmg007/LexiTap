import type { Word } from '@/domain/vocabulary/Word';
import type { MasteryLevel } from '@/domain/user/UserProgress';
import type { SeedMastery } from '@/domain/onboarding/diagnostic';
import type { DiagnosticWordAnswer } from '@/domain/onboarding/adaptiveDiagnostic';

// DIAG-A payoff (PB-5 + PB-6): turn a learner's estimated frontier rank into
// initial SRS seeds + a Knowledge Map count. PURE — the use case persists the
// SeedMastery rows; this module only decides the seed level per word.
//
// Premise: a word's distance from the frontier predicts mastery. Words far more
// common than the frontier are almost surely known (high seed); words at the
// frontier are shaky (low seed); words past it are new (no seed, default state).
// Words the learner answered DIRECTLY during the diagnostic override the
// rank heuristic — a confirmed Yes/No is stronger evidence than position.

function clampMastery(value: number): MasteryLevel {
  if (value <= 0) return 0;
  if (value >= 5) return 5;
  return value as MasteryLevel;
}

/**
 * Seed mastery for a word from its frequency rank relative to the frontier.
 * `ratio = wordRank / frontierRank`:
 *   ≤ 0.40 → 4 (deeply within known vocabulary)
 *   ≤ 0.70 → 3
 *   ≤ 1.00 → 2 (inside the frontier but near the edge)
 *   ≤ 1.15 → 1 (just past the frontier — actively learning)
 *   else   → 0 (new; effectively unseeded)
 * Never seeds 5 — mastery 5 must be earned through real spaced reviews (same
 * rule as DIAG-B seedMasteryFor).
 */
export function seedMasteryForRank(wordRank: number, frontierRank: number): MasteryLevel {
  if (frontierRank <= 0) return 0;
  const ratio = wordRank / frontierRank;
  if (ratio <= 0.4) return clampMastery(4);
  if (ratio <= 0.7) return clampMastery(3);
  if (ratio <= 1.0) return clampMastery(2);
  if (ratio <= 1.15) return clampMastery(1);
  return 0;
}

/**
 * Build the seed-mastery instructions for a pool given the estimated frontier
 * and the diagnostic's directly-graded answers.
 *
 * - Directly answered + known  → at least seed 2, or the rank heuristic if higher.
 * - Directly answered + unknown → seed 0 (emitted, so the word is prioritized as
 *   due-soon rather than left in the undifferentiated "new" pool).
 * - Not answered                → the rank heuristic; emitted ONLY when > 0, so
 *   words past the frontier stay "new" (no row) and writes stay bounded.
 *
 * Words without a frequency rank can't be placed relative to the frontier, so
 * they're seeded only if they were directly answered.
 *
 * `maxSeeds` caps how many heuristic (non-directly-answered) seeds are emitted,
 * keeping the directly-answered ones unconditionally. When the cap bites, the
 * seeds NEAREST the frontier win — those drive the day-1 reviews the diagnostic
 * exists to concentrate (a far-below-frontier "known" word seeded at 4 is due in
 * ~2 weeks, so dropping it costs little). Omit for an unbounded build (tests).
 */
export function buildFrontierSeeds(
  pool: readonly Word[],
  frontierRank: number,
  answers: readonly DiagnosticWordAnswer[],
  maxSeeds?: number,
): SeedMastery[] {
  const answered = new Map<string, DiagnosticWordAnswer>(answers.map((a) => [a.word.id, a]));
  const direct: SeedMastery[] = [];
  // Heuristic candidates carry their frontier distance so the cap keeps the nearest.
  const heuristic: { seed: SeedMastery; distance: number }[] = [];

  for (const w of pool) {
    const answeredEntry = answered.get(w.id);
    if (answeredEntry) {
      const h =
        w.frequencyRank === undefined ? 0 : seedMasteryForRank(w.frequencyRank, frontierRank);
      const level: MasteryLevel = answeredEntry.known ? clampMastery(Math.max(2, h)) : 0;
      direct.push({ wordId: w.id, masteryLevel: level });
      continue;
    }
    if (w.frequencyRank === undefined) continue;
    const level = seedMasteryForRank(w.frequencyRank, frontierRank);
    if (level > 0) {
      heuristic.push({
        seed: { wordId: w.id, masteryLevel: level },
        distance: Math.abs(w.frequencyRank - frontierRank),
      });
    }
  }

  heuristic.sort((a, b) => a.distance - b.distance);
  const kept =
    maxSeeds === undefined ? heuristic : heuristic.slice(0, Math.max(0, Math.floor(maxSeeds)));
  return [...direct, ...kept.map((h) => h.seed)];
}

/**
 * Estimate how many words the learner already knows for the Knowledge Map (PC-2):
 * everything more common than the frontier, capped by how many words actually
 * exist in the free pool. Defensive against a NaN/negative frontier.
 */
export function estimateKnownCount(frontierRank: number, freePoolSize: number): number {
  if (!Number.isFinite(frontierRank) || frontierRank <= 0) return 0;
  return Math.min(Math.round(frontierRank), Math.max(0, Math.round(freePoolSize)));
}
