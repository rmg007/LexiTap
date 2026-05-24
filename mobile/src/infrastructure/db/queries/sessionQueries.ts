import type { DatabaseHandle } from '@/infrastructure/db/database';

// Named, parameterized queries for quiz_sessions (audit, one row per session).
// Unlike quiz_attempts/event_log, a session row is updated once on completion;
// it is not append-only.

export function insertSession(
  db: DatabaseHandle,
  params: {
    tierId: string;
    startedAt: number;
    completedAt: number | null;
    totalQuestions: number | null;
    totalCorrect: number | null;
    durationSeconds: number | null;
    quizMode: string;
  },
): Promise<{ lastInsertRowId: number; changes: number }> {
  return db.run(
    `INSERT INTO quiz_sessions (
       tier_id, started_at, completed_at, total_questions, total_correct,
       duration_seconds, quiz_mode
     ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      params.tierId,
      params.startedAt,
      params.completedAt,
      params.totalQuestions,
      params.totalCorrect,
      params.durationSeconds,
      params.quizMode,
    ],
  );
}

// Mark a session complete. completed_at NULL means abandoned (prompt resume).
export function completeSession(
  db: DatabaseHandle,
  id: number,
  completedAt: number,
): Promise<{ lastInsertRowId: number; changes: number }> {
  return db.run(`UPDATE quiz_sessions SET completed_at = ? WHERE id = ?`, [completedAt, id]);
}
