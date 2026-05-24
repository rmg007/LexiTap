import type { UserProgressRow, EntitlementRow } from '@/infrastructure/db/rows';

// Pure mappers between Supabase mirror-table rows and the local user.db row
// shapes. Cloud is a mirror, never authority (DATABASE_SCHEMA.md). Mirror
// columns are snake_case Postgres; epoch timestamps are BIGINT (number).
// Kept pure so they are unit-testable without a network connection.

// Supabase user_progress_sync row.
export interface ProgressSyncRow {
  user_id: string;
  word_id: string;
  mastery_level: number;
  next_review_date: number;
  last_reviewed_at: number | null;
  consecutive_correct: number | null;
  total_attempts: number | null;
  total_correct: number | null;
  first_seen_at: number | null;
}

// Supabase user_entitlements_sync row.
export interface EntitlementSyncRow {
  user_id: string;
  tier_id: string;
  purchased_at: number;
  expires_at: number | null;
  receipt_token: string | null;
}

export function progressSyncToRow(remote: ProgressSyncRow): UserProgressRow {
  return {
    word_id: remote.word_id,
    mastery_level: remote.mastery_level,
    next_review_date: remote.next_review_date,
    last_reviewed_at: remote.last_reviewed_at,
    consecutive_correct: remote.consecutive_correct,
    total_attempts: remote.total_attempts,
    total_correct: remote.total_correct,
    first_seen_at: remote.first_seen_at,
    // The cloud mirror does not carry scheduler_version; locally re-anchored
    // history keeps v1-fixed, so a pulled row defaults to v1-fixed.
    scheduler_version: 'v1-fixed',
  };
}

export function rowToProgressSync(userId: string, row: UserProgressRow): ProgressSyncRow {
  return {
    user_id: userId,
    word_id: row.word_id,
    mastery_level: row.mastery_level,
    next_review_date: row.next_review_date,
    last_reviewed_at: row.last_reviewed_at,
    consecutive_correct: row.consecutive_correct,
    total_attempts: row.total_attempts,
    total_correct: row.total_correct,
    first_seen_at: row.first_seen_at,
  };
}

export function entitlementSyncToRow(remote: EntitlementSyncRow): EntitlementRow {
  return {
    tier_id: remote.tier_id,
    purchased_at: remote.purchased_at,
    expires_at: remote.expires_at,
    receipt_token: remote.receipt_token,
  };
}

export function rowToEntitlementSync(userId: string, row: EntitlementRow): EntitlementSyncRow {
  return {
    user_id: userId,
    tier_id: row.tier_id,
    purchased_at: row.purchased_at,
    expires_at: row.expires_at,
    receipt_token: row.receipt_token,
  };
}

// Last-write-wins resolution by last_reviewed_at (DATABASE_SCHEMA.md). Returns
// true when the remote row should overwrite the local one. A null timestamp is
// treated as oldest (loses) so a never-reviewed remote row cannot clobber local
// progress. Pure — the core conflict rule, unit-tested directly.
export function remoteWinsByLastReviewed(
  localLastReviewedAt: number | null,
  remoteLastReviewedAt: number | null,
): boolean {
  const local = localLastReviewedAt ?? Number.NEGATIVE_INFINITY;
  const remote = remoteLastReviewedAt ?? Number.NEGATIVE_INFINITY;
  return remote > local;
}
