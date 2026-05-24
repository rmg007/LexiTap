import type { UserStatsRepository, UserStats } from '@/domain/user/UserStats';
import type { DatabaseHandle } from '@/infrastructure/db/database';
import { mapUserStatsRow } from '@/infrastructure/db/mappers';
import { selectStats, upsertStats } from '@/infrastructure/db/queries/statsQueries';

// SQLite implementation of the UserStatsRepository port. Composes the durable
// streak/freeze StreakState with session/mastery totals into the domain
// UserStats. Single-row table (id = 1).
export class SQLiteUserStatsRepository implements UserStatsRepository {
  constructor(private readonly db: DatabaseHandle) {}

  async get(): Promise<UserStats | null> {
    const row = await selectStats(this.db);
    return row === null ? null : mapUserStatsRow(row);
  }

  async save(stats: UserStats): Promise<void> {
    await upsertStats(this.db, {
      currentStreak: stats.streak.currentStreak,
      longestStreak: stats.streak.longestStreak,
      lastActivityLocalDate: stats.streak.lastActivityLocalDate,
      totalSessions: stats.totalSessions,
      totalWordsMastered: stats.totalWordsMastered,
      freezeCount: stats.streak.freezeCount,
      freezesGrantedTotal: stats.streak.freezesGrantedTotal,
    });
  }
}
