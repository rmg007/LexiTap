import type { Word } from '@/domain/vocabulary/Word';

// Distractor selection for multiple-choice / matching assessments. Pure:
// randomness is injected as a [0,1) generator so tests are deterministic.
// Distractors are drawn from the SAME tier as the target (similar difficulty
// and theme), never the target itself.

export type RandomFn = () => number;

// Fisher-Yates using the injected RNG. Returns a new array.
function shuffle<T>(items: readonly T[], random: RandomFn): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const a = out[i];
    const b = out[j];
    if (a !== undefined && b !== undefined) {
      out[i] = b;
      out[j] = a;
    }
  }
  return out;
}

/**
 * Pick up to `count` distractor words from the same-tier pool, excluding the
 * target. Returns fewer than `count` only if the pool is too small.
 */
export function selectDistractors(
  target: Word,
  sameTierPool: readonly Word[],
  count: number,
  random: RandomFn,
): Word[] {
  const candidates = sameTierPool.filter(
    (w) => w.id !== target.id && w.tierId === target.tierId,
  );
  return shuffle(candidates, random).slice(0, Math.max(0, count));
}
