import type { Word } from '@/domain/vocabulary/Word';
import type { WordId } from '@/domain/vocabulary/ids';
import type { ProficiencyBand } from '@/domain/onboarding/OnboardingState';

// DIAG-A: adaptive band-walk diagnostic engine (post-launch replacement for the
// DIAG-B stride sampler in diagnostic.ts). PURE logic — no I/O, no randomness
// side effects, no clock. The application layer (RunAdaptiveDiagnosticUseCase)
// owns persistence + item presentation; this module only decides WHICH frequency
// band to probe next and WHAT the answers imply about the learner's frontier.
//
// Model (ONBOARDING_FLOW_SPEC.md): a learner "knows" everything more common than
// their vocabulary FRONTIER and little beyond it. We walk a staircase over
// word-frequency rank — LOWER rank = more common = easier; HIGHER rank = rarer =
// harder — bracketing the frontier between the hardest word they knew
// (`highestKnown`) and the easiest word they did NOT (`lowestNotKnown`). The
// step halves on every reversal so the walk converges; we stop when the bracket
// is tight (standard-error proxy) or the item cap is hit.
//
// Honest-signal ("confirm-on-Yes"): a learner only "knows" a word when they
// CLAIM it (say Yes) AND confirm it (pass a 3-option meaning check). Pseudo-words
// (non-words) are interleaved as a lie detector: a Yes to a pseudo-word is a
// false alarm, and the aggregate false-alarm rate corrects the final frontier
// downward for overclaiming.

export interface BandWalkConfig {
  /** Most common (easiest) rank we probe. Rank 1 = the single most frequent word. */
  readonly minRank: number;
  /** Rarest (hardest) rank we probe. Beyond this we assume "not known". */
  readonly maxRank: number;
  /** First staircase jump, in ranks. Large so we localize the frontier fast. */
  readonly initialStep: number;
  /** Convergence floor: once the step would drop below this, the walk is done. */
  readonly minStep: number;
  /** Hard cap on real (non-pseudo) items so the diagnostic always terminates. */
  readonly maxItems: number;
}

// Reasoned defaults (DIAG_A_IMPLEMENTATION_PLAN.md decision point 2 — tune from
// beta data, do NOT treat as final). maxRank 9000 spans Foundation + Most-Common
// 9000; initialStep 1500 localizes within ~3 steps; minStep 150 ≈ a tight enough
// bracket that a ±75-rank estimate is meaningless noise at the learner's level.
export const DEFAULT_BAND_WALK_CONFIG: BandWalkConfig = {
  minRank: 1,
  maxRank: 9000,
  initialStep: 1500,
  minStep: 150,
  maxItems: 25,
};

export type WalkDirection = 'up' | 'down';

// Immutable diagnostic state. Every engine function returns a NEW state — the
// caller threads it through the item loop and may persist it for resume (PC-3).
export interface DiagnosticState {
  readonly config: BandWalkConfig;
  /** Target frequency rank for the NEXT item to present. */
  readonly currentBand: number;
  /** Current staircase step size (halves on reversal, floored at minStep). */
  readonly stepSize: number;
  /** Hardest (highest) rank the learner has confirmed knowing; null until one. */
  readonly highestKnown: number | null;
  /** Easiest (lowest) rank the learner did NOT know; null until one. */
  readonly lowestNotKnown: number | null;
  /** Direction of the previous real answer's move, for reversal detection. */
  readonly lastDirection: WalkDirection | null;
  /** Count of real (non-pseudo) items answered — the stop-rule denominator. */
  readonly itemsAnswered: number;
  /** Pseudo-words answered Yes (false alarms). */
  readonly falseAlarms: number;
  /** Pseudo-words shown total (false-alarm-rate denominator). */
  readonly pseudoSeen: number;
  /** Graded real-word answers, in order — drives SRS seeding + the Knowledge Map. */
  readonly answers: readonly DiagnosticWordAnswer[];
}

// One graded real-word answer.
export interface DiagnosticWordAnswer {
  readonly word: Word;
  /** The band (target rank) at which this word was presented. */
  readonly band: number;
  /** The learner tapped Yes ("I know this"). */
  readonly claimed: boolean;
  /** claimed AND passed the meaning check — the authoritative "knows it" signal. */
  readonly known: boolean;
}

