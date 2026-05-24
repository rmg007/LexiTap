import {
  progressSyncToRow,
  rowToProgressSync,
  entitlementSyncToRow,
  rowToEntitlementSync,
  remoteWinsByLastReviewed,
  type ProgressSyncRow,
} from '@/infrastructure/sync/syncMappers';
import type { UserProgressRow, EntitlementRow } from '@/infrastructure/db/rows';

describe('progress sync mapping round-trip', () => {
  const remote: ProgressSyncRow = {
    user_id: 'u1',
    word_id: 'w1',
    mastery_level: 3,
    next_review_date: 5000,
    last_reviewed_at: 4000,
    consecutive_correct: 2,
    total_attempts: 5,
    total_correct: 4,
    first_seen_at: 100,
  };

  it('maps a remote row to a local row defaulting scheduler_version', () => {
    const row = progressSyncToRow(remote);
    expect(row.word_id).toBe('w1');
    expect(row.scheduler_version).toBe('v1-fixed');
    expect(row.next_review_date).toBe(5000);
  });

  it('maps a local row back to a remote row with the user id', () => {
    const local: UserProgressRow = progressSyncToRow(remote);
    const back = rowToProgressSync('u1', local);
    expect(back).toEqual(remote);
  });
});

describe('entitlement sync mapping', () => {
  it('round-trips a local entitlement row through the user-scoped remote shape', () => {
    const local: EntitlementRow = {
      tier_id: 'toefl',
      purchased_at: 999,
      expires_at: null,
      receipt_token: 'tok',
    };
    const remote = rowToEntitlementSync('u1', local);
    expect(remote.user_id).toBe('u1');
    expect(entitlementSyncToRow(remote)).toEqual(local);
  });
});

describe('remoteWinsByLastReviewed (last-write-wins)', () => {
  it('remote wins with a strictly newer timestamp', () => {
    expect(remoteWinsByLastReviewed(100, 200)).toBe(true);
  });

  it('local wins on a tie (no needless overwrite)', () => {
    expect(remoteWinsByLastReviewed(200, 200)).toBe(false);
  });

  it('local wins when remote is older', () => {
    expect(remoteWinsByLastReviewed(300, 200)).toBe(false);
  });

  it('a never-reviewed remote (null) never clobbers local', () => {
    expect(remoteWinsByLastReviewed(100, null)).toBe(false);
    expect(remoteWinsByLastReviewed(null, null)).toBe(false);
  });

  it('remote wins over a never-reviewed local', () => {
    expect(remoteWinsByLastReviewed(null, 50)).toBe(true);
  });
});
