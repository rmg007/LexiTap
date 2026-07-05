// Reanimated's real mount-animation leaves global animation state that leaks
// across renders in this file. The official jest mock makes shared values +
// withTiming synchronous no-ops; supplement the one hook it omits
// (useReducedMotion). Each test unmount()s so the deferred setAccessibilityFocus
// timer is cleared (else it fires post-teardown and crashes the run). The one
// test that presses buttons runs LAST — a press schedules press-animation work
// that would otherwise bleed into the next render.
jest.mock('react-native-reanimated', () => {
  const mock = require('react-native-reanimated/mock');
  return { __esModule: true, ...mock, default: mock.default ?? mock, useReducedMotion: () => false };
});

import { AccessibilityInfo } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import { FeedbackLayer } from '@/presentation/screens/FeedbackLayer';
import { renderWithProviders } from '@/test-utils/renderWithProviders';

// Proves the optional Save + "Too easy" controls (WORD_FEEDBACK_PLAN):
//  - Save renders in BOTH states; "Too easy" only in the CORRECT state (a wrong
//    answer can never accelerate — defense in depth alongside the use-case guard).
//  - Continue stays the single primary in every state (calm layout preserved).
//  - All controls are optional: omitting the handlers renders neither.

beforeAll(() => {
  jest.spyOn(AccessibilityInfo, 'setAccessibilityFocus').mockImplementation(() => undefined);
});

const CORRECT = {
  wasCorrect: true as const,
  chosenValue: 'right',
  correctValue: 'right',
  gloss: 'g',
};

describe('FeedbackLayer — optional controls', () => {
  it('correct state renders both "Too easy" and "Save", plus Continue', async () => {
    const { getByText, unmount } = await renderWithProviders(
      <FeedbackLayer
        {...CORRECT}
        onContinue={jest.fn()}
        wordLabel="apple"
        isSaved={false}
        onToggleSave={jest.fn()}
        onMarkEasy={jest.fn()}
        easeSelected={false}
      />,
    );
    expect(getByText('Continue')).toBeTruthy();
    expect(getByText('Too easy — skip ahead')).toBeTruthy();
    expect(getByText('Save this word')).toBeTruthy();
    unmount();
  });

  it('correction state renders Save but NOT "Too easy"', async () => {
    const { getByText, queryByText, unmount } = await renderWithProviders(
      <FeedbackLayer
        wasCorrect={false}
        chosenValue="wrong"
        correctValue="right"
        gloss="g"
        onContinue={jest.fn()}
        wordLabel="apple"
        onToggleSave={jest.fn()}
        onMarkEasy={jest.fn()}
      />,
    );
    expect(getByText('Continue')).toBeTruthy();
    expect(getByText('Save this word')).toBeTruthy();
    expect(queryByText('Too easy — skip ahead')).toBeNull();
    unmount();
  });

  it('easeSelected renders the "Skipping ahead" label; isSaved renders "Saved"', async () => {
    const { getByText, unmount } = await renderWithProviders(
      <FeedbackLayer
        {...CORRECT}
        onContinue={jest.fn()}
        onMarkEasy={jest.fn()}
        easeSelected
        onToggleSave={jest.fn()}
        isSaved
      />,
    );
    expect(getByText('Skipping ahead')).toBeTruthy();
    expect(getByText('Saved')).toBeTruthy();
    unmount();
  });

  it('omitting the handlers renders neither control (only Continue)', async () => {
    const { getByText, queryByText, unmount } = await renderWithProviders(
      <FeedbackLayer {...CORRECT} onContinue={jest.fn()} />,
    );
    expect(getByText('Continue')).toBeTruthy();
    expect(queryByText('Save this word')).toBeNull();
    expect(queryByText('Too easy — skip ahead')).toBeNull();
    unmount();
  });

  // Runs last: pressing schedules press-animation work that can bleed forward.
  it('firing the controls calls their handlers', async () => {
    const onMarkEasy = jest.fn();
    const onToggleSave = jest.fn();
    const { getByText, unmount } = await renderWithProviders(
      <FeedbackLayer
        {...CORRECT}
        onContinue={jest.fn()}
        onMarkEasy={onMarkEasy}
        onToggleSave={onToggleSave}
      />,
    );
    fireEvent.press(getByText('Too easy — skip ahead'));
    fireEvent.press(getByText('Save this word'));
    expect(onMarkEasy).toHaveBeenCalledTimes(1);
    expect(onToggleSave).toHaveBeenCalledTimes(1);
    unmount();
  });
});
