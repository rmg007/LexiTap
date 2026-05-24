import type { Word, AssessmentType } from '@/domain/index';
import type { AssessmentOption } from '@/presentation/components/assessments/types';

// Pure question-building for the quiz driver. Turns a target Word plus its
// session-sibling words into a presentational question (prompt + options +
// correct value). No SQL, no network, no randomness side effects — the caller
// passes the sibling pool and an optional [0,1) RNG. Distractors come from the
// same session batch (already same-tier per StartQuizUseCase).
//
// NOTE: this is presentation-only shaping of already-loaded domain Words. The
// authoritative correctness check still happens in AnswerQuestionUseCase; the
// `correctValue` here is the string the widget emits and the screen forwards.

export interface BuiltQuestion {
  assessmentType: AssessmentType;
  prompt: string; // the word under study
  context?: string; // a caption prompt
  sentence: string; // example sentence with the "_" blank (for drag_drop)
  options: AssessmentOption[];
  correctValue: string;
}

type RandomFn = () => number;

function shuffle<T>(items: readonly T[], random: RandomFn): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const a = out[i];
    const b = out[j];
    if (a !== undefined && b !== undefined) {
      out[i] = b;
      out[j] = a;
    }
  }
  return out;
}

export interface BuildQuestionInput {
  target: Word;
  pool: readonly Word[]; // sibling words in the session (for distractors)
  assessmentType: AssessmentType;
  distractorCount?: number;
  random?: RandomFn;
}

/**
 * Build a presentational question for the target word.
 * - multiple_choice: prompt is the word; options are definitions; correct is
 *   the target's definition.
 * - drag_drop / image_match / classification: prompt is the definition; options
 *   are candidate words; correct is the target word.
 */
export function buildQuestion(input: BuildQuestionInput): BuiltQuestion {
  const { target, pool, assessmentType, distractorCount = 3, random = Math.random } = input;

  const distractors = shuffle(
    pool.filter((w) => w.id !== target.id),
    random,
  ).slice(0, Math.max(0, distractorCount));

  if (assessmentType === 'multiple_choice') {
    const correctValue = target.definition;
    const options: AssessmentOption[] = shuffle(
      [
        { id: target.id, value: target.definition, label: target.definition },
        ...distractors.map((w) => ({ id: w.id, value: w.definition, label: w.definition })),
      ],
      random,
    );
    return {
      assessmentType,
      prompt: target.word,
      context: 'Which meaning fits?',
      sentence: target.exampleSentence,
      options,
      correctValue,
    };
  }

  // Word-as-answer widgets (drag_drop / image_match / classification).
  const correctValue = target.word;
  const options: AssessmentOption[] = shuffle(
    [
      { id: target.id, value: target.word, label: target.word },
      ...distractors.map((w) => ({ id: w.id, value: w.word, label: w.word })),
    ],
    random,
  );
  return {
    assessmentType,
    prompt: target.definition,
    context: 'Choose the word that fits.',
    sentence: target.exampleSentence,
    options,
    correctValue,
  };
}
