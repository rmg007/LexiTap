import { describe, it, expect } from 'vitest';
import { validateMasterQuestions } from '@/commands/question-validators';
import type { MasterQuestion } from '@/commands/export-master';

function q(overrides: Partial<MasterQuestion> & { question_index: number; type: string }): MasterQuestion {
  return {
    prompt: 'prompt',
    correct: 'correct',
    distractors: [],
    hint: null,
    explanation: 'because',
    reviewed: false,
    ...overrides,
  } as MasterQuestion;
}

/** A structurally valid 5-question set, one of each type. */
function validFive(): MasterQuestion[] {
  return [
    q({ question_index: 0, type: 'multiple_choice', correct: 'They negotiated a deal.', distractors: ['a', 'b', 'c'] }),
    q({ question_index: 1, type: 'definition_match', correct: 'to discuss to agree', distractors: ['x', 'y', 'z'] }),
    q({ question_index: 2, type: 'fill_blank', prompt: 'They met to ___ a deal.', correct: 'negotiate', distractors: ['cancel', 'ignore', 'sleep'] }),
    q({ question_index: 3, type: 'sentence_order', prompt: 'Arrange:', correct: 'She negotiated a better price.', distractors: [] }),
    q({ question_index: 4, type: 'true_false', prompt: 'It means to force.', correct: 'False', distractors: ['True'] }),
  ];
}

describe('validateMasterQuestions — happy path', () => {
  it('accepts a valid 5-question set with expectedCount', () => {
    expect(validateMasterQuestions(validFive(), { expectedCount: 5 })).toEqual([]);
  });
});

describe('validateMasterQuestions — structural', () => {
  it('flags a wrong count', () => {
    const errs = validateMasterQuestions(validFive().slice(0, 4), { expectedCount: 5 });
    expect(errs.some((e) => /expected exactly 5/.test(e.message))).toBe(true);
  });

  it('flags non-contiguous question_index', () => {
    const set = validFive();
    set[2]!.question_index = 9;
    const errs = validateMasterQuestions(set);
    expect(errs.some((e) => /question_index gap/.test(e.message))).toBe(true);
  });

  it('flags an invalid type', () => {
    const errs = validateMasterQuestions([q({ question_index: 0, type: 'essay' })]);
    expect(errs.some((e) => /invalid type 'essay'/.test(e.message))).toBe(true);
  });

  it('flags empty prompt / correct / explanation', () => {
    const errs = validateMasterQuestions([
      q({ question_index: 0, type: 'multiple_choice', prompt: '', correct: '', explanation: '', distractors: ['a', 'b'] }),
    ]);
    expect(errs.some((e) => e.field.endsWith('.prompt'))).toBe(true);
    expect(errs.some((e) => e.field.endsWith('.correct'))).toBe(true);
    expect(errs.some((e) => e.field.endsWith('.explanation'))).toBe(true);
  });
});

describe('validateMasterQuestions — distractor + per-type rules', () => {
  it('flags a correct answer leaked into distractors', () => {
    const errs = validateMasterQuestions([
      q({ question_index: 0, type: 'multiple_choice', correct: 'Yes', distractors: ['Yes', 'No', 'Maybe'] }),
    ]);
    expect(errs.some((e) => /must not also appear/.test(e.message))).toBe(true);
  });

  it('flags duplicate distractors', () => {
    const errs = validateMasterQuestions([
      q({ question_index: 0, type: 'multiple_choice', correct: 'Yes', distractors: ['No', 'No', 'Maybe'] }),
    ]);
    expect(errs.some((e) => /duplicate distractor/.test(e.message))).toBe(true);
  });

  it('requires >=2 distractors for choice types', () => {
    const errs = validateMasterQuestions([
      q({ question_index: 0, type: 'multiple_choice', correct: 'Yes', distractors: ['No'] }),
    ]);
    expect(errs.some((e) => /at least 2 distractors/.test(e.message))).toBe(true);
  });

  it('requires fill_blank prompt to contain a blank', () => {
    const errs = validateMasterQuestions([
      q({ question_index: 0, type: 'fill_blank', prompt: 'no blank here', correct: 'x', distractors: ['a', 'b'] }),
    ]);
    expect(errs.some((e) => /blank marker/.test(e.message))).toBe(true);
  });

  it('requires sentence_order to have empty distractors and a >=3-word sentence', () => {
    const errs = validateMasterQuestions([
      q({ question_index: 0, type: 'sentence_order', prompt: 'Arrange:', correct: 'too short', distractors: ['x'] }),
    ]);
    expect(errs.some((e) => /empty distractors array/.test(e.message))).toBe(true);
    expect(errs.some((e) => /at least 3 words/.test(e.message))).toBe(true);
  });

  it('requires true_false correct in {True,False} and distractors = [opposite]', () => {
    const bad = validateMasterQuestions([
      q({ question_index: 0, type: 'true_false', correct: 'Maybe', distractors: ['True'] }),
    ]);
    expect(bad.some((e) => /must be "True" or "False"/.test(e.message))).toBe(true);

    const wrongDistractor = validateMasterQuestions([
      q({ question_index: 0, type: 'true_false', correct: 'True', distractors: ['Nope'] }),
    ]);
    expect(wrongDistractor.some((e) => /must be exactly \["False"\]/.test(e.message))).toBe(true);
  });
});
