import { selectDistractors } from '@/domain/quiz/distractors';
import type { Word } from '@/domain/vocabulary/Word';
import { asTierId, asWordId } from '@/domain/vocabulary/ids';

function word(id: string, tier = 't1'): Word {
  return {
    id: asWordId(id),
    word: id,
    definition: 'd',
    tierId: asTierId(tier),
    wordType: 'vocabulary',
    exampleSentence: '_ x',
    synonyms: [],
    antonyms: [],
    isDeleted: false,
  };
}

// Deterministic RNG: always returns 0 (Fisher-Yates becomes a fixed rotation).
const zeroRng = () => 0;

describe('selectDistractors', () => {
  const target = word('target');
  const pool = [word('a'), word('b'), word('c'), word('target')];

  it('excludes the target', () => {
    const out = selectDistractors(target, pool, 3, zeroRng);
    expect(out.map((w) => w.id)).not.toContain('target');
  });

  it('returns the requested count when the pool is large enough', () => {
    expect(selectDistractors(target, pool, 3, zeroRng)).toHaveLength(3);
  });

  it('returns fewer when the pool is too small', () => {
    expect(selectDistractors(target, [word('a'), word('target')], 3, zeroRng)).toHaveLength(1);
  });

  it('only draws from the same tier', () => {
    const mixed = [word('a', 't1'), word('x', 't2'), word('y', 't2')];
    const out = selectDistractors(target, mixed, 5, zeroRng);
    expect(out.every((w) => w.tierId === target.tierId)).toBe(true);
    expect(out).toHaveLength(1);
  });

  it('is deterministic for a fixed RNG', () => {
    const a = selectDistractors(target, pool, 2, zeroRng).map((w) => w.id);
    const b = selectDistractors(target, pool, 2, zeroRng).map((w) => w.id);
    expect(a).toEqual(b);
  });
});
