import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { LearnCardScreen } from '@/presentation/screens/LearnCardScreen';
import { LearnQuickCheckScreen } from '@/presentation/screens/LearnQuickCheckScreen';
import { QuizScreen } from '@/presentation/screens/QuizScreen';
import {
  BATCH,
  TIER,
  defaultServices,
  makeSession,
  renderWithProviders,
  assertNoTextInput,
} from '@/presentation/screens/__fixtures__/learnFixtures';

// Passive-recognition invariant: NO TextInput must ever appear in quiz/learn
// screens — in ANY render phase, including the feedback overlay.
//
// The guardrails.mjs PreToolUse hook enforces this for agent edits but only at
// the edit boundary. This test covers codebase state: human edits, merges, and
// refactors are caught here immediately.

describe('Passive-recognition invariant — no TextInput', () => {
  it('LearnCardScreen renders no TextInput', async () => {
    const utils = renderWithProviders(
      <LearnCardScreen tierId={TIER} onExit={jest.fn()} onComplete={jest.fn()} />,
    );
    await utils.findByText('borrow');
    assertNoTextInput(utils);
  });

  it('LearnQuickCheckScreen renders no TextInput — question phase', async () => {
    const utils = renderWithProviders(
      <LearnQuickCheckScreen
        batch={BATCH}
        tierId={TIER}
        onComplete={jest.fn()}
        onExit={jest.fn()}
      />,
    );
    await utils.findByText('borrow');
    assertNoTextInput(utils);
  });

  it('LearnQuickCheckScreen renders no TextInput — feedback phase', async () => {
    const utils = renderWithProviders(
      <LearnQuickCheckScreen
        batch={BATCH}
        tierId={TIER}
        onComplete={jest.fn()}
        onExit={jest.fn()}
      />,
    );
    await utils.findByText('borrow');
    // Advance to the feedback overlay (correct answer → Submit → feedback).
    fireEvent.press(utils.getByText(BATCH[0]!.definition));
    fireEvent.press(utils.getByText('Submit'));
    await utils.findByText('Continue');
    assertNoTextInput(utils);
  });

  it('QuizScreen renders no TextInput — question phase', async () => {
    const services = defaultServices({
      startQuiz: async () => makeSession(BATCH, 'review'),
    });
    const utils = renderWithProviders(
      <QuizScreen tierId={TIER} mode="review" onExit={jest.fn()} />,
      services,
    );
    await utils.findByText('borrow');
    assertNoTextInput(utils);
  });

  it('QuizScreen renders no TextInput — feedback phase', async () => {
    const services = defaultServices({
      startQuiz: async () => makeSession(BATCH, 'review'),
    });
    const utils = renderWithProviders(
      <QuizScreen tierId={TIER} mode="review" onExit={jest.fn()} />,
      services,
    );
    await utils.findByText('borrow');
    // Select the correct option and submit to trigger the FeedbackLayer overlay.
    fireEvent.press(utils.getByText(BATCH[0]!.definition));
    fireEvent.press(utils.getByText('Submit'));
    await utils.findByText('Continue');
    assertNoTextInput(utils);
  });
});