// The two item kinds the engine grades. A `word` answer carries both the claim
// (Yes/No) and the confirm (meaning-check pass); a `pseudo` answer only carries
// the claim (there is no meaning to confirm).
export type DiagnosticAnswer =
  | { readonly kind: 'word'; readonly word: Word; readonly claimed: boolean; readonly confirmed: boolean }
  | { readonly kind: 'pseudo'; readonly claimed: boolean };

function clampRank(rank: number, config: BandWalkConfig): number {
  if (rank < config.minRank) return config.minRank;
  if (rank > config.maxRank) return config.maxRank;
  return Math.round(rank);
}

/**
 * Map a self-reported CEFR band to a starting frequency rank (the "self-segment"
 * seed, PB-4). Anchored to the band's rough vocabulary size so the walk starts
 * near the learner's likely frontier and converges in fewer items.
 */
export function startBandForProficiency(band: ProficiencyBand | undefined): number {
  switch (band) {
    case 'A2':
      return 800;
    case 'B1':
      return 1800;
    case 'B2':
      return 3000;
    case 'C1':
      return 5000;
    case 'C2':
      return 7000;
    default:
      return 1500; // Unknown self-segment → mid Foundation.
  }
}

/** Fresh diagnostic state seeded at `startBand`. */
export function initDiagnostic(
  startBand: number,
  config: BandWalkConfig = DEFAULT_BAND_WALK_CONFIG,
): DiagnosticState {
  return {
    config,
    currentBand: clampRank(startBand, config),
    stepSize: config.initialStep,
    highestKnown: null,
    lowestNotKnown: null,
    lastDirection: null,
    itemsAnswered: 0,
    falseAlarms: 0,
    pseudoSeen: 0,
    answers: [],
  };
}

/**
 * Pick the unused pool word whose frequency rank is closest to `targetRank`.
 * Words without a frequency rank are ineligible for band targeting (they carry
 * no position on the staircase); if NONE of the eligible words have a rank, we
 * fall back to any unused word so the diagnostic still progresses. Deterministic:
 * ties break by ascending word id.
 */
export function selectNearestWord(
  pool: readonly Word[],
  targetRank: number,
  exclude: ReadonlySet<WordId>,
): Word | null {
  let best: Word | null = null;
  let bestDelta = Number.POSITIVE_INFINITY;
  let fallback: Word | null = null;

  for (const w of pool) {
    if (exclude.has(w.id)) continue;
    if (fallback === null) fallback = w;
    if (w.frequencyRank === undefined) continue;
    const delta = Math.abs(w.frequencyRank - targetRank);
    if (
      delta < bestDelta ||
      (delta === bestDelta && best !== null && w.id.localeCompare(best.id) < 0)
    ) {
      best = w;
      bestDelta = delta;
    }
  }
  return best ?? fallback;
}

/**
 * Grade one answer and advance the walk. Real words move the staircase and
 * tighten the bracket; pseudo-words only update the false-alarm tally (they do
 * NOT move the band or count toward the item cap — they are a parallel lie
 * detector). Reversals (a known-after-not-known or vice-versa) halve the step.
 */
