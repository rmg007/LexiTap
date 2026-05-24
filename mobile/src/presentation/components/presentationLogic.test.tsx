import { clampProgress } from '@/presentation/components/ProgressBar';
import { resolveStreakVisualState } from '@/presentation/components/StreakBadge';
import { buildQuestion } from '@/presentation/screens/quizQuestion';
import { asTierId, asWordId } from '@/domain/index';
import type { Word } from '@/domain/index';

// Pure presentational-logic tests (no renderer required).

describe('clampProgress', () => {
  it('clamps into [0, 1] and handles NaN', () => {
    expect(clampProgress(-0.5)).toBe(0);
    expect(clampProgress(0.42)).toBe(0.42);
    expect(clampProgress(1.5)).toBe(1);
    expect(clampProgress(Number.NaN)).toBe(0);
  });
});

describe('resolveStreakVisualState', () => {
  it('shows frozen when a freeze was consumed (highest precedence)', () => {
    expect(
      resolveStreakVisualState({ currentStreak: 5, atRisk: true, freezeConsumed: true }),
    ).toBe('frozen');
  });

  it('shows at_risk for an active streak not yet completed today', () => {
    expect(resolveStreakVisualState({ currentStreak: 5, atRisk: true })).toBe('at_risk');
  });

  it('shows active for a positive streak completed today', () => {
    expect(resolveStreakVisualState({ currentStreak: 5, atRisk: false })).toBe('active');
  });

  it('shows none for a zero streak', () => {
    expect(resolveStreakVisualState({ currentStreak: 0, atRisk: false })).toBe('none');
  });
});

describe('buildQuestion', () => {
  const tierId = asTierId('foundation');
  const mkWord = (id: string, word: string, definition: string): Word => ({
    id: asWordId(id),
    word,
    definition,
    tierId,
    wordType: 'vocabulary',
    exampleSentence: `Use _ in a sentence about ${word}.`,
    synonyms: [],
    antonyms: [],
    isDeleted: false,
  });

  const target = mkWord('w1', 'diligent', 'hard-working and careful');
  const pool: Word[] = [
    target,
    mkWord('w2', 'lazy', 'careless and idle'),
    mkWord('w3', 'wealthy', 'having much money'),
    mkWord('w4', 'candid', 'honest and direct'),
  ];
  // Deterministic RNG: always 0 -> stable shuffle.
  const rng = (): number => 0;

  it('builds a multiple_choice question with the target definition as correct', () => {
    const q = buildQuestion({ target, pool, assessmentType: 'multiple_choice', random: rng });
    expect(q.prompt).toBe('diligent');
    expect(q.correctValue).toBe('hard-working and careful');
    expect(q.options.some((o) => o.value === q.correctValue)).toBe(true);
    expect(q.options).toHaveLength(4); // target + 3 distractors
    // The correct value must be present exactly once.
    expect(q.options.filter((o) => o.value === q.correctValue)).toHaveLength(1);
  });

  it('builds a word-as-answer question for drag_drop with the target word as correct', () => {
    const q = buildQuestion({ target, pool, assessmentType: 'drag_drop', random: rng });
    expect(q.correctValue).toBe('diligent');
    expect(q.sentence).toContain('_');
    expect(q.options.some((o) => o.value === 'diligent')).toBe(true);
  });

  it('never includes the target itself as a distractor twice', () => {
    const q = buildQuestion({ target, pool, assessmentType: 'multiple_choice', random: rng });
    const ids = q.options.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('returns fewer options when the pool is small', () => {
    const q = buildQuestion({
      target,
      pool: [target, pool[1] as Word],
      assessmentType: 'multiple_choice',
      random: rng,
    });
    expect(q.options).toHaveLength(2);
  });
});
