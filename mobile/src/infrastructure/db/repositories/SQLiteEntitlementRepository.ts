import type { EntitlementRepository, Entitlement } from '@/domain/user/Entitlement';
import type { DatabaseHandle } from '@/infrastructure/db/database';
import { mapEntitlementRow } from '@/infrastructure/db/mappers';
import {
  selectAllEntitlements,
  upsertEntitlement,
} from '@/infrastructure/db/queries/entitlementQueries';

// SQLite implementation of the EntitlementRepository port. Stores purchased
// paid tiers only; Premium Pass / free-tier access decisions are application
// layer, not encoded here.
export class SQLiteEntitlementRepository implements EntitlementRepository {
  constructor(private readonly db: DatabaseHandle) {}

  async getAll(): Promise<Entitlement[]> {
    const rows = await selectAllEntitlements(this.db);
    return rows.map(mapEntitlementRow);
  }

  async upsert(e: Entitlement): Promise<void> {
    await upsertEntitlement(this.db, {
      tier_id: e.tierId,
      purchased_at: e.purchasedAt,
      expires_at: e.expiresAt,
      receipt_token: e.receiptToken ?? null,
    });
  }
}
