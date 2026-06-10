import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { LearnQuickCheckScreen } from '@/presentation/screens/LearnQuickCheckScreen';
import type { AnswerQuestionInput, AnswerQuestionOutput } from '@/application/quiz/AnswerQuestionUseCase';
import {
  BATCH,
  TIER,
  defaultServices,
  renderWithProviders,
} from '@/presentation/screens/__fixtures__/learnFixtures';

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

    const { getByText, findByText } = renderWithProviders(
      <LearnQuickCheckScreen
        batch={BATCH}
        tierId={TIER}
        onComplete={onComplete}
        onExit={jest.fn()}
      />,
      services,
    );

    for (const word of BATCH) {
      // Prompt is the word; options are definitions. Press the correct one.
      await findByText(word.word);
      fireEvent.press(getByText(word.definition));
      fireEvent.press(getByText('Submit'));
      fireEvent.press(await findByText('Continue'));
    }

    expect(answerQuestion).toHaveBeenCalledTimes(BATCH.length);
    expect(answerCalls.map((c) => c.wordId)).toEqual(BATCH.map((w) => w.id));
    expect(answerCalls.every((c) => c.isCorrect)).toBe(true);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
