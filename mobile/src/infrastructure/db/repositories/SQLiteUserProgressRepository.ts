import type { UserProgressRepository } from '@/domain/user/UserProgressRepository';
import type { UserProgress } from '@/domain/user/UserProgress';
import type { TierId, WordId } from '@/domain/vocabulary/ids';
import type { DatabaseHandle } from '@/infrastructure/db/database';
import { mapUserProgressRow } from '@/infrastructure/db/mappers';
import {
  selectProgress,
  upsertProgress,
  countDueInTier,
} from '@/infrastructure/db/queries/progressQueries';

// SQLite implementation of the UserProgressRepository port. Mutable SRS hot
// state; every write carries scheduler_version. The append-only invariant is
// enforced on quiz_attempts, not here.
export class SQLiteUserProgressRepository implements UserProgressRepository {
  constructor(private readonly db: DatabaseHandle) {}

  async get(wordId: WordId): Promise<UserProgress | null> {
    const row = await selectProgress(this.db, wordId);
    return row === null ? null : mapUserProgressRow(row);
  }

  async upsert(progress: UserProgress): Promise<void> {
    await upsertProgress(this.db, {
      word_id: progress.wordId,
      mastery_level: progress.masteryLevel,
      next_review_date: progress.nextReviewDate,
      last_reviewed_at: progress.lastReviewedAt ?? null,
      consecutive_correct: progress.consecutiveCorrect,
      total_attempts: progress.totalAttempts,
      total_correct: progress.totalCorrect,
      first_seen_at: progress.firstSeenAt ?? null,
      scheduler_version: progress.schedulerVersion,
    });
  }

  async countDue(tierId: TierId, now: number): Promise<number> {
    const row = await countDueInTier(this.db, tierId, now);
    return row?.n ?? 0;
  }
}
