import type { AssessmentType } from '@/domain/index';

// Shared presentational contracts for assessment widgets. Widgets are pure UI:
// they receive a question + options and emit onAnswer(answer). NO business
// logic, NO SQL, NO network, and NEVER a TextInput (hard invariant from
// CODING_STANDARDS.md / ARCHITECTURE.md). The string answer the widget emits is
// what the application layer compares against the correct answer.

export interface AssessmentOption {
  // Stable identity for keying + selection.
  id: string;
  // The answer string emitted to onAnswer when chosen.
  value: string;
  // Display label (e.g. a candidate word or definition).
  label: string;
}

// Emitted once the learner commits an answer.
export interface AssessmentAnswer {
  value: string;
  assessmentType: AssessmentType;
}

export type AnswerCallback = (answer: AssessmentAnswer) => void;

// Per-option visual feedback after the answer is revealed. Three redundant
// channels (color + icon + copy) so meaning is never color-only.
export type OptionFeedback = 'idle' | 'selected' | 'correct' | 'incorrect' | 'reveal_correct';

export interface FeedbackInput {
  optionValue: string;
  selectedValue: string | null;
  correctValue: string;
  // Whether the answer has been submitted/revealed yet.
  revealed: boolean;
}

/**
 * Pure mapping from selection + correctness to a per-option feedback state.
 * Exported for unit testing — this is the entire interaction logic of the
 * tap/drag widgets.
 *
 * Before reveal: the chosen option is `selected`, others `idle`.
 * After reveal:
 *   - the chosen option is `correct` if right, else `incorrect`;
 *   - a non-chosen option that IS the correct answer shows `reveal_correct`
 *     (so the learner always sees the right answer);
 *   - everything else is `idle`.
 */
export function optionFeedback(input: FeedbackInput): OptionFeedback {
  const { optionValue, selectedValue, correctValue, revealed } = input;
  const isChosen = selectedValue !== null && optionValue === selectedValue;
  const isCorrectOption = optionValue === correctValue;

  if (!revealed) {
    return isChosen ? 'selected' : 'idle';
  }
  if (isChosen) {
    return isCorrectOption ? 'correct' : 'incorrect';
  }
  return isCorrectOption ? 'reveal_correct' : 'idle';
}

/** Whether a committed answer is correct. Pure; exported for testing. */
export function isAnswerCorrect(selectedValue: string | null, correctValue: string): boolean {
  return selectedValue !== null && selectedValue === correctValue;
}
