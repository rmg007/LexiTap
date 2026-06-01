import {
  DEFAULT_BAND_WALK_CONFIG,
  initDiagnostic,
  selectNearestWord,
  processAnswer,
  shouldStop,
  shouldInjectPseudo,
  PSEUDO_SPACING,
  estimateFrontierRank,
  falseAlarmRate,
  applyPseudoWordCorrection,
  finalFrontierRank,
  startBandForProficiency,
  type DiagnosticState,
  type DiagnosticAnswer,
} from '@/domain/onboarding/adaptiveDiagnostic';
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

function wordAnswer(w: Word, claimed: boolean, confirmed: boolean): DiagnosticAnswer {
  return { kind: 'word', word: w, claimed, confirmed };
}

// Drive a state through a sequence of known/not-known real answers at whatever
// band the engine currently targets, returning the final state.
function walk(start: DiagnosticState, knownSequence: readonly boolean[]): DiagnosticState {
  let s = start;
  for (const known of knownSequence) {
    s = processAnswer(s, wordAnswer(word(`w${s.itemsAnswered}`, s.currentBand), known, known));
  }
  return s;
}

describe('startBandForProficiency', () => {
  it('maps each CEFR band to an ascending starting rank', () => {
    expect(startBandForProficiency('A2')).toBeLessThan(startBandForProficiency('B1'));
    expect(startBandForProficiency('B1')).toBeLessThan(startBandForProficiency('B2'));
    expect(startBandForProficiency('B2')).toBeLessThan(startBandForProficiency('C1'));
    expect(startBandForProficiency('C1')).toBeLessThan(startBandForProficiency('C2'));
  });

  it('falls back to mid-Foundation for an unknown band', () => {
    expect(startBandForProficiency(undefined)).toBe(1500);
  });
});

describe('initDiagnostic', () => {
  it('seeds at the start band with the initial step and empty brackets', () => {
    const s = initDiagnostic(2000);
    expect(s.currentBand).toBe(2000);
    expect(s.stepSize).toBe(DEFAULT_BAND_WALK_CONFIG.initialStep);
    expect(s.highestKnown).toBeNull();
    expect(s.lowestNotKnown).toBeNull();
    expect(s.itemsAnswered).toBe(0);
  });

  it('clamps a start band outside the config range', () => {
    expect(initDiagnostic(-100).currentBand).toBe(DEFAULT_BAND_WALK_CONFIG.minRank);
    expect(initDiagnostic(999_999).currentBand).toBe(DEFAULT_BAND_WALK_CONFIG.maxRank);
  });
});

describe('processAnswer — staircase movement', () => {
  it('moves to a HARDER (higher) rank after a known answer', () => {
    const s = initDiagnostic(2000);
    const next = processAnswer(s, wordAnswer(word('a', 2000), true, true));
    expect(next.currentBand).toBe(2000 + DEFAULT_BAND_WALK_CONFIG.initialStep);
    expect(next.highestKnown).toBe(2000);
    expect(next.lastDirection).toBe('up');
    expect(next.itemsAnswered).toBe(1);
  });

  it('moves to an EASIER (lower) rank after a not-known answer', () => {
    const s = initDiagnostic(5000);
    const next = processAnswer(s, wordAnswer(word('a', 5000), false, false));
    expect(next.currentBand).toBe(5000 - DEFAULT_BAND_WALK_CONFIG.initialStep);
    expect(next.lowestNotKnown).toBe(5000);
    expect(next.lastDirection).toBe('down');
  });

  it('treats a claimed-but-unconfirmed answer (overclaim) as NOT known', () => {
    const s = initDiagnostic(2000);
    const next = processAnswer(s, wordAnswer(word('a', 2000), true, false));
    expect(next.lowestNotKnown).toBe(2000);
    expect(next.answers[0]?.known).toBe(false);
    expect(next.answers[0]?.claimed).toBe(true);
  });

  it('clamps the band at the config floor when walking down past minRank', () => {
    const s = initDiagnostic(1000);
    const next = processAnswer(s, wordAnswer(word('a', 1000), false, false));
    expect(next.currentBand).toBe(DEFAULT_BAND_WALK_CONFIG.minRank);
  });
});

