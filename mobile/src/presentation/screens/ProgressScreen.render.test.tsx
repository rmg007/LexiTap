import { fireEvent } from '@testing-library/react-native';
import { initialStreakState, type UserStats } from '@/domain/index';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args), replace: jest.fn() },
  // Run the focus callback once on mount (no navigation container in tests).
  useFocusEffect: (cb: () => void | (() => void)) => require('react').useEffect(cb, []),
}));

import { ProgressScreen } from '@/presentation/screens/ProgressScreen';
import { defaultServices, renderWithProviders } from '@/test-utils/renderWithProviders';

// Proves the Progress "Saved words" section (WORD_FEEDBACK_PLAN §2): hidden when
// the count is 0, visible with the count when > 0, and navigating on press.

describe('ProgressScreen — saved words section', () => {
  beforeEach(() => mockPush.mockClear());

  it('hides the saved-words section when the count is 0', async () => {
    const services = defaultServices({ getSavedWordCount: async () => 0 });
    const { queryByText, findByText } = await renderWithProviders(<ProgressScreen />, services);
    await findByText('Progress');
    expect(queryByText('Saved words')).toBeNull();
  });

  it('shows the section with the count and navigates on press', async () => {
    const services = defaultServices({ getSavedWordCount: async () => 4 });
    const { findByText, getByLabelText } = await renderWithProviders(<ProgressScreen />, services);
    await findByText('Saved words');
    fireEvent.press(getByLabelText('Saved words, 4'));
    expect(mockPush).toHaveBeenCalledWith('/saved-words');
  });
});

describe('ProgressScreen — known/learning/new hero', () => {
  beforeEach(() => mockPush.mockClear());

  it('renders the KnowledgeMapBar hero + legend and routes to /learn on press', async () => {
    // listActiveTiers() currently returns 3 active tiers; the mock ignores the
    // tierId argument, so all 3 render identical segments — assert on the
    // Foundation Pack card specifically and allow the legend text to repeat.
    const services = defaultServices({
      getTierKnowledgeMap: async () => ({ known: 2, learning: 1, new: 2, total: 5 }),
    });
    const { findByText, findAllByText, getByLabelText } = await renderWithProviders(
      <ProgressScreen />,
      services,
    );
    await findByText('2 / 5 known · Foundation Pack');
    expect((await findAllByText('Known · 2')).length).toBeGreaterThan(0);
    fireEvent.press(getByLabelText('Study Foundation Pack'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/learn', params: { tierId: 'foundation' } });
  });

  it('shows the "First goal" motivational copy when nothing is mastered yet', async () => {
    const services = defaultServices({
      getTierKnowledgeMap: async () => ({ known: 0, learning: 1, new: 2, total: 3 }),
    });
    const { findAllByText } = await renderWithProviders(<ProgressScreen />, services);
    expect((await findAllByText('First goal: master 10 words')).length).toBeGreaterThan(0);
  });
});

describe('ProgressScreen — first-run vs returning-learner streak card', () => {
  it('replaces the Streak card with an encouragement card when the learner has never studied', async () => {
    const services = defaultServices({
      getUserStats: async () => ({
        streak: initialStreakState(),
        totalSessions: 0,
        totalWordsMastered: 0,
      }),
    });
    const { findByText, queryByText } = await renderWithProviders(<ProgressScreen />, services);
    await findByText('No study sessions yet');
    expect(queryByText('Streak')).toBeNull();
  });

  it('shows the Streak card with ListRow stats for a returning learner', async () => {
    const services = defaultServices({
      getUserStats: async () => ({
        streak: { ...initialStreakState(), currentStreak: 3, longestStreak: 12 },
        totalSessions: 5,
        totalWordsMastered: 7,
      }),
    });
    const { findByText } = await renderWithProviders(<ProgressScreen />, services);
    await findByText('Streak');
    expect(await findByText('12 days')).toBeTruthy();
    expect(await findByText('5')).toBeTruthy();
    expect(await findByText('7')).toBeTruthy();
  });

  it('does not mistake a stats read failure for a first-run zero (fail-soft, silent)', async () => {
    const services = defaultServices({
      getUserStats: async () => {
        throw new Error('read failed');
      },
    });
    const { findByText, queryByText } = await renderWithProviders(<ProgressScreen />, services);
    await findByText('Progress');
    // Falls back to the normal Streak card, not the "never studied" encouragement copy.
    expect(await findByText('Streak')).toBeTruthy();
    expect(queryByText('No study sessions yet')).toBeNull();
  });
});

describe('ProgressScreen — first-run endowed copy (Phase 4.3)', () => {
  it('shows the endowed estimate on a fresh-in-tier hero when a frontier rank exists', async () => {
    const services = defaultServices({
      getUserStats: async () => ({
        streak: initialStreakState(),
        totalSessions: 0,
        totalWordsMastered: 0,
        onboardingState: { frontierRank: 1200, completedAt: Date.now() },
      }),
      getTierKnowledgeMap: async () => ({ known: 0, learning: 0, new: 2848, total: 2848 }),
    });
    const { findAllByText } = await renderWithProviders(<ProgressScreen />, services);
    expect(
      (await findAllByText("You're starting from an estimated 1,200 words already known.")).length,
    ).toBeGreaterThan(0);
  });

  it('omits the estimate once real in-tier progress exists', async () => {
    const services = defaultServices({
      getUserStats: async () => ({
        streak: initialStreakState(),
        totalSessions: 3,
        totalWordsMastered: 1,
        onboardingState: { frontierRank: 1200, completedAt: Date.now() },
      }),
      getTierKnowledgeMap: async () => ({ known: 1, learning: 1, new: 3, total: 5 }),
    });
    const { findAllByText, queryByText } = await renderWithProviders(<ProgressScreen />, services);
    expect((await findAllByText(/known ·/)).length).toBeGreaterThan(0);
    expect(queryByText(/already known/)).toBeNull();
  });
});

describe('ProgressScreen — loading skeleton (atomic reveal, no partial pop)', () => {
  // The bug this proves fixed: stats resolved fast while the tier read stalled
  // (an N+1 query), so the Streak card appeared alone for ~20s before the
  // Foundation Pack card popped in. Every read is now awaited together and
  // committed in one batch, so the screen must go loading-placeholder →
  // fully-populated in a single transition — never stats-without-tiers.
  function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((res) => {
      resolve = res;
    });
    return { promise, resolve };
  }

  it('shows the loading placeholder — not the Streak card alone, not a blank gap — until every read resolves', async () => {
    const statsGate = deferred<UserStats>();
    const services = defaultServices({
      getUserStats: () => statsGate.promise,
      getTierKnowledgeMap: async () => ({ known: 2, learning: 1, new: 2, total: 5 }),
    });
    const { getByLabelText, queryByText, queryByLabelText, findByText } = await renderWithProviders(
      <ProgressScreen />,
      services,
    );

    // Stats hasn't resolved yet: the loading placeholder is up, and neither the
    // Streak card nor the tier card (whose read already finished) has appeared —
    // proving the reveal waits for ALL reads, not just the fastest one.
    expect(getByLabelText('Loading progress')).toBeTruthy();
    expect(queryByText('Streak')).toBeNull();
    expect(queryByText('2 / 5 known · Foundation Pack')).toBeNull();

    statsGate.resolve({ streak: initialStreakState(), totalSessions: 5, totalWordsMastered: 1 });

    // Now both appear together, in the same transition, and the placeholder is gone.
    await findByText('Streak');
    await findByText('2 / 5 known · Foundation Pack');
    expect(queryByLabelText('Loading progress')).toBeNull();
  });
});
