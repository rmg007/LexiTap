import React from 'react';
import { render } from '@testing-library/react-native';
import { TextInput } from 'react-native';
import { ThemeProvider } from '@/presentation/theme';
import { ServicesProvider } from '@/presentation/services';
import { createMockServices, type MockServiceHandlers } from '@/presentation/services/mockServices';
import type { Services } from '@/presentation/services/ServicesContext';
import { BATCH, makeSession } from './learnFixtures';

// Re-export TIER so callers only need one import for the common learn-loop fixtures.
export { TIER, BATCH, makeWord, makeSession } from './learnFixtures';

/** Default services stub — startQuiz returns BATCH, getWordDetail returns null. Override per-test. */
export function defaultServices(handlers: MockServiceHandlers = {}): Services {
  return createMockServices({
    startQuiz: async () => makeSession(BATCH),
    getWordDetail: async () => null,
    ...handlers,
  });
}

/** Render with the standard ThemeProvider + ServicesProvider wrapper. */
export function renderWithProviders(
  ui: React.ReactElement,
  services: Services = defaultServices(),
): ReturnType<typeof render> {
  return render(
    <ThemeProvider initialPreference="dark">
      <ServicesProvider value={services}>{ui}</ServicesProvider>
    </ThemeProvider>,
  );
}

/**
 * Assert no TextInput appears anywhere in the rendered tree.
 * Zero inputs = passive-recognition invariant holds.
 */
export function assertNoTextInput(utils: ReturnType<typeof render>): void {
  expect(utils.UNSAFE_queryAllByType(TextInput)).toHaveLength(0);
}
