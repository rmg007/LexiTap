import { optionFeedback, isAnswerCorrect } from '@/presentation/components/assessments/types';
import { splitSentence } from '@/presentation/components/assessments/DragDrop';

// Pure interaction-logic tests for the assessment widgets. These exercise the
// exact functions that drive selection/feedback without needing a renderer
// (no @testing-library / react-test-renderer is installed; per the brief we
// keep tests pure and note that simulator-bound rendering is not covered here).

describe('optionFeedback', () => {
  const correctValue = 'right';

  it('marks the chosen option selected before reveal, others idle', () => {
    expect(
      optionFeedback({ optionValue: 'right', selectedValue: 'right', correctValue, revealed: false }),
    ).toBe('selected');
    expect(
      optionFeedback({ optionValue: 'wrong', selectedValue: 'right', correctValue, revealed: false }),
    ).toBe('idle');
  });

  it('shows nothing selected when no choice yet', () => {
    expect(
      optionFeedback({ optionValue: 'right', selectedValue: null, correctValue, revealed: false }),
    ).toBe('idle');
  });

  it('marks a chosen-correct option correct after reveal', () => {
    expect(
      optionFeedback({ optionValue: 'right', selectedValue: 'right', correctValue, revealed: true }),
    ).toBe('correct');
  });

  it('marks a chosen-incorrect option incorrect (never red X path)', () => {
    expect(
      optionFeedback({ optionValue: 'wrong', selectedValue: 'wrong', correctValue, revealed: true }),
    ).toBe('incorrect');
  });

  it('always reveals the correct option even when not chosen', () => {
    expect(
      optionFeedback({ optionValue: 'right', selectedValue: 'wrong', correctValue, revealed: true }),
    ).toBe('reveal_correct');
  });

  it('leaves other options idle after reveal', () => {
    expect(
      optionFeedback({ optionValue: 'other', selectedValue: 'wrong', correctValue, revealed: true }),
    ).toBe('idle');
  });
});

describe('isAnswerCorrect', () => {
  it('is true only when the selected value matches the correct value', () => {
    expect(isAnswerCorrect('a', 'a')).toBe(true);
    expect(isAnswerCorrect('a', 'b')).toBe(false);
    expect(isAnswerCorrect(null, 'a')).toBe(false);
  });
});

describe('splitSentence', () => {
  it('splits around a single blank', () => {
    expect(splitSentence('She was very _ about her work.')).toEqual({
      before: 'She was very ',
      after: ' about her work.',
    });
  });

  it('treats a sentence with no blank as all-before', () => {
    expect(splitSentence('No blank here.')).toEqual({ before: 'No blank here.', after: '' });
  });
});
