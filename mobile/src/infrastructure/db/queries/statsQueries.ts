import type { DatabaseHandle } from '@/infrastructure/db/database';
import type { UserStatsRow } from '@/infrastructure/db/rows';

// Named, parameterized queries for user_stats (single-row local mirror, id = 1).
// Holds durable streak/freeze state for the forgiveness machine plus session/
// mastery totals. last_activity_local_date is YYYYMMDD in the user's IANA tz.

const STATS_ID = 1;

const STATS_COLUMNS = `
  id, current_streak, longest_streak, last_activity_local_date, total_sessions,
  total_words_mastered, freeze_count, freezes_granted_total,
  last_catchup_anchor_date, last_activity_date
`;

export function selectStats(db: DatabaseHandle): Promise<UserStatsRow | null> {
  return db.first<UserStatsRow>(
    `SELECT ${STATS_COLUMNS} FROM user_stats WHERE id = ?`,
    [STATS_ID],
  );
}

export function upsertStats(
  db: DatabaseHandle,
  params: {
    currentStreak: number;
    longestStreak: number;
    lastActivityLocalDate: number | null;
    totalSessions: number;
    totalWordsMastered: number;
    freezeCount: number;
    freezesGrantedTotal: number;
  },
): Promise<{ lastInsertRowId: number; changes: number }> {
  // last_catchup_anchor_date and last_activity_date (deprecated epoch mirror)
  // are owned by other write paths (re-anchor / sync) and are left untouched on
  // an UPDATE so this write never clobbers them.
  return db.run(
    `INSERT INTO user_stats (
       id, current_streak, longest_streak, last_activity_local_date,
       total_sessions, total_words_mastered, freeze_count, freezes_granted_total
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       current_streak           = excluded.current_streak,
       longest_streak           = excluded.longest_streak,
       last_activity_local_date = excluded.last_activity_local_date,
       total_sessions           = excluded.total_sessions,
       total_words_mastered     = excluded.total_words_mastered,
       freeze_count             = excluded.freeze_count,
       freezes_granted_total    = excluded.freezes_granted_total`,
    [
      STATS_ID,
      params.currentStreak,
      params.longestStreak,
      params.lastActivityLocalDate,
      params.totalSessions,
      params.totalWordsMastered,
      params.freezeCount,
      params.freezesGrantedTotal,
    ],
  );
}
