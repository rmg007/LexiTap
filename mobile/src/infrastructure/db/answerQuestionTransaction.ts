import type { DatabaseHandle } from '@/infrastructure/db/database';
import type { QuizAttempt } from '@/domain/quiz/types';
import type { UserProgress } from '@/domain/user/UserProgress';
import { insertAttempt } from '@/infrastructure/db/queries/attemptQueries';
import { upsertProgress } from '@/infrastructure/db/queries/progressQueries';
import { insertEvent } from '@/infrastructure/db/queries/eventLogQueries';

// Atomic AnswerQuestion write path (DATABASE_SCHEMA.md / SYSTEM_ARCHITECTURE.md):
// appending the immutable attempt, updating the mutable SRS progress, and
// writing the event_log audit row must all commit together or not at all —
// otherwise replay/audit and hot state diverge. The application use case calls
// this; the three writes share one transaction handle so expo-sqlite
// commits/rolls back as a unit.
//
// event_log is written synchronously in the SAME transaction (no queue), per
// the append-only audit design.
export interface AnswerQuestionWrite {
  readonly attempt: Omit<QuizAttempt, 'id'>;
  readonly progress: UserProgress; // post-scheduler state to persist
  readonly event: { eventType: string; payload: string | null; occurredAt: number };
}

export function runAnswerQuestionTransaction(
  db: DatabaseHandle,
  write: AnswerQuestionWrite,
): Promise<void> {
  return db.transaction(async (tx) => {
    await insertAttempt(tx, {
      sessionId: write.attempt.sessionId,
      wordId: write.attempt.wordId,
      assessmentType: write.attempt.assessmentType,
      userAnswer: write.attempt.userAnswer,
      correctAnswer: write.attempt.correctAnswer,
      isCorrect: write.attempt.isCorrect ? 1 : 0,
      answeredAt: write.attempt.answeredAt,
      timeToAnswerMs: write.attempt.timeToAnswerMs ?? null,
      preMasteryLevel: write.attempt.preMasteryLevel ?? null,
      scheduledReviewDate: write.attempt.scheduledReviewDate ?? null,
      schedulerVersion: write.attempt.schedulerVersion ?? null,
      userEase: write.attempt.userEase ?? null,
    });

    await upsertProgress(tx, {
      word_id: write.progress.wordId,
      mastery_level: write.progress.masteryLevel,
      next_review_date: write.progress.nextReviewDate,
      last_reviewed_at: write.progress.lastReviewedAt ?? null,
      consecutive_correct: write.progress.consecutiveCorrect,
      total_attempts: write.progress.totalAttempts,
      total_correct: write.progress.totalCorrect,
      first_seen_at: write.progress.firstSeenAt ?? null,
      scheduler_version: write.progress.schedulerVersion,
    });

    await insertEvent(tx, {
      eventType: write.event.eventType,
      payload: write.event.payload,
      occurredAt: write.event.occurredAt,
    });
  });
}
