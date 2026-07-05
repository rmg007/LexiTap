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
    // index 1 (0-based) → "2/<total>"
    expect(getByText(`Pick up where you left off · 2/${BATCH.length}`)).toBeTruthy();
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
    await findByText('Ready for today');
    // …but no resume affordance without a handler.
    expect(queryByText('Resume learning')).toBeNull();
  });
});
