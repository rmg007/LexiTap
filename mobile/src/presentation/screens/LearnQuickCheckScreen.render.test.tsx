import { fireEvent } from '@testing-library/react-native';
import { LearnQuickCheckScreen } from '@/presentation/screens/LearnQuickCheckScreen';
import type { AnswerQuestionInput, AnswerQuestionOutput } from '@/application/quiz/AnswerQuestionUseCase';
import type { ActiveSession } from '@/domain/index';
import {
  BATCH,
  TIER,
  defaultServices,
  renderWithProviders,
  selectOption,
} from '@/test-utils/renderWithProviders';

// Render test for the SRS-seeding half of the learn loop
// (RTL_RENDER_HARNESS_PLAN.md): answering each quick-check question must call
// AnswerQuestionUseCase exactly once per word — this screen is the ONLY place
// the learn flow writes SRS.

describe('LearnQuickCheckScreen (render)', () => {
  it('writes one SRS seed per word, then completes', async () => {
    const answerCalls: AnswerQuestionInput[] = [];
    const answerQuestion = jest.fn(async (input: AnswerQuestionInput) => {
      answerCalls.push(input);
      return {} as AnswerQuestionOutput;
    });
    const onComplete = jest.fn();
    const services = defaultServices({
      answerQuestion: answerQuestion as unknown as () => Promise<AnswerQuestionOutput>,
    });

    const utils = await renderWithProviders(
      <LearnQuickCheckScreen
        batch={BATCH}
        tierId={TIER}
        onComplete={onComplete}
        onExit={jest.fn()}
      />,
      services,
    );
    const { getByText, findByText } = utils;

    for (const word of BATCH) {
      // Prompt is the word; options are definitions. Press the correct one.
      await findByText(word.word);
      await selectOption(utils, word.definition);
      fireEvent.press(getByText('Submit'));
      fireEvent.press(await findByText('Continue'));
    }

    expect(answerQuestion).toHaveBeenCalledTimes(BATCH.length);
    expect(answerCalls.map((c) => c.wordId)).toEqual(BATCH.map((w) => w.id));
    expect(answerCalls.every((c) => c.isCorrect)).toBe(true);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  // Regression (review 2026-07-05, HIGH): the instant a word's SRS row is
  // committed, the resume snapshot must advance PAST it — otherwise leaving
  // during feedback + resuming re-answers a committed word and double-applies
  // the scheduler. Here: after answering word 0 (before Continue), the most
  // recent snapshot write must point at index 1, never the answered index 0.
  it('advances the resume snapshot past the just-answered word', async () => {
    const saved: ActiveSession[] = [];
    const services = defaultServices({
      answerQuestion: (async () => ({}) as AnswerQuestionOutput) as unknown as () => Promise<AnswerQuestionOutput>,
      saveActiveSession: (async (s: ActiveSession) => {
        saved.push(s);
      }) as unknown as () => Promise<void>,
    });

    const utils = await renderWithProviders(
      <LearnQuickCheckScreen batch={BATCH} tierId={TIER} onComplete={jest.fn()} onExit={jest.fn()} />,
      services,
    );
    const { getByText, findByText } = utils;

    const first = BATCH[0]!;
    await findByText(first.word);
    await selectOption(utils, first.definition);
    fireEvent.press(getByText('Submit'));
    await findByText('Continue'); // now in the feedback phase

    // The latest snapshot write points at the NEXT word (index 1), never the
    // just-answered word (index 0).
    const last = saved[saved.length - 1];
    expect(last?.stage).toBe('check');
    expect(last?.index).toBe(1);
  });

  // Regression: answering the LAST word clears the snapshot (nothing to resume).
  it('clears the resume snapshot after the final answer', async () => {
    let cleared = 0;
    const services = defaultServices({
      answerQuestion: (async () => ({}) as AnswerQuestionOutput) as unknown as () => Promise<AnswerQuestionOutput>,
      clearActiveSession: (async () => {
        cleared += 1;
      }) as unknown as () => Promise<void>,
    });

    const utils = await renderWithProviders(
      <LearnQuickCheckScreen batch={BATCH} tierId={TIER} onComplete={jest.fn()} onExit={jest.fn()} />,
      services,
    );
    const { getByText, findByText } = utils;

    for (const word of BATCH) {
      await findByText(word.word);
      await selectOption(utils, word.definition);
      fireEvent.press(getByText('Submit'));
      fireEvent.press(await findByText('Continue'));
    }

    // Cleared at least once (final answer + finishAndClear on completion).
    expect(cleared).toBeGreaterThanOrEqual(1);
  });
});
