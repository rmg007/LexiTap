import React from 'react';
import { render } from '@testing-library/react-native';
import { TextInput } from 'react-native';
import { ThemeProvider } from '@/presentation/theme';
import { ServicesProvider } from '@/presentation/services';
import { createMockServices, type MockServiceHandlers } from '@/presentation/services/mockServices';
import type { Services } from '@/presentation/services/ServicesContext';
import { asTierId, asWordId, asSessionId } from '@/domain/index';
import type { Word } from '@/domain/vocabulary/Word';

// Shared test fixtures for learn-loop render tests.
// Single source of truth for BATCH, makeWord, makeSession, and the RTL
// render wrapper — avoids definition-string drift across test files.

export const TIER = 'foundation';

export function makeWord(id: string, word: string, definition: string): Word {
  return {
    id: asWordId(id),
    word,
    definition,
    tierId: asTierId(TIER),
    wordType: 'vocabulary',
    exampleSentence: 'She will _ tomorrow.',
    synonyms: [],
    antonyms: [],
    isDeleted: false,
  };
}

export const BATCH: Word[] = [
  makeWord('w1', 'borrow', 'to take something to use temporarily'),
  makeWord('w2', 'arrive', 'to reach a place'),
  makeWord('w3', 'tired', 'needing rest or sleep'),
];

export function makeSession(batch: Word[], mode: 'learn' | 'review' = 'learn') {
  return {
    id: asSessionId(1),
    tierId: asTierId(TIER),
    mode,
    words: batch,
    currentIndex: 0,
    correctCount: 0,
    startedAt: Date.now(),
  };
}

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
