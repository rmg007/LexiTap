import type { AnswerWriter, AnswerWrite } from '@/domain/quiz/AnswerWriter';
import type { DatabaseHandle } from '@/infrastructure/db/database';
import { runAnswerQuestionTransaction } from '@/infrastructure/db/answerQuestionTransaction';

// SQLite adapter for the AnswerWriter port. Delegates to the existing atomic
// transaction helper so the attempt append, progress upsert, and event_log
// insert commit as a single unit (DATABASE_SCHEMA.md / SYSTEM_ARCHITECTURE.md).
export class SQLiteAnswerWriter implements AnswerWriter {
  constructor(private readonly db: DatabaseHandle) {}

  async write(write: AnswerWrite): Promise<void> {
    await runAnswerQuestionTransaction(this.db, {
      attempt: write.attempt,
      progress: write.progress,
      event: write.event,
    });
  }
}
