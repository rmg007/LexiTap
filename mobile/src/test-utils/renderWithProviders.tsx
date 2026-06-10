import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
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
 *
 * RTL 14 removed the UNSAFE_*ByType queries; we walk the host tree via the new
 * test-renderer `root.queryAll` and match the TextInput host type instead. Pass
 * the AWAITED render result (RTL 14's render() is async — React 19 async act).
 */
export function assertNoTextInput(utils: Awaited<ReturnType<typeof render>>): void {
  const inputs = utils.root?.queryAll((node) => node.type === 'TextInput') ?? [];
  expect(inputs).toHaveLength(0);
}

/**
 * Press a multiple-choice option by its label and wait for the selection to
 * register before returning. React 19 flushes the press-driven state update
 * asynchronously, so a synchronous Submit immediately after the press would
 * still observe no selection (Submit no-ops). The option's accessibilityLabel
 * equals its label text; the radio Pressable exposes the selected a11y state.
 */
export async function selectOption(
  utils: Awaited<ReturnType<typeof render>>,
  label: string,
): Promise<void> {
  fireEvent.press(utils.getByText(label));
  await waitFor(() =>
    expect(utils.getByLabelText(label).props.accessibilityState?.selected).toBe(true),
  );
}
