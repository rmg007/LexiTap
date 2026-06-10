/**
 * Pre-write validation for authored `word_questions` (Phase 4). Mirrors the
 * sense validators in `synthesize-senses.ts`: pure, no DB, no I/O — run by the
 * enrichment driver before a generated question is written back into the master
 * JSONL, so malformed/unanswerable questions never reach `import-master`.
 *
 * The product constraint is hard: every question is answered by tap or drag,
 * NEVER by typing (passive-recognition UX). The five allowed types encode that,
 * and the per-type rules below guarantee each question is actually answerable
 * with the data present (a real correct option + real distractors, no leak).
 *
 *   Q1  question_index values 0-based + contiguous (0,1,2,…)
 *   Q2  type ∈ QUESTION_TYPES
 *   Q3  prompt non-empty
 *   Q4  correct non-empty
 *   Q5  explanation non-empty (every question teaches on answer)
 *   Q6  distractors are non-empty strings, no duplicates
 *   Q7  correct does not also appear in distractors (case-insensitive — no leak)
 *   Q8  per-type distractor shape:
 *         multiple_choice / definition_match / fill_blank → ≥ 2 distractors
 *         true_false  → correct ∈ {True,False}; distractors = [the other value]
 *         sentence_order → distractors empty; correct is a ≥3-word sentence
 *   Q9  fill_blank prompt contains a blank marker (___ or _)
 */

import type { MasterQuestion } from '@/commands/export-master';
import { QUESTION_TYPES } from '@/schema/types';

export interface QuestionValidationError {
  field: string;
  message: string;
}

const QUESTION_TYPE_SET: ReadonlySet<string> = new Set(QUESTION_TYPES);
const CHOICE_TYPES: ReadonlySet<string> = new Set(['multiple_choice', 'definition_match', 'fill_blank']);

export interface ValidateQuestionsOptions {
  /** When set, the array length must equal this (enrich-master requires 5). */
  expectedCount?: number;
}

/**
 * Validate a word's authored questions. Returns [] when structurally sound.
 * `wordLabel` is used only for readable field paths.
 */
export function validateMasterQuestions(
  questions: MasterQuestion[],
  options: ValidateQuestionsOptions = {},
): QuestionValidationError[] {
  const errors: QuestionValidationError[] = [];
  const push = (field: string, message: string) => errors.push({ field, message });

  if (!Array.isArray(questions)) {
    push('questions', 'must be an array');
    return errors;
  }
  if (options.expectedCount !== undefined && questions.length !== options.expectedCount) {
    push('questions', `expected exactly ${options.expectedCount} questions, found ${questions.length}`);
  }

  // Q1 contiguous 0-based question_index
  const sorted = [...questions].sort((a, b) => a.question_index - b.question_index);
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i]!.question_index !== i) {
      push(
        `questions[${i}].question_index`,
        i === 0
          ? `question_index must start at 0, found ${sorted[i]!.question_index}`
          : `question_index gap: expected ${i}, found ${sorted[i]!.question_index}`,
      );
    }
  }

  for (const q of sorted) {
    validateOne(q, `questions[${q.question_index}]`, push);
  }
  return errors;
}

function validateOne(
  q: MasterQuestion,
  prefix: string,
  push: (field: string, message: string) => void,
): void {
  // Q2 type
  if (typeof q.type !== 'string' || !QUESTION_TYPE_SET.has(q.type)) {
    push(`${prefix}.type`, `invalid type '${String(q.type)}' (must be one of ${QUESTION_TYPES.join(', ')})`);
    return; // per-type rules below are meaningless without a known type
  }
  // Q3 prompt
  if (!q.prompt || !q.prompt.trim()) push(`${prefix}.prompt`, 'must be non-empty');
  // Q4 correct
  if (!q.correct || !q.correct.trim()) push(`${prefix}.correct`, 'must be non-empty');
  // Q5 explanation
  if (!q.explanation || !q.explanation.trim()) push(`${prefix}.explanation`, 'must be non-empty');

  const distractors = Array.isArray(q.distractors) ? q.distractors : [];

  // Q6 distractors non-empty strings, no duplicates
  if (distractors.some((d) => typeof d !== 'string' || !d.trim())) {
    push(`${prefix}.distractors`, 'every distractor must be a non-empty string');
  }
  const seen = new Set<string>();
  for (const d of distractors) {
    const key = String(d).trim().toLowerCase();
    if (seen.has(key)) {
      push(`${prefix}.distractors`, `duplicate distractor '${d}'`);
      break;
    }
    seen.add(key);
  }
  // Q7 correct not leaked into distractors
  if (q.correct && distractors.some((d) => String(d).trim().toLowerCase() === q.correct.trim().toLowerCase())) {
    push(`${prefix}.distractors`, 'correct answer must not also appear among the distractors');
  }

  // Q8 per-type distractor shape
  if (CHOICE_TYPES.has(q.type)) {
    if (distractors.length < 2) {
      push(`${prefix}.distractors`, `${q.type} needs at least 2 distractors, found ${distractors.length}`);
    }
  } else if (q.type === 'true_false') {
    const c = (q.correct ?? '').trim().toLowerCase();
    if (c !== 'true' && c !== 'false') {
      push(`${prefix}.correct`, `true_false correct must be "True" or "False", found '${q.correct}'`);
    }
    const opposite = c === 'true' ? 'false' : 'true';
    const ds = distractors.map((d) => String(d).trim().toLowerCase());
    if (ds.length !== 1 || ds[0] !== opposite) {
      push(`${prefix}.distractors`, `true_false distractors must be exactly ["${opposite === 'true' ? 'True' : 'False'}"]`);
    }
  } else if (q.type === 'sentence_order') {
    if (distractors.length !== 0) {
      push(`${prefix}.distractors`, 'sentence_order must have an empty distractors array (tokens come from correct)');
    }
    if (q.correct && q.correct.trim().split(/\s+/).length < 3) {
      push(`${prefix}.correct`, 'sentence_order correct must be a sentence of at least 3 words');
    }
  }

  // Q9 fill_blank must show a blank to fill
  if (q.type === 'fill_blank' && q.prompt && !/_/.test(q.prompt)) {
    push(`${prefix}.prompt`, 'fill_blank prompt must contain a blank marker (e.g. "___")');
  }
}
