import type { DatabaseHandle } from '@/infrastructure/db/database';
import type { QuizAttemptRow } from '@/infrastructure/db/rows';

// quiz_attempts is APPEND-ONLY (DATABASE_SCHEMA.md). This module exposes INSERT
// and history SELECTs ONLY — deliberately no UPDATE/DELETE so the append-only
// invariant holds at the call-site level. Corrections are compensating inserts.
// Carries replay context (pre_mastery_level, scheduled_review_date,
// scheduler_version) so a future scheduler can retrain by replaying history.

export function insertAttempt(
  db: DatabaseHandle,
  params: {
    sessionId: number;
    wordId: string;
    assessmentType: string;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: number; // 0/1
    answeredAt: number;
    timeToAnswerMs: number | null;
    preMasteryLevel: number | null;
    scheduledReviewDate: number | null;
    schedulerVersion: string | null;
  },
): Promise<{ lastInsertRowId: number; changes: number }> {
  return db.run(
    `INSERT INTO quiz_attempts (
       session_id, word_id, assessment_type, user_answer, correct_answer,
       is_correct, answered_at, time_to_answer_ms, pre_mastery_level,
       scheduled_review_date, scheduler_version
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      params.sessionId,
      params.wordId,
      params.assessmentType,
      params.userAnswer,
      params.correctAnswer,
      params.isCorrect,
      params.answeredAt,
      params.timeToAnswerMs,
      params.preMasteryLevel,
      params.scheduledReviewDate,
      params.schedulerVersion,
    ],
  );
}

// History render for a session. NO active filter applied to the joined words on
// purpose — soft-deleted words must still render in history (DATABASE_SCHEMA.md
// "History render"). Returns raw attempt rows; the join to words is left to the
// word repository so each module owns its own table.
export function selectAttemptsBySession(
  db: DatabaseHandle,
  sessionId: number,
): Promise<QuizAttemptRow[]> {
  return db.all<QuizAttemptRow>(
    `SELECT id, session_id, word_id, assessment_type, user_answer, correct_answer,
            is_correct, answered_at, time_to_answer_ms, pre_mastery_level,
            scheduled_review_date, scheduler_version
     FROM quiz_attempts
     WHERE session_id = ?
     ORDER BY answered_at ASC`,
    [sessionId],
  );
}
