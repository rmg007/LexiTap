import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { LearnCardScreen } from '@/presentation/screens/LearnCardScreen';
import type { WordDetail } from '@/presentation/services/ServicesContext';
import type { WordSense } from '@/domain/vocabulary/Word';
import {
  BATCH,
  TIER,
  defaultServices,
  renderWithProviders,
} from '@/test-utils/renderWithProviders';

// Render tests for the learn-card handoff (RTL_RENDER_HARNESS_PLAN.md).
// The final "Got it" must call onComplete WITH the batch — a bare onComplete()
// silently kills SRS seeding for every new word learned.

const TWO_SENSES: WordSense[] = [
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

function renderLearnCard(options?: {
  onComplete?: jest.Mock;
  onExit?: jest.Mock;
  getWordDetail?: () => Promise<WordDetail | null>;
}) {
  const onComplete = options?.onComplete ?? jest.fn();
  const onExit = options?.onExit ?? jest.fn();
  const services = defaultServices({
    getWordDetail: options?.getWordDetail,
  });
  const utils = renderWithProviders(
    <LearnCardScreen tierId={TIER} onExit={onExit} onComplete={onComplete} />,
    services,
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

  it('renders numbered MEANING blocks for all cards when senses are present', async () => {
    // Mock returns the same two senses for every word id. All 3 cards should
    // render the rich layout — this catches a regression where the sense cache
    // broke on index > 0 (cards 2 and 3 falling back to flat silently).
    const detail: WordDetail = { word: BATCH[0]!, senses: TWO_SENSES };
    const { findByText, getByText, queryByText } = renderLearnCard({
      getWordDetail: async () => detail,
    });

    // Card 1 — rich layout replaces flat definition.
    await findByText('MEANING 1 · noun');
    await findByText('MEANING 2 · verb');
    expect(queryByText(BATCH[0]!.definition)).toBeNull();

    // Card 2 — advance, rich layout still renders (cache populated for w2).
    fireEvent.press(getByText('Got it'));
    await findByText('arrive');
    await findByText('MEANING 1 · noun');
    await findByText('MEANING 2 · verb');

    // Card 3 — same check.
    fireEvent.press(getByText('Got it'));
    await findByText('tired');
    await findByText('MEANING 1 · noun');
    await findByText('MEANING 2 · verb');
  });

  it('falls back to the flat definition when a word has no rich senses', async () => {
    const { findByText, queryByText } = renderLearnCard({
      getWordDetail: async () => null,
    });

    await findByText('to take something to use temporarily');
    expect(queryByText(/MEANING/)).toBeNull();
  });
});
