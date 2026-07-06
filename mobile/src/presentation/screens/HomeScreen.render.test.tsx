import { fireEvent } from '@testing-library/react-native';
import { HomeScreen } from '@/presentation/screens/HomeScreen';
import type { ActiveSession } from '@/domain/index';
import { BATCH, defaultServices, renderWithProviders } from '@/test-utils/renderWithProviders';

// Proves the "Resume" card (SESSION_RESUME_PLAN): hidden when there is no active
// snapshot, visible with an n/total counter when one exists, and pressing it
// hands the snapshot to onResume for stage-based routing.

const snapshot: ActiveSession = {
  kind: 'learn',
  tierId: 'foundation',
  batch: BATCH,
  stage: 'card',
  index: 1,
};

describe('HomeScreen — resume card', () => {
  it('hides the resume card when there is no active session', async () => {
    const services = defaultServices({ getActiveSession: async () => null });
    const { queryByText } = await renderWithProviders(
      <HomeScreen onStartReview={jest.fn()} onLearnNewWords={jest.fn()} onResume={jest.fn()} />,
      services,
    );
    expect(queryByText('Resume learning')).toBeNull();
  });

  it('shows the resume card with an n/total counter and fires onResume', async () => {
    const onResume = jest.fn();
    const services = defaultServices({ getActiveSession: async () => snapshot });
    const { findByText, getByText, getByTestId } = await renderWithProviders(
      <HomeScreen onStartReview={jest.fn()} onLearnNewWords={jest.fn()} onResume={onResume} />,
      services,
    );
    await findByText('Resume learning');
    // index 1 (0-based) → "2/<total>" · next word is BATCH[1] ("arrive")
    expect(getByText(`Pick up where you left off · 2/${BATCH.length} · "arrive"`)).toBeTruthy();
    fireEvent.press(getByTestId('resume-session'));
    expect(onResume).toHaveBeenCalledWith(snapshot);
  });

  it('hides the resume card when onResume is not provided', async () => {
    const services = defaultServices({ getActiveSession: async () => snapshot });
    const { queryByText, findByText } = await renderWithProviders(
      <HomeScreen onStartReview={jest.fn()} onLearnNewWords={jest.fn()} />,
      services,
    );
    // Home still renders its usual content…
    await findByText('Words ready to review');
    // …but no resume affordance without a handler.
    expect(queryByText('Resume learning')).toBeNull();
  });

  it('never shows two primary CTAs at once — Resume replaces the review card entirely', async () => {
    const services = defaultServices({ getActiveSession: async () => snapshot });
    const { findByText, queryByText } = await renderWithProviders(
      <HomeScreen onStartReview={jest.fn()} onLearnNewWords={jest.fn()} onResume={jest.fn()} />,
      services,
    );
    await findByText('Resume learning');
    // The review card (and its "Start review" primary) is entirely absent while Resume is focal.
    expect(queryByText('Words ready to review')).toBeNull();
    expect(queryByText('Start review')).toBeNull();
  });
});

describe('HomeScreen — daily cap states', () => {
  it('shows the Start review primary + progress copy below cap', async () => {
    const services = defaultServices({
      getActiveSession: async () => null,
      getDailyProgress: async () => ({
        reviewsCompletedToday: 8,
        effectiveDailyCap: 15,
        newWordsCompletedToday: 0,
        newWordsBudget: 10,
      }),
    });
    const { findByText } = await renderWithProviders(
      <HomeScreen onStartReview={jest.fn()} onLearnNewWords={jest.fn()} />,
      services,
    );
    await findByText('8 of 15 reviews done');
    expect(await findByText('Start review')).toBeTruthy();
  });

  it('drops the dead CTA and shows the done copy at cap — no dead-end button', async () => {
    const services = defaultServices({
      getActiveSession: async () => null,
      getDailyProgress: async () => ({
        reviewsCompletedToday: 15,
        effectiveDailyCap: 15,
        newWordsCompletedToday: 0,
        newWordsBudget: 10,
      }),
    });
    const { findByText, queryByText } = await renderWithProviders(
      <HomeScreen onStartReview={jest.fn()} onLearnNewWords={jest.fn()} />,
      services,
    );
    await findByText("Today's reviews are done");
    expect(queryByText('Start review')).toBeNull();
  });
});

describe('HomeScreen — read-failure honesty', () => {
  it('shows a neutral retry message instead of a false zero when mastery levels fail to load', async () => {
    const services = defaultServices({
      getActiveSession: async () => null,
      getMasteryLevels: async () => {
        throw new Error('read failed');
      },
    });
    const { findByText, queryByText } = await renderWithProviders(
      <HomeScreen onStartReview={jest.fn()} onLearnNewWords={jest.fn()} />,
      services,
    );
    await findByText("Couldn't load your progress");
    expect(queryByText(/known ·/)).toBeNull();
    // The secondary CTA still works even when the mastery read fails.
    expect(await findByText('Keep learning')).toBeTruthy();
  });

  it('shows a neutral streak note instead of a false zero streak when stats fail to load', async () => {
    const services = defaultServices({
      getActiveSession: async () => null,
      getUserStats: async () => {
        throw new Error('read failed');
      },
    });
    const { findByText } = await renderWithProviders(
      <HomeScreen onStartReview={jest.fn()} onLearnNewWords={jest.fn()} />,
      services,
    );
    expect(await findByText('Streak unavailable')).toBeTruthy();
  });
});
