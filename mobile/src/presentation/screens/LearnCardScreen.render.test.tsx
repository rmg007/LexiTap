import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { LearnCardScreen } from '@/presentation/screens/LearnCardScreen';
import { ThemeProvider } from '@/presentation/theme';
import { ServicesProvider } from '@/presentation/services';
import { createMockServices, type MockServiceHandlers } from '@/presentation/services/mockServices';
import type { WordDetail } from '@/presentation/services/ServicesContext';
import { asTierId, asWordId, asSessionId } from '@/domain/index';
import type { Word, WordSense } from '@/domain/vocabulary/Word';

// Render tests for the learn-card handoff (RTL_RENDER_HARNESS_PLAN.md).
// This is the test that would have caught the learn-loop P0 (8fab926): the
// final "Got it" must call onComplete WITH the batch — a bare onComplete()
// silently kills SRS seeding for every new word.

const TIER = 'foundation';

function makeWord(id: string, word: string, definition: string): Word {
  return {
    id: asWordId(id),
    word,
    definition,
    tierId: asTierId(TIER),
    wordType: 'vocabulary',
    exampleSentence: `She will _ tomorrow.`,
    synonyms: [],
    antonyms: [],
    isDeleted: false,
  };
}

const BATCH: Word[] = [
  makeWord('w1', 'borrow', 'to take something to use temporarily'),
  makeWord('w2', 'arrive', 'to reach a place'),
  makeWord('w3', 'tired', 'needing rest or sleep'),
];

function makeSession(batch: Word[]) {
  return {
    id: asSessionId(1),
    tierId: asTierId(TIER),
    mode: 'learn' as const,
    words: batch,
    currentIndex: 0,
    correctCount: 0,
    startedAt: Date.now(),
  };
}

function renderLearnCard(options?: {
  handlers?: MockServiceHandlers;
  onComplete?: jest.Mock;
  onExit?: jest.Mock;
}) {
  const onComplete = options?.onComplete ?? jest.fn();
  const onExit = options?.onExit ?? jest.fn();
  const services = createMockServices({
    startQuiz: async () => makeSession(BATCH),
    getWordDetail: async () => null,
    ...options?.handlers,
  });
  const utils = render(
    <ThemeProvider initialPreference="dark">
      <ServicesProvider value={services}>
        <LearnCardScreen tierId={TIER} onExit={onExit} onComplete={onComplete} />
      </ServicesProvider>
    </ThemeProvider>,
  );
  return { ...utils, onComplete, onExit };
}

describe('LearnCardScreen (render)', () => {
  it('hands the full batch to onComplete after tapping through all cards', async () => {
    const { findByText, getByText, onComplete } = renderLearnCard();

    // Card 1 of 3.
    await findByText('borrow');
    expect(onComplete).not.toHaveBeenCalled();
    fireEvent.press(getByText('Got it'));

    // Card 2 of 3.
    await findByText('arrive');
    expect(onComplete).not.toHaveBeenCalled();
    fireEvent.press(getByText('Got it'));

    // Card 3 of 3 — final tap must hand off the batch (not a bare call).
    await findByText('tired');
    fireEvent.press(getByText('Got it'));

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith(BATCH);
  });

  it('renders numbered MEANING blocks when a word has multiple senses', async () => {
    const senses: WordSense[] = [
      {
        senseIndex: 0,
        pos: 'noun',
        shortGloss: 'a living thing that grows in soil',
        explanation: 'Think of something green reaching for the sun.',
        examples: [{ exampleIndex: 0, text: 'The plant on her desk needs water.' }],
      },
      {
        senseIndex: 1,
        pos: 'verb',
        shortGloss: 'to put something in the ground to grow',
        explanation: 'You press a seed into the earth and wait.',
        examples: [{ exampleIndex: 0, text: 'We plant tomatoes every spring.' }],
      },
    ];
    const detail: WordDetail = { word: BATCH[0] as Word, senses };
    const { findByText, queryByText } = renderLearnCard({
      handlers: { getWordDetail: async () => detail },
    });

    await findByText('MEANING 1 · noun');
    expect(queryByText('MEANING 2 · verb')).toBeTruthy();
    expect(queryByText('Think of something green reaching for the sun.')).toBeTruthy();
    expect(queryByText('You press a seed into the earth and wait.')).toBeTruthy();
    // Rich layout replaces the flat definition.
    expect(queryByText(BATCH[0]?.definition ?? '')).toBeNull();
  });

  it('falls back to the flat definition when a word has no rich senses', async () => {
    const { findByText, queryByText } = renderLearnCard({
      handlers: { getWordDetail: async () => null },
    });

    await findByText('to take something to use temporarily');
    expect(queryByText(/MEANING/)).toBeNull();
  });
});
