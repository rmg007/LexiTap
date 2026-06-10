import React from 'react';
import { render } from '@testing-library/react-native';
import { TextInput } from 'react-native';
import { LearnCardScreen } from '@/presentation/screens/LearnCardScreen';
import { LearnQuickCheckScreen } from '@/presentation/screens/LearnQuickCheckScreen';
import { QuizScreen } from '@/presentation/screens/QuizScreen';
import { ThemeProvider } from '@/presentation/theme';
import { ServicesProvider } from '@/presentation/services';
import { createMockServices } from '@/presentation/services/mockServices';
import { asTierId, asWordId, asSessionId } from '@/domain/index';
import type { Word } from '@/domain/vocabulary/Word';

// Passive-recognition invariant: NO TextInput must ever appear in quiz/learn
// screens. A learner taps; they never type.
//
// The guardrails.mjs PreToolUse hook enforces this for agent edits, but that
// only guards the edit boundary — human edits, merges, and refactors bypass it.
// This test covers the codebase-state: if any of these screens render a
// TextInput the suite goes red immediately.

const TIER = 'foundation';

function makeWord(id: string, word: string, definition: string): Word {
  return {
    id: asWordId(id),
    word,
    definition,
    tierId: asTierId(TIER),
    wordType: 'vocabulary',
    exampleSentence: `She will _ soon.`,
    synonyms: [],
    antonyms: [],
    isDeleted: false,
  };
}

const BATCH: Word[] = [
  makeWord('w1', 'borrow', 'to take temporarily'),
  makeWord('w2', 'arrive', 'to reach a destination'),
  makeWord('w3', 'tired', 'needing rest'),
];

function makeSession(words: Word[]) {
  return {
    id: asSessionId(1),
    tierId: asTierId(TIER),
    mode: 'review' as const,
    words,
    currentIndex: 0,
    correctCount: 0,
    startedAt: Date.now(),
  };
}

function makeServices(overrides = {}) {
  return createMockServices({
    startQuiz: async () => makeSession(BATCH),
    getWordDetail: async () => null,
    ...overrides,
  });
}

function assertNoTextInput(container: ReturnType<typeof render>): void {
  // UNSAFE_queryAllByType walks the entire rendered tree (mocked RN components
  // included) and surfaces every instance. Zero instances = invariant holds.
  const inputs = container.UNSAFE_queryAllByType(TextInput);
  expect(inputs).toHaveLength(0);
}

describe('Passive-recognition invariant — no TextInput', () => {
  it('LearnCardScreen renders no TextInput', async () => {
    const services = makeServices();
    const utils = render(
      <ThemeProvider initialPreference="dark">
        <ServicesProvider value={services}>
          <LearnCardScreen tierId={TIER} onExit={jest.fn()} onComplete={jest.fn()} />
        </ServicesProvider>
      </ThemeProvider>,
    );
    // Await first word so the loading state is past.
    await utils.findByText('borrow');
    assertNoTextInput(utils);
  });

  it('LearnQuickCheckScreen renders no TextInput', async () => {
    const services = makeServices();
    const utils = render(
      <ThemeProvider initialPreference="dark">
        <ServicesProvider value={services}>
          <LearnQuickCheckScreen
            batch={BATCH}
            tierId={TIER}
            onComplete={jest.fn()}
            onExit={jest.fn()}
          />
        </ServicesProvider>
      </ThemeProvider>,
    );
    await utils.findByText('borrow');
    assertNoTextInput(utils);
  });

  it('QuizScreen renders no TextInput', async () => {
    const services = makeServices({
      startQuiz: async () => makeSession(BATCH),
      getDailyProgress: async () => ({
        reviewsCompletedToday: 0,
        effectiveDailyCap: 40,
        newWordsCompletedToday: 0,
        newWordsBudget: 10,
      }),
    });
    const utils = render(
      <ThemeProvider initialPreference="dark">
        <ServicesProvider value={services}>
          <QuizScreen tierId={TIER} mode="review" onExit={jest.fn()} />
        </ServicesProvider>
      </ThemeProvider>,
    );
    await utils.findByText('borrow');
    assertNoTextInput(utils);
  });
});
