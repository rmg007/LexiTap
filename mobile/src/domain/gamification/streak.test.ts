import {
  STREAK,
  applyStreakUpdate,
  evaluateStreakAtRisk,
  initialStreakState,
  type StreakState,
} from '@/domain/gamification/streak';

function state(overrides: Partial<StreakState> = {}): StreakState {
  return {
    currentStreak: 5,
    longestStreak: 5,
    lastActivityLocalDate: 20260523,
    freezeCount: 0,
    freezesGrantedTotal: 0,
    ...overrides,
  };
}

describe('initialStreakState', () => {
  it('grants the onboarding freeze', () => {
    const s = initialStreakState();
    expect(s.currentStreak).toBe(0);
    expect(s.freezeCount).toBe(STREAK.INITIAL_FREEZES_GRANTED);
    expect(s.freezesGrantedTotal).toBe(STREAK.INITIAL_FREEZES_GRANTED);
    expect(s.lastActivityLocalDate).toBeNull();
  });
});

describe('applyStreakUpdate — first completion', () => {
  it('starts the streak at 1', () => {
    const res = applyStreakUpdate(initialStreakState(), 20260524);
    expect(res.outcome).toEqual({ kind: 'incremented' });
    expect(res.state.currentStreak).toBe(1);
    expect(res.state.lastActivityLocalDate).toBe(20260524);
  });
});

describe('applyStreakUpdate — gap == 0 (same day)', () => {
  it('is a no-op (idempotent)', () => {
    const s = state({ lastActivityLocalDate: 20260524 });
    const res = applyStreakUpdate(s, 20260524);
    expect(res.outcome).toEqual({ kind: 'noop' });
    expect(res.state).toEqual(s);
    expect(res.freezeGranted).toBe(false);
  });
});

describe('applyStreakUpdate — gap == 1 (consecutive)', () => {
  it('increments and updates longest', () => {
    const res = applyStreakUpdate(state({ currentStreak: 5, longestStreak: 5 }), 20260524);
    expect(res.outcome).toEqual({ kind: 'incremented' });
    expect(res.state.currentStreak).toBe(6);
    expect(res.state.longestStreak).toBe(6);
  });

  it('does not lower an existing longer longest-streak', () => {
    const res = applyStreakUpdate(
      state({ currentStreak: 3, longestStreak: 99 }),
      20260524,
    );
    expect(res.state.longestStreak).toBe(99);
  });

  it('grants a freeze at a 7-day boundary', () => {
    const res = applyStreakUpdate(
      state({ currentStreak: 6, freezeCount: 0, freezesGrantedTotal: 1 }),
      20260524,
    );
    expect(res.state.currentStreak).toBe(7);
    expect(res.freezeGranted).toBe(true);
    expect(res.state.freezeCount).toBe(1);
    expect(res.state.freezesGrantedTotal).toBe(2);
  });

  it('does not grant past the max banked cap', () => {
    const res = applyStreakUpdate(
      state({ currentStreak: 13, freezeCount: STREAK.MAX_BANKED_FREEZES }),
      20260524,
    );
    expect(res.state.currentStreak).toBe(14); // a 7-boundary
    expect(res.freezeGranted).toBe(false);
    expect(res.state.freezeCount).toBe(STREAK.MAX_BANKED_FREEZES);
  });
});

describe('applyStreakUpdate — gap >= 2 (missed days)', () => {
  it('consumes one freeze per missed day and preserves the streak', () => {
    // gap 2 -> 1 missed day
    const res = applyStreakUpdate(
      state({ currentStreak: 5, lastActivityLocalDate: 20260522, freezeCount: 2 }),
      20260524,
    );
    expect(res.outcome).toEqual({ kind: 'freeze_consumed', freezesSpent: 1 });
    expect(res.state.currentStreak).toBe(6);
    expect(res.state.freezeCount).toBe(1);
  });

  it('consumes exactly enough freezes (2 freezes, 2 missed days)', () => {
    // gap 3 -> 2 missed days
    const res = applyStreakUpdate(
      state({ currentStreak: 5, lastActivityLocalDate: 20260521, freezeCount: 2 }),
      20260524,
    );
    expect(res.outcome).toEqual({ kind: 'freeze_consumed', freezesSpent: 2 });
    expect(res.state.freezeCount).toBe(0);
    expect(res.state.currentStreak).toBe(6);
  });

  it('resets when missed days exceed freezes held', () => {
    // gap 4 -> 3 missed days, only 2 freezes
    const res = applyStreakUpdate(
      state({ currentStreak: 9, longestStreak: 9, lastActivityLocalDate: 20260520, freezeCount: 2 }),
      20260524,
    );
    expect(res.outcome).toEqual({ kind: 'reset' });
    expect(res.state.currentStreak).toBe(1);
    expect(res.state.freezeCount).toBe(2); // unchanged on reset
    expect(res.state.longestStreak).toBe(9); // preserved
  });
});

describe('applyStreakUpdate — backward clock guard', () => {
  it('treats a negative gap as a no-op', () => {
    const s = state({ lastActivityLocalDate: 20260524 });
    const res = applyStreakUpdate(s, 20260520);
    expect(res.outcome).toEqual({ kind: 'noop' });
    expect(res.state).toEqual(s);
  });
});

describe('evaluateStreakAtRisk', () => {
  it('not at risk on a fresh user', () => {
    expect(evaluateStreakAtRisk(initialStreakState(), 20260524).atRisk).toBe(false);
  });

  it('not at risk when already completed today', () => {
    expect(
      evaluateStreakAtRisk(state({ lastActivityLocalDate: 20260524 }), 20260524).atRisk,
    ).toBe(false);
  });

  it('at risk with an active streak and a pending day', () => {
    expect(
      evaluateStreakAtRisk(state({ currentStreak: 5, lastActivityLocalDate: 20260523 }), 20260524)
        .atRisk,
    ).toBe(true);
  });

  it('does not write state (passive)', () => {
    const s = state({ lastActivityLocalDate: 20260523 });
    const snapshot = JSON.stringify(s);
    evaluateStreakAtRisk(s, 20260524);
    expect(JSON.stringify(s)).toBe(snapshot);
  });
});