describe('processAnswer — reversal halves the step', () => {
  it('halves the step on the first reversal', () => {
    const s = initDiagnostic(2000); // step 1500
    const up = processAnswer(s, wordAnswer(word('a', 2000), true, true)); // up, step 1500
    const down = processAnswer(up, wordAnswer(word('b', up.currentBand), false, false)); // reversal
    expect(down.stepSize).toBe(Math.floor(DEFAULT_BAND_WALK_CONFIG.initialStep / 2));
  });

  it('does not halve the step when the direction is unchanged', () => {
    const s = initDiagnostic(500);
    const up1 = processAnswer(s, wordAnswer(word('a', 500), true, true));
    const up2 = processAnswer(up1, wordAnswer(word('b', up1.currentBand), true, true));
    expect(up2.stepSize).toBe(DEFAULT_BAND_WALK_CONFIG.initialStep);
  });

  it('never shrinks the step below minStep', () => {
    // Alternate known/not-known many times to force repeated halving.
    const s = walk(initDiagnostic(3000), [true, false, true, false, true, false, true, false]);
    expect(s.stepSize).toBeGreaterThanOrEqual(DEFAULT_BAND_WALK_CONFIG.minStep);
  });
});

describe('shouldStop', () => {
  it('does not stop before any answer', () => {
    expect(shouldStop(initDiagnostic(2000))).toBe(false);
  });

  it('stops at the item cap', () => {
    const seq = Array.from({ length: DEFAULT_BAND_WALK_CONFIG.maxItems }, (_, i) => i % 2 === 0);
    const s = walk(initDiagnostic(3000), seq);
    expect(s.itemsAnswered).toBe(DEFAULT_BAND_WALK_CONFIG.maxItems);
    expect(shouldStop(s)).toBe(true);
  });

  it('stops once the step floors AND the bracket is closed', () => {
    const s = walk(initDiagnostic(3000), [true, false, true, false, true, false, true, false, true, false]);
    if (s.stepSize <= DEFAULT_BAND_WALK_CONFIG.minStep) {
      expect(s.highestKnown).not.toBeNull();
      expect(s.lowestNotKnown).not.toBeNull();
      expect(shouldStop(s)).toBe(true);
    }
  });

  it('does NOT stop on an all-known run (bracket never closes), only the cap halts it', () => {
    const s = walk(initDiagnostic(500), [true, true, true, true, true]);
    expect(s.lowestNotKnown).toBeNull();
    expect(shouldStop(s)).toBe(false);
  });
});

describe('estimateFrontierRank', () => {
  it('returns the bracket midpoint when both bounds are set', () => {
    let s = initDiagnostic(2000);
    s = processAnswer(s, wordAnswer(word('a', 2000), true, true)); // highestKnown 2000
    s = processAnswer(s, wordAnswer(word('b', 3500), false, false)); // lowestNotKnown 3500
    expect(estimateFrontierRank(s)).toBe(2750);
  });

  it('projects one step up from highestKnown when only known answers exist', () => {
    let s = initDiagnostic(500);
    s = processAnswer(s, wordAnswer(word('a', 500), true, true));
    expect(estimateFrontierRank(s)).toBe(500 + s.stepSize);
  });

  it('projects one step down from lowestNotKnown when only not-known answers exist', () => {
    let s = initDiagnostic(5000);
    s = processAnswer(s, wordAnswer(word('a', 5000), false, false));
    expect(estimateFrontierRank(s)).toBe(5000 - s.stepSize);
  });

  it('converges toward the true frontier for a simulated learner', () => {
    // Simulated learner knows everything at rank <= 2600, nothing above.
    const TRUE_FRONTIER = 2600;
    let s = initDiagnostic(1500);
    for (let i = 0; i < 12; i++) {
      const known = s.currentBand <= TRUE_FRONTIER;
      s = processAnswer(s, wordAnswer(word(`w${i}`, s.currentBand), known, known));
    }
    expect(Math.abs(estimateFrontierRank(s) - TRUE_FRONTIER)).toBeLessThanOrEqual(300);
  });
});

