import type { QuizAttempt } from '@/domain/quiz/types';
import type { UserProgress } from '@/domain/user/UserProgress';

// PORT implemented in infrastructure/db. Collapses the three correlated writes
// of a single answer — the append-only attempt, the mutable SRS progress, and
// the append-only event_log audit row — into ONE atomic persist. They must
// commit all-or-nothing (DATABASE_SCHEMA.md / SYSTEM_ARCHITECTURE.md) or
// replay/audit state diverges from hot SRS state. The application use case
// depends on this port instead of writing attempt + progress separately.
export interface AnswerEvent {
  readonly eventType: string;
  readonly payload: string | null;
  readonly occurredAt: number;
}

export interface AnswerWrite {
  readonly attempt: Omit<QuizAttempt, 'id'>;
  readonly progress: UserProgress; // post-scheduler state to persist
  readonly event: AnswerEvent;
}

export interface AnswerWriter {
  write(write: AnswerWrite): Promise<void>;
}
