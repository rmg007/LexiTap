import type { SupabaseClient } from '@supabase/supabase-js';
import type { DatabaseHandle } from '@/infrastructure/db/database';
import type { AsyncStorageAdapter } from '@/infrastructure/storage/AsyncStorageAdapter';
import { SyncError } from '@/infrastructure/sync/errors';
import {
  selectProgress,
  upsertProgress,
  selectAllProgress,
  selectProgressReviewedSince,
} from '@/infrastructure/db/queries/progressQueries';
import {
  selectAllEntitlements,
  upsertEntitlement,
} from '@/infrastructure/db/queries/entitlementQueries';
import {
  progressSyncToRow,
  rowToProgressSync,
  entitlementSyncToRow,
  rowToEntitlementSync,
  remoteWinsByLastReviewed,
  type ProgressSyncRow,
  type EntitlementSyncRow,
} from '@/infrastructure/sync/syncMappers';

const PROGRESS_TABLE = 'user_progress_sync';
const ENTITLEMENT_TABLE = 'user_entitlements_sync';

// Supabase implementation of the application SyncService port. Implemented
// STRUCTURALLY (pull/push) rather than by importing @/application/* — the
// infrastructure layer is barred from importing the application layer
// (eslint.config.js), and the composition root assigns this to the
// SyncService-typed slot. Cloud is a mirror, never authority; conflicts resolve
// last-write-wins by last_reviewed_at (DATABASE_SCHEMA.md).
//
// Offline-tolerant: every Supabase call is guarded and re-thrown as SyncError
// so a network failure never crashes the app — the caller catches and proceeds
// offline.
export class SupabaseSyncService {
  constructor(
    private readonly client: SupabaseClient,
    private readonly db: DatabaseHandle,
    private readonly storage: AsyncStorageAdapter,
  ) {}

  // Pull cloud mirror state and merge into local user.db. Progress rows merge
  // last-write-wins by last_reviewed_at; entitlements are additive (a purchase
  // recorded on any device is honored everywhere).
  async pull(userId: string): Promise<void> {
    const remoteProgress = await this.fetchProgress(userId);
    for (const remote of remoteProgress) {
      const local = await selectProgress(this.db, remote.word_id);
      if (local === null || remoteWinsByLastReviewed(local.last_reviewed_at, remote.last_reviewed_at)) {
        await upsertProgress(this.db, progressSyncToRow(remote));
      }
    }

    const remoteEntitlements = await this.fetchEntitlements(userId);
    for (const remote of remoteEntitlements) {
      // Entitlements never expire downward via sync; upsert is safe and additive.
      await upsertEntitlement(this.db, entitlementSyncToRow(remote));
    }
  }

  // Push local changes since `sinceCursor` (epoch ms) to the cloud mirror, then
  // advance the stored cursor on success. A zero/absent cursor pushes the full
  // snapshot. Upserts are last-write-wins on the server via primary key.
  async push(userId: string, sinceCursor: number): Promise<void> {
    const progressRows =
      sinceCursor > 0
        ? await selectProgressReviewedSince(this.db, sinceCursor)
        : await selectAllProgress(this.db);

    if (progressRows.length > 0) {
      const payload: ProgressSyncRow[] = progressRows.map((r) => rowToProgressSync(userId, r));
      await this.upsertRows(PROGRESS_TABLE, payload);
    }

    // Entitlements are small; push the full set every time (idempotent upsert).
    const entitlementRows = await selectAllEntitlements(this.db);
    if (entitlementRows.length > 0) {
      const payload: EntitlementSyncRow[] = entitlementRows.map((r) =>
        rowToEntitlementSync(userId, r),
      );
      await this.upsertRows(ENTITLEMENT_TABLE, payload);
    }

    // Advance the cursor only after a fully successful push so a mid-push
    // failure re-pushes next time rather than dropping rows.
    await this.storage.setSyncCursor(Date.now());
  }

  private async fetchProgress(userId: string): Promise<ProgressSyncRow[]> {
    const { data, error } = await this.client
      .from(PROGRESS_TABLE)
      .select(
        'user_id, word_id, mastery_level, next_review_date, last_reviewed_at, consecutive_correct, total_attempts, total_correct, first_seen_at',
      )
      .eq('user_id', userId);
    if (error !== null) throw new SyncError(`pull ${PROGRESS_TABLE} failed`, error);
    return (data ?? []) as ProgressSyncRow[];
  }

  private async fetchEntitlements(userId: string): Promise<EntitlementSyncRow[]> {
    const { data, error } = await this.client
      .from(ENTITLEMENT_TABLE)
      .select('user_id, tier_id, purchased_at, expires_at, receipt_token')
      .eq('user_id', userId);
    if (error !== null) throw new SyncError(`pull ${ENTITLEMENT_TABLE} failed`, error);
    return (data ?? []) as EntitlementSyncRow[];
  }

  // Generic upsert over a mirror table. Typed at the call site (ProgressSyncRow
  // / EntitlementSyncRow); the Supabase row type is widened to a record array
  // here because the two payload shapes share no common branded type.
  private async upsertRows(table: string, rows: readonly unknown[]): Promise<void> {
    const { error } = await this.client.from(table).upsert(rows as Record<string, unknown>[]);
    if (error !== null) throw new SyncError(`push ${table} failed`, error);
  }
}