describe('false-alarm correction', () => {
  it('rate is 0 when no pseudo-words were shown', () => {
    expect(falseAlarmRate(initDiagnostic(2000))).toBe(0);
  });

  it('counts pseudo Yes as a false alarm without moving the band or item count', () => {
    const s = initDiagnostic(2000);
    const next = processAnswer(s, { kind: 'pseudo', claimed: true });
    expect(next.falseAlarms).toBe(1);
    expect(next.pseudoSeen).toBe(1);
    expect(next.currentBand).toBe(2000);
    expect(next.itemsAnswered).toBe(0);
  });

  it('a pseudo No is a correct rejection (no false alarm)', () => {
    const next = processAnswer(initDiagnostic(2000), { kind: 'pseudo', claimed: false });
    expect(next.falseAlarms).toBe(0);
    expect(next.pseudoSeen).toBe(1);
  });

  it.each([
    [0, 0, 2000],
    [1, 4, 1750], // far .25 → rank * (1 - .125) = 1750
    [2, 4, 1500], // far .5  → rank * .75
    [3, 3, 1000], // far 1   → rank * .5
  ])('applies correction for %i/%i false alarms', (fa, seen, expected) => {
    let s = initDiagnostic(2000);
    for (let i = 0; i < seen; i++) {
      s = processAnswer(s, { kind: 'pseudo', claimed: i < fa });
    }
    const corrected = applyPseudoWordCorrection(2000, falseAlarmRate(s));
    expect(corrected).toBe(expected);
  });

  it('applyPseudoWordCorrection clamps out-of-range rates', () => {
    expect(applyPseudoWordCorrection(2000, -5)).toBe(2000);
    expect(applyPseudoWordCorrection(2000, 5)).toBe(1000);
  });

  it('finalFrontierRank composes estimate + correction', () => {
    // The engine brackets on its OWN currentBand, not the word's label rank:
    // known@band 2000 → currentBand 3500; not-known@band 3500 → bracket [2000,3500].
    let s = initDiagnostic(2000);
    s = processAnswer(s, wordAnswer(word('a', 2000), true, true)); // highestKnown 2000, band→3500
    s = processAnswer(s, wordAnswer(word('b', 3500), false, false)); // lowestNotKnown 3500
    s = processAnswer(s, { kind: 'pseudo', claimed: true }); // far 1.0 → halve
    expect(estimateFrontierRank(s)).toBe(2750);
    expect(finalFrontierRank(s)).toBe(1375);
  });
});

describe('shouldInjectPseudo', () => {
  it('injects a pseudo-word after every PSEUDO_SPACING real items, within budget', () => {
    const base = initDiagnostic(2000);
    // 0 real answered → no pseudo yet.
    expect(shouldInjectPseudo(base, 3)).toBe(false);
    // After PSEUDO_SPACING real items, the first pseudo is due.
    const after5 = walk(base, Array.from({ length: PSEUDO_SPACING }, () => true));
    expect(shouldInjectPseudo(after5, 3)).toBe(true);
  });

  it('stops injecting once the budget is spent', () => {
    let s = walk(initDiagnostic(2000), Array.from({ length: PSEUDO_SPACING }, () => true));
    s = processAnswer(s, { kind: 'pseudo', claimed: false });
    // pseudoSeen now 1; next pseudo not due until 2*spacing real items.
    expect(shouldInjectPseudo(s, 3)).toBe(false);
    expect(shouldInjectPseudo({ ...s, pseudoSeen: 3 }, 3)).toBe(false); // budget spent
  });
});

describe('selectNearestWord', () => {
  const pool = [word('a', 100), word('b', 1000), word('c', 2500), word('d', 5000)];

  it('returns the word with rank closest to the target', () => {
    expect(selectNearestWord(pool, 2400, new Set())?.id).toBe(asWordId('c'));
    expect(selectNearestWord(pool, 90, new Set())?.id).toBe(asWordId('a'));
  });

  it('excludes already-asked words', () => {
    const exclude = new Set([asWordId('c')]);
    expect(selectNearestWord(pool, 2400, exclude)?.id).toBe(asWordId('b'));
  });

  it('skips words without a frequency rank for band targeting', () => {
    const mixed = [word('x'), word('y', 3000)];
    expect(selectNearestWord(mixed, 3000, new Set())?.id).toBe(asWordId('y'));
  });

  it('falls back to any unused word when none carry a rank', () => {
    const noRank = [word('x'), word('y')];
    expect(selectNearestWord(noRank, 3000, new Set())).not.toBeNull();
  });

  it('returns null when every word is excluded', () => {
    const exclude = new Set(pool.map((w) => w.id));
    expect(selectNearestWord(pool, 2400, exclude)).toBeNull();
  });

  it('breaks ties deterministically by ascending id', () => {
    const tie = [word('b', 3100), word('a', 2900)]; // both |Δ| = 100 from 3000
    expect(selectNearestWord(tie, 3000, new Set())?.id).toBe(asWordId('a'));
  });
});
