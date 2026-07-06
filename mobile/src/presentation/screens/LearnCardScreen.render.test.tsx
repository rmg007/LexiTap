import { fireEvent } from '@testing-library/react-native';
import { LearnCardScreen } from '@/presentation/screens/LearnCardScreen';
import type { WordDetail } from '@/presentation/services/ServicesContext';
import type { WordSense } from '@/domain/vocabulary/Word';
import { NoWordsAvailableError } from '@/domain/index';
import {
  BATCH,
  TIER,
  defaultServices,
  renderWithProviders,
} from '@/test-utils/renderWithProviders';

// Render tests for the learn-card handoff (RTL_RENDER_HARNESS_PLAN.md).
// The final "Next" tap must call onComplete WITH the batch — a bare onComplete()
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

async function renderLearnCard(options?: {
  onComplete?: jest.Mock;
  onExit?: jest.Mock;
  getWordDetail?: () => Promise<WordDetail | null>;
}) {
  const onComplete = options?.onComplete ?? jest.fn();
  const onExit = options?.onExit ?? jest.fn();
  const services = defaultServices({
    getWordDetail: options?.getWordDetail,
  });
  // RTL 14 render() is async (React 19 async act).
  const utils = await renderWithProviders(
    <LearnCardScreen tierId={TIER} onExit={onExit} onComplete={onComplete} />,
    services,
  );
  return { ...utils, onComplete, onExit };
}

describe('LearnCardScreen (render)', () => {
  it('hands the full batch to onComplete after tapping through all cards', async () => {
    const { findByText, getByText, onComplete } = await renderLearnCard();

    // Card 1 of 3.
    await findByText('borrow');
    expect(onComplete).not.toHaveBeenCalled();
    fireEvent.press(getByText('Next'));

    // Card 2 of 3.
    await findByText('arrive');
    expect(onComplete).not.toHaveBeenCalled();
    fireEvent.press(getByText('Next'));

    // Card 3 of 3 — final tap must hand off the batch (not a bare call).
    await findByText('tired');
    fireEvent.press(getByText('Next'));

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith(BATCH);
  });

  it('renders numbered MEANING blocks for all cards when senses are present', async () => {
    // Mock returns the same two senses for every word id. All 3 cards should
    // render the rich layout — this catches a regression where the sense cache
    // broke on index > 0 (cards 2 and 3 falling back to flat silently).
    const detail: WordDetail = { word: BATCH[0]!, senses: TWO_SENSES };
    const { findByText, getByText, queryByText } = await renderLearnCard({
      getWordDetail: async () => detail,
    });

    // Card 1 — rich layout replaces flat definition.
    await findByText('MEANING 1 · noun');
    await findByText('MEANING 2 · verb');
    expect(queryByText(BATCH[0]!.definition)).toBeNull();

    // Card 2 — advance, rich layout still renders (cache populated for w2).
    fireEvent.press(getByText('Next'));
    await findByText('arrive');
    await findByText('MEANING 1 · noun');
    await findByText('MEANING 2 · verb');

    // Card 3 — same check.
    fireEvent.press(getByText('Next'));
    await findByText('tired');
    await findByText('MEANING 1 · noun');
    await findByText('MEANING 2 · verb');
  });

  it('falls back to the flat definition when a word has no rich senses', async () => {
    const { findByText, queryByText } = await renderLearnCard({
      getWordDetail: async () => null,
    });

    await findByText('to take something to use temporarily');
    expect(queryByText(/MEANING/)).toBeNull();
  });
});

describe('LearnCardScreen — word navigation (tactical Phase 7)', () => {
  it('disables the previous chevron on the first card', async () => {
    const { findByText, getByLabelText } = await renderLearnCard();
    await findByText('borrow');
    expect(getByLabelText('Previous word').props.accessibilityState?.disabled).toBe(true);
  });

  it('goes forward via the Next chevron, then back to the same word via Previous', async () => {
    const { findByText, getByLabelText, queryByText } = await renderLearnCard();
    await findByText('borrow');

    fireEvent.press(getByLabelText('Next word'));
    await findByText('arrive');
    expect(queryByText('borrow')).toBeNull();
    expect(getByLabelText('Previous word').props.accessibilityState?.disabled).toBe(false);

    fireEvent.press(getByLabelText('Previous word'));
    await findByText('borrow');
    expect(queryByText('arrive')).toBeNull();
    expect(getByLabelText('Previous word').props.accessibilityState?.disabled).toBe(true);
  });

  it('reloads bookmark state per revisited word', async () => {
    const savedWordIds = new Set([BATCH[1]!.id]); // only "arrive" is saved
    const services = defaultServices({
      getWordDetail: async () => null,
      isWordSaved: async (...args: unknown[]) => savedWordIds.has(args[0] as never),
    });
    const { findByText, getByLabelText, findByLabelText } = await renderWithProviders(
      <LearnCardScreen tierId={TIER} onExit={jest.fn()} onComplete={jest.fn()} />,
      services,
    );

    await findByText('borrow');
    await findByLabelText('Save borrow for later'); // not saved

    fireEvent.press(getByLabelText('Next word'));
    await findByText('arrive');
    await findByLabelText('Remove arrive from saved'); // saved

    fireEvent.press(getByLabelText('Previous word'));
    await findByText('borrow');
    await findByLabelText('Save borrow for later'); // reloaded, not saved again
  });
});

describe('LearnCardScreen — all-caught-up copy split (tactical Phase 20)', () => {
  it('shows the daily-budget-reached copy when the new-word budget is used up', async () => {
    const services = defaultServices({
      startQuiz: async () => {
        throw new NoWordsAvailableError('foundation', 'learn');
      },
      getDailyProgress: async () => ({
        reviewsCompletedToday: 5,
        effectiveDailyCap: 40,
        newWordsCompletedToday: 10,
        newWordsBudget: 10,
      }),
    });
    const { findByText } = await renderWithProviders(
      <LearnCardScreen tierId={TIER} onExit={jest.fn()} onComplete={jest.fn()} />,
      services,
    );
    await findByText("You've hit today's new-word limit");
    await findByText('Come back tomorrow for more new words.');
  });

  it('shows the pool-exhausted copy when the daily budget has not been reached', async () => {
    const services = defaultServices({
      startQuiz: async () => {
        throw new NoWordsAvailableError('foundation', 'learn');
      },
      getDailyProgress: async () => ({
        reviewsCompletedToday: 5,
        effectiveDailyCap: 40,
        newWordsCompletedToday: 2,
        newWordsBudget: 10,
      }),
    });
    const { findByText } = await renderWithProviders(
      <LearnCardScreen tierId={TIER} onExit={jest.fn()} onComplete={jest.fn()} />,
      services,
    );
    await findByText("You're all caught up");
    await findByText("You're all caught up on new words.");
  });
});
