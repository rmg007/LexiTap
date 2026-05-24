import { DAY_MS } from '@/domain/srs/v1-fixed';
import { startOfLocalDay, civilDayDiff } from '@/domain/time/civilDate';

// Forgiveness layer for the locked v1-fixed scheduler. Implements the
// "Implementation Interface" of SRS_FORGIVENESS_MECHANICS.md exactly. All
// functions are pure: time enters as `nowMs`, timezone as `tz`. Nothing here
// mutates mastery; only reanchorBacklog produces next_review_date writes, and
// those only pull dates inward.

export const FORGIVENESS = {
  BASE_DAILY_CAP: 40,
  NEW_WORDS_PER_DAY: 10,
  HARD_SESSION_CEILING: 200,
  CATCH_UP_BUDGET: 20,
  CATCH_UP_DRAIN_DAYS: 5,
  LAPSE_THRESHOLD_DAYS: 2,
  CONFIG_VERSION: 'fp-v1',
} as const;

/** A due word as seen by the selector (subset of user_progress + word). */
export interface DueWord {
  readonly wordId: string;
  readonly masteryLevel: number; // 0-5
  readonly nextReviewDate: number; // epoch ms
}

/**
 * Effective cap for today. Catch-up engages when more words are due than a
 * flat day can clear, raising the cap by the catch-up budget but never past
 * the hard session ceiling.
 */
export function effectiveDailyCap(dueCount: number): number {
  if (dueCount > FORGIVENESS.BASE_DAILY_CAP) {
    return Math.min(
      FORGIVENESS.BASE_DAILY_CAP + FORGIVENESS.CATCH_UP_BUDGET,
      FORGIVENESS.HARD_SESSION_CEILING,
    );
  }
  return FORGIVENESS.BASE_DAILY_CAP;
}

// Deterministic selection sort: most-overdue first, then most-fragile
// (lowest mastery), then stable tiebreaks. Shared by the cap and re-anchor.
function compareForSelection(a: DueWord, b: DueWord, startOfToday: number): number {
  const aOverdue = Math.floor((startOfToday - a.nextReviewDate) / DAY_MS);
  const bOverdue = Math.floor((startOfToday - b.nextReviewDate) / DAY_MS);
  if (aOverdue !== bOverdue) return bOverdue - aOverdue; // daysOverdue DESC
  if (a.masteryLevel !== b.masteryLevel) return a.masteryLevel - b.masteryLevel; // mastery ASC
  if (a.nextReviewDate !== b.nextReviewDate) return a.nextReviewDate - b.nextReviewDate; // date ASC
  return a.wordId < b.wordId ? -1 : a.wordId > b.wordId ? 1 : 0; // word_id ASC
}

/**
 * Deterministic queue selection within the cap. Pure; mutates nothing. Words
 * beyond the cap are simply not surfaced — their next_review_date is untouched
 * so they remain due tomorrow.
 */
export function selectReviewQueue(
  due: readonly DueWord[],
  nowMs: number,
  tz: string,
  cap: number,
): DueWord[] {
  const startOfToday = startOfLocalDay(nowMs, tz);
  const sorted = [...due].sort((a, b) => compareForSelection(a, b, startOfToday));
  return sorted.slice(0, Math.max(0, cap));
}

/** One next_review_date write descriptor (applied by infra in one txn). */
export interface ReanchorWrite {
  readonly wordId: string;
  readonly nextReviewDate: number; // epoch ms, startOfLocalDay-aligned
}

export interface ReanchorResult {
  readonly writes: readonly ReanchorWrite[];
  readonly event: {
    type: 'srs_backlog_reanchored';
    count: number;
    lapseDays: number;
    drainDays: number;
  } | null;
}

/** Calendar-day gap since last activity. 0 if never active before. */
export function lapseGapDays(
  lastActivityLocalDate: number | null,
  todayLocalDate: number,
): number {
  if (lastActivityLocalDate === null) return 0;
  return civilDayDiff(todayLocalDate, lastActivityLocalDate);
}

/**
 * True if the gap since last activity qualifies as a lapse needing re-anchor:
 * a gap strictly greater than LAPSE_THRESHOLD_DAYS (i.e. >= 3 missed days).
 * A 1-2 day gap is handled by the cap alone.
 */
export function isLapse(lastActivityLocalDate: number | null, todayLocalDate: number): boolean {
  return lapseGapDays(lastActivityLocalDate, todayLocalDate) > FORGIVENESS.LAPSE_THRESHOLD_DAYS;
}

/**
 * Compute the one-time backlog re-anchor. Returns no writes if not in a lapse,
 * or if already anchored today (caller passes lastCatchupAnchorDate, a
 * YYYYMMDD, to guard once-per-lapse idempotency). The re-anchor spreads the
 * overdue pile across CATCH_UP_DRAIN_DAYS buckets, oldest/most-fragile into the
 * earliest buckets, and never pushes a word later than it was already due.
 */
export function reanchorBacklog(
  overdue: readonly DueWord[],
  nowMs: number,
  tz: string,
  lapseDays: number,
  lastCatchupAnchorDate: number | null,
  todayLocalDate: number,
): ReanchorResult {
  const empty: ReanchorResult = { writes: [], event: null };

  if (lapseDays <= FORGIVENESS.LAPSE_THRESHOLD_DAYS) return empty;
  // Idempotent per lapse: if we already anchored today, skip.
  if (lastCatchupAnchorDate !== null && lastCatchupAnchorDate === todayLocalDate) return empty;
  if (overdue.length === 0) return empty;

  const startOfToday = startOfLocalDay(nowMs, tz);
  const perDay = FORGIVENESS.BASE_DAILY_CAP + FORGIVENESS.CATCH_UP_BUDGET;
  const sorted = [...overdue].sort((a, b) => compareForSelection(a, b, startOfToday));

  const writes: ReanchorWrite[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const w = sorted[i];
    if (w === undefined) continue; // noUncheckedIndexedAccess
    const bucket = Math.min(Math.floor(i / perDay), FORGIVENESS.CATCH_UP_DRAIN_DAYS - 1);
    const bucketDate = startOfToday + bucket * DAY_MS;
    // Overdue words (past due) are the backlog we spread into buckets. A word
    // already scheduled for the future must never be delayed past its existing
    // date — for those we keep the smaller (inward) of bucket vs existing.
    const newDate =
      w.nextReviewDate >= startOfToday ? Math.min(bucketDate, w.nextReviewDate) : bucketDate;
    if (newDate !== w.nextReviewDate) {
      writes.push({ wordId: w.wordId, nextReviewDate: newDate });
    }
  }

  if (writes.length === 0) return empty;

  return {
    writes,
    event: {
      type: 'srs_backlog_reanchored',
      count: writes.length,
      lapseDays,
      drainDays: FORGIVENESS.CATCH_UP_DRAIN_DAYS,
    },
  };
}
