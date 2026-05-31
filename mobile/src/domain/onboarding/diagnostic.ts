import type { Word } from '@/domain/vocabulary/Word';
import type { WordId } from '@/domain/vocabulary/ids';
import type { MasteryLevel } from '@/domain/user/UserProgress';

// Pure onboarding-diagnostic logic. No I/O, no randomness side effects (an RNG
// is injected). The use case (application layer) owns persistence; this module
// only decides WHICH words to sample and WHAT seed mastery a result implies.
//
// Rationale: instead of starting every new learner at mastery 0, a short
// diagnostic spanning the tier's difficulty range lets us seed initial mastery
// so the first real session is appropriately leveled (offline, deterministic).

export const DEFAULT_DIAGNOSTIC_SIZE = 5;

// A word's difficulty band drives how confident we are in a correct answer.
// Word.difficulty is an optional 1-5; absent difficulty is treated as mid (3).
function difficultyOf(word: Word): number {
  const d = word.difficulty ?? 3;
  if (d < 1) return 1;
  if (d > 5) return 5;
  return d;
}

/**
 * Pick up to `size` words spanning the tier's difficulty range. Deterministic:
 * words are sorted by difficulty (then by id for stable ordering) and sampled
 * at even strides so easy/medium/hard are all represented. Returns fewer than
 * `size` only when the pool is smaller than `size`.
 */
export function selectDiagnosticSample(
  pool: readonly Word[],
  size: number = DEFAULT_DIAGNOSTIC_SIZE,
): Word[] {
  const wanted = Math.max(0, Math.floor(size));
  if (wanted === 0 || pool.length === 0) return [];
  if (pool.length <= wanted) return [...pool];

  const sorted = [...pool].sort((a, b) => {
    const byDiff = difficultyOf(a) - difficultyOf(b);
    return byDiff !== 0 ? byDiff : a.id.localeCompare(b.id);
  });

  // Even strides across the sorted range so the sample spans difficulty.
  const out: Word[] = [];
  const step = (sorted.length - 1) / (wanted - 1);
  for (let i = 0; i < wanted; i++) {
    const idx = Math.round(i * step);
    const picked = sorted[idx];
    if (picked !== undefined) out.push(picked);
  }
  return out;
}

// One graded diagnostic answer: did the learner know this word?
export interface DiagnosticResult {
  word: Word;
  isCorrect: boolean;
}

// A seed instruction the use case turns into a UserProgress row.
export interface SeedMastery {
  wordId: WordId;
  masteryLevel: MasteryLevel;
}

function clampMastery(value: number): MasteryLevel {
  if (value <= 0) return 0;
  if (value >= 5) return 5;
  return value as MasteryLevel;
}

/**
 * Map one graded result to a seed mastery level.
 *
 * Rule (SRS v1 has mastery 0-5):
 *  - Wrong  -> 0 (treat as brand new; the learner clearly needs it).
 *  - Right  -> a seed proportional to the word's difficulty band, so getting a
 *    HARD word right credits more prior knowledge than an easy one:
 *      difficulty 1-2 -> seed 2
 *      difficulty 3   -> seed 3
 *      difficulty 4-5 -> seed 4
 *    (We never seed the max 5 from a single diagnostic question — mastery 5 must
 *    be earned through real spaced reviews.)
 */
export function seedMasteryFor(result: DiagnosticResult): MasteryLevel {
  if (!result.isCorrect) return 0;
  const d = difficultyOf(result.word);
  if (d <= 2) return clampMastery(2);
  if (d === 3) return clampMastery(3);
  return clampMastery(4);
}

/** Map a full diagnostic to the seed-mastery instructions for each sampled word. */
export function seedMasteryFromResults(results: readonly DiagnosticResult[]): SeedMastery[] {
  return results.map((r) => ({ wordId: r.word.id, masteryLevel: seedMasteryFor(r) }));
}

/**
 * Estimate the learner's vocabulary frontier (frequency rank) from the stride
 * sampler results. A crude DIAG-B estimate: % correct → frontier rank.
 *
 * Range: 500 (knew 0/5) to 3500 (knew 5/5), scaled linearly.
 */
export function estimateFrontierFromResults(results: readonly DiagnosticResult[]): number {
  if (results.length === 0) return 2000; // Default to mid-range if empty.
  const correct = results.filter((r) => r.isCorrect).length;
  const pct = correct / results.length;
  // Linear scale: 0% → 500, 100% → 3500.
  return Math.round(500 + pct * 3000);
}
