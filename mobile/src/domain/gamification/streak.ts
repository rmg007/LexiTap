import { toLocalCivilDate, civilDayDiff } from '@/domain/time/civilDate';

// Streak state machine. Implements SRS_FORGIVENESS_MECHANICS.md Mechanic 3
// exactly. Lives entirely in gamification; touches only streak state, never
// SRS tables. Pure: a function of (state, today). Freezes are consumed lazily
// at next completion, so there is no background midnight job and the machine
// is correct offline.

export const STREAK = {
  MAX_BANKED_FREEZES: 2,
  FREEZE_EARN_EVERY_N_STREAK_DAYS: 7,
  INITIAL_FREEZES_GRANTED: 1,
} as const;

export interface StreakState {
  readonly currentStreak: number;
  readonly longestStreak: number;
  readonly lastActivityLocalDate: number | null; // YYYYMMDD
  readonly freezeCount: number;
  readonly freezesGrantedTotal: number;
}

export type StreakOutcome =
  | { kind: 'noop' } // gap == 0 or clock backward
  | { kind: 'incremented' } // normal consecutive day
  | { kind: 'freeze_consumed'; freezesSpent: number } // lapse absorbed
  | { kind: 'reset' }; // lapse not coverable

export interface StreakUpdateResult {
  readonly state: StreakState; // next state (caller persists)
  readonly outcome: StreakOutcome; // drives UI copy (warm note / restart)
  readonly freezeGranted: boolean; // a freeze was earned this update
}

// Re-export the shared civil-date helpers from the streak module so callers
// importing the streak interface get the documented surface.
export { toLocalCivilDate, civilDayDiff };

/** Seed a brand-new user (onboarding grant). */
export function initialStreakState(): StreakState {
  return {
    currentStreak: 0,
    longestStreak: 0,
    lastActivityLocalDate: null,
    freezeCount: STREAK.INITIAL_FREEZES_GRANTED,
    freezesGrantedTotal: STREAK.INITIAL_FREEZES_GRANTED,
  };
}

// Grant a freeze when the streak crosses a 7-day boundary, capped at MAX.
// Earning above the cap is silently discarded (no overflow bank).
function maybeGrantFreeze(
  currentStreak: number,
  freezeCount: number,
  freezesGrantedTotal: number,
): { freezeCount: number; freezesGrantedTotal: number; granted: boolean } {
  const crosses =
    currentStreak > 0 && currentStreak % STREAK.FREEZE_EARN_EVERY_N_STREAK_DAYS === 0;
  if (crosses && freezeCount < STREAK.MAX_BANKED_FREEZES) {
    return {
      freezeCount: freezeCount + 1,
      freezesGrantedTotal: freezesGrantedTotal + 1,
      granted: true,
    };
  }
  return { freezeCount, freezesGrantedTotal, granted: false };
}

/**
 * Apply a qualifying day-completion. The core state machine (pure). Called
 * once per completed session. `todayLocalDate` is a YYYYMMDD computed in the
 * user's tz at the moment of completion.
 */
export function applyStreakUpdate(
  state: StreakState,
  todayLocalDate: number,
): StreakUpdateResult {
  // First-ever completion: today starts the streak at 1.
  if (state.lastActivityLocalDate === null) {
    const base: StreakState = {
      ...state,
      currentStreak: 1,
      longestStreak: Math.max(state.longestStreak, 1),
      lastActivityLocalDate: todayLocalDate,
    };
    const grant = maybeGrantFreeze(1, base.freezeCount, base.freezesGrantedTotal);
    return {
      state: { ...base, freezeCount: grant.freezeCount, freezesGrantedTotal: grant.freezesGrantedTotal },
      outcome: { kind: 'incremented' },
      freezeGranted: grant.granted,
    };
  }

  const gap = civilDayDiff(todayLocalDate, state.lastActivityLocalDate);

  // gap <= 0: already counted today, or clock rolled backward. No-op to avoid
  // streak inflation from a rolled-back clock.
  if (gap <= 0) {
    return { state, outcome: { kind: 'noop' }, freezeGranted: false };
  }

  // gap == 1: consecutive day — normal increment.
  if (gap === 1) {
    const currentStreak = state.currentStreak + 1;
    const grant = maybeGrantFreeze(currentStreak, state.freezeCount, state.freezesGrantedTotal);
    return {
      state: {
        ...state,
        currentStreak,
        longestStreak: Math.max(state.longestStreak, currentStreak),
        lastActivityLocalDate: todayLocalDate,
        freezeCount: grant.freezeCount,
        freezesGrantedTotal: grant.freezesGrantedTotal,
      },
      outcome: { kind: 'incremented' },
      freezeGranted: grant.granted,
    };
  }

  // gap >= 2: one or more days missed. Consume one freeze per fully-skipped day.
  const missed = gap - 1;
  if (missed <= state.freezeCount) {
    const currentStreak = state.currentStreak + 1;
    const grant = maybeGrantFreeze(
      currentStreak,
      state.freezeCount - missed,
      state.freezesGrantedTotal,
    );
    return {
      state: {
        ...state,
        currentStreak,
        longestStreak: Math.max(state.longestStreak, currentStreak),
        lastActivityLocalDate: todayLocalDate,
        freezeCount: grant.freezeCount,
        freezesGrantedTotal: grant.freezesGrantedTotal,
      },
      outcome: { kind: 'freeze_consumed', freezesSpent: missed },
      freezeGranted: grant.granted,
    };
  }

  // Not enough freezes: reset. Today restarts the streak at 1. freeze_count
  // unchanged (no guilt; encouraging restart).
  return {
    state: {
      ...state,
      currentStreak: 1,
      longestStreak: Math.max(state.longestStreak, 1),
      lastActivityLocalDate: todayLocalDate,
    },
    outcome: { kind: 'reset' },
    freezeGranted: false,
  };
}

/**
 * Passive at-risk evaluation on app open (no state write). At-risk when the
 * user has an active streak and has not yet completed today. Freeze
 * consumption is deferred to next completion.
 */
export function evaluateStreakAtRisk(
  state: StreakState,
  todayLocalDate: number,
): { atRisk: boolean } {
  if (state.lastActivityLocalDate === null) return { atRisk: false };
  const gap = civilDayDiff(todayLocalDate, state.lastActivityLocalDate);
  // gap >= 1 means today is not yet counted; an active streak is at risk.
  return { atRisk: gap >= 1 && state.currentStreak > 0 };
}
