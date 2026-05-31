import type { DatabaseHandle } from '@/infrastructure/db/database';
import { startOfLocalDay } from '@/domain/time/civilDate';
import { FORGIVENESS } from '@/domain/srs/forgiveness';

/**
 * Daily progress metrics: reviews completed today, effective cap, new words
 * learned, and new-word budget. All timestamps are in user's local timezone.
 */
export interface DailyProgressMetrics {
  reviewsCompletedToday: number;
  effectiveDailyCap: number;
  newWordsCompletedToday: number;
  newWordsBudget: number;
}

/**
 * Build daily progress queries bound to a database handle. Returns an async
 * method that fetches real daily activity from quiz_attempts for a given tier,
 * timezone, and current time. Offline-safe: any DB error is caught and returns
 * a zero-state.
 */
export function buildDailyProgressQueries(db: DatabaseHandle) {
  return {
    getDailyProgress: async (
      tierId: string,
      nowMs: number,
      userTz: string,
    ): Promise<DailyProgressMetrics> => {
      try {
        const startOfToday = startOfLocalDay(nowMs, userTz);

        // Count total correct answers for this tier since today's start.
        const totalResult = await db.first<{ count: number }>(
          `SELECT COUNT(*) as count
           FROM quiz_attempts qa
           JOIN contentdb.words w ON qa.word_id = w.id
           JOIN contentdb.word_tiers wt ON wt.word_id = w.id
           WHERE wt.tier_id = ? AND qa.is_correct = 1 AND qa.answered_at >= ?`,
          [tierId, startOfToday],
        );
        const reviewsCompletedToday = totalResult?.count ?? 0;

        // Count unique words marked as first-seen today (mastery_level = 0 and
        // first_seen_at >= today's start). The distinction: a word becomes
        // "new" on first quiz attempt → first_seen_at is set by AnswerQuestion.
        const newWordsResult = await db.first<{ count: number }>(
          `SELECT COUNT(DISTINCT qa.word_id) as count
           FROM quiz_attempts qa
           JOIN contentdb.words w ON qa.word_id = w.id
           JOIN contentdb.word_tiers wt ON wt.word_id = w.id
           WHERE wt.tier_id = ? AND qa.answered_at >= ? AND qa.is_correct = 1
             AND EXISTS (
               SELECT 1 FROM user_progress up
               WHERE up.word_id = qa.word_id AND up.first_seen_at >= ?
             )`,
          [tierId, startOfToday, startOfToday],
        );
        const newWordsCompletedToday = newWordsResult?.count ?? 0;

        // Count due words to compute effective cap using forgiveness logic.
        const dueResult = await db.first<{ n: number }>(
          `SELECT COUNT(*) AS n
           FROM user_progress p
           JOIN contentdb.words w ON w.id = p.word_id
           JOIN contentdb.word_tiers wt ON wt.word_id = w.id
           WHERE wt.tier_id = ? AND w.deleted_at IS NULL AND p.next_review_date <= ?`,
          [tierId, nowMs],
        );
        const dueCount = dueResult?.n ?? 0;

        // Compute effective cap using forgiveness logic.
        const effectiveDailyCap =
          dueCount > FORGIVENESS.BASE_DAILY_CAP
            ? Math.min(
                FORGIVENESS.BASE_DAILY_CAP + FORGIVENESS.CATCH_UP_BUDGET,
                FORGIVENESS.HARD_SESSION_CEILING,
              )
            : FORGIVENESS.BASE_DAILY_CAP;

        // New-word budget: cap - reviews already done.
        const newWordsBudget = Math.max(
          0,
          Math.min(FORGIVENESS.NEW_WORDS_PER_DAY, effectiveDailyCap - reviewsCompletedToday),
        );

        return {
          reviewsCompletedToday,
          effectiveDailyCap,
          newWordsCompletedToday,
          newWordsBudget,
        };
      } catch {
        // Offline-first: never crash; return zero-state on any DB error.
        return {
          reviewsCompletedToday: 0,
          effectiveDailyCap: FORGIVENESS.BASE_DAILY_CAP,
          newWordsCompletedToday: 0,
          newWordsBudget: FORGIVENESS.NEW_WORDS_PER_DAY,
        };
      }
    },
  };
}