export function processAnswer(state: DiagnosticState, answer: DiagnosticAnswer): DiagnosticState {
  if (answer.kind === 'pseudo') {
    return {
      ...state,
      pseudoSeen: state.pseudoSeen + 1,
      falseAlarms: state.falseAlarms + (answer.claimed ? 1 : 0),
    };
  }

  const known = answer.claimed && answer.confirmed;
  const band = state.currentBand;
  const direction: WalkDirection = known ? 'up' : 'down';

  // Tighten the bracket bounds.
  const highestKnown = known
    ? Math.max(state.highestKnown ?? Number.NEGATIVE_INFINITY, band)
    : state.highestKnown;
  const lowestNotKnown = !known
    ? Math.min(state.lowestNotKnown ?? Number.POSITIVE_INFINITY, band)
    : state.lowestNotKnown;

  // Halve the step on a reversal so the walk converges.
  const reversal = state.lastDirection !== null && state.lastDirection !== direction;
  const stepSize = reversal
    ? Math.max(state.config.minStep, Math.floor(state.stepSize / 2))
    : state.stepSize;

  // Known → probe harder (higher rank); not known → probe easier (lower rank).
  const nextRaw = known ? band + stepSize : band - stepSize;
  const currentBand = clampRank(nextRaw, state.config);

  const recorded: DiagnosticWordAnswer = { word: answer.word, band, claimed: answer.claimed, known };

  return {
    ...state,
    currentBand,
    stepSize,
    highestKnown: highestKnown === Number.NEGATIVE_INFINITY ? null : highestKnown,
    lowestNotKnown: lowestNotKnown === Number.POSITIVE_INFINITY ? null : lowestNotKnown,
    lastDirection: direction,
    itemsAnswered: state.itemsAnswered + 1,
    answers: [...state.answers, recorded],
  };
}

/**
 * Stop when the item cap is reached OR the walk has converged: the step has
 * shrunk to the floor AND the bracket is closed (we have both a known and a
 * not-known bound). The closed-bracket requirement prevents stopping early when
 * the learner has only ever answered one way (all-known or all-unknown), where
 * the frontier is still pinned to a config extreme.
 */
export function shouldStop(state: DiagnosticState): boolean {
  if (state.itemsAnswered >= state.config.maxItems) return true;
  if (state.itemsAnswered === 0) return false;
  const converged =
    state.stepSize <= state.config.minStep &&
    state.highestKnown !== null &&
    state.lowestNotKnown !== null;
  return converged;
}

/**
 * Estimate the frontier rank from the bracket. With both bounds, the midpoint;
 * with only one, project one step past it; with neither (no real answers yet),
 * the current band. Clamped to the config range.
 */
export function estimateFrontierRank(state: DiagnosticState): number {
  const { highestKnown, lowestNotKnown, config } = state;
  if (highestKnown !== null && lowestNotKnown !== null) {
    return clampRank((highestKnown + lowestNotKnown) / 2, config);
  }
  if (highestKnown !== null) {
    return clampRank(highestKnown + state.stepSize, config);
  }
  if (lowestNotKnown !== null) {
    return clampRank(lowestNotKnown - state.stepSize, config);
  }
  return clampRank(state.currentBand, config);
}

/** Real items between interleaved pseudo-words (DIAG_A plan decision point 3). */
export const PSEUDO_SPACING = 5;

/**
 * Whether the NEXT presented item should be a pseudo-word rather than a real one.
 * Pseudo-words are interleaved mid-sequence — one after every `PSEUDO_SPACING`
 * real items — until the per-run budget is spent. Pure: derived from the running
 * counts, so the screen loop needs no extra scheduling state.
 */
export function shouldInjectPseudo(state: DiagnosticState, pseudoBudget: number): boolean {
  if (state.pseudoSeen >= pseudoBudget) return false;
  return state.itemsAnswered >= PSEUDO_SPACING * (state.pseudoSeen + 1);
}

/** Pseudo-word false-alarm rate in [0,1]; 0 when no pseudo-words were shown. */
export function falseAlarmRate(state: DiagnosticState): number {
  if (state.pseudoSeen === 0) return 0;
  return state.falseAlarms / state.pseudoSeen;
}

/**
 * Adjust a frontier estimate downward for overclaiming. A learner who says Yes
 * to non-words is likely also over-claiming real ones, so we discount the
 * frontier by half the false-alarm rate (far=0 → no change; far=1 → halve).
 * Half-weight keeps a single stray false alarm from wildly deflating the result.
 */
export function applyPseudoWordCorrection(rank: number, far: number): number {
  const clamped = far < 0 ? 0 : far > 1 ? 1 : far;
  return Math.round(rank * (1 - 0.5 * clamped));
}

/** Convenience: the corrected frontier for a finished diagnostic. */
export function finalFrontierRank(state: DiagnosticState): number {
  return applyPseudoWordCorrection(estimateFrontierRank(state), falseAlarmRate(state));
}
