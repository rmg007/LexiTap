import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { LearnQuickCheckScreen } from '@/presentation/screens/LearnQuickCheckScreen';
import { ThemeProvider } from '@/presentation/theme';
import { ServicesProvider } from '@/presentation/services';
import { createMockServices } from '@/presentation/services/mockServices';
import type { AnswerQuestionInput, AnswerQuestionOutput } from '@/application/quiz/AnswerQuestionUseCase';
import { asTierId, asWordId } from '@/domain/index';
import type { Word } from '@/domain/vocabulary/Word';

// Render test for the SRS-seeding half of the learn loop
// (RTL_RENDER_HARNESS_PLAN.md): answering each quick-check question must call
// AnswerQuestionUseCase exactly once per word — this screen is the ONLY place
// the learn flow writes SRS.

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

describe('LearnQuickCheckScreen (render)', () => {
  it('writes one SRS seed per word, then completes', async () => {
    const answerCalls: AnswerQuestionInput[] = [];
    const answerQuestion = jest.fn(async (input: AnswerQuestionInput) => {
      answerCalls.push(input);
      return {} as AnswerQuestionOutput;
    });
    const onComplete = jest.fn();
    const services = createMockServices({
      answerQuestion: answerQuestion as unknown as () => Promise<AnswerQuestionOutput>,
    });

    const { getByText, findByText } = render(
      <ThemeProvider initialPreference="dark">
        <ServicesProvider value={services}>
          <LearnQuickCheckScreen
            batch={BATCH}
            tierId={TIER}
            onComplete={onComplete}
            onExit={jest.fn()}
          />
        </ServicesProvider>
      </ThemeProvider>,
    );

    for (const word of BATCH) {
      // The prompt is the word under study; options are definitions.
      await findByText(word.word);
      fireEvent.press(getByText(word.definition));
      fireEvent.press(getByText('Submit'));
      // Feedback phase → Continue advances (or completes on the last word).
      fireEvent.press(await findByText('Continue'));
    }

    expect(answerQuestion).toHaveBeenCalledTimes(BATCH.length);
    expect(answerCalls.map((c) => c.wordId)).toEqual(BATCH.map((w) => w.id));
    expect(answerCalls.every((c) => c.isCorrect)).toBe(true);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
