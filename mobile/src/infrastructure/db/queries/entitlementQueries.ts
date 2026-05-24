import type { DatabaseHandle } from '@/infrastructure/db/database';
import type { EntitlementRow } from '@/infrastructure/db/rows';

// Named, parameterized queries for user_entitlements (purchased paid tiers).
// Free tiers are implicitly unlocked and never stored here.

export function selectAllEntitlements(db: DatabaseHandle): Promise<EntitlementRow[]> {
  return db.all<EntitlementRow>(
    `SELECT tier_id, purchased_at, expires_at, receipt_token
     FROM user_entitlements
     ORDER BY purchased_at ASC`,
    [],
  );
}

export function upsertEntitlement(
  db: DatabaseHandle,
  row: EntitlementRow,
): Promise<{ lastInsertRowId: number; changes: number }> {
  return db.run(
    `INSERT INTO user_entitlements (tier_id, purchased_at, expires_at, receipt_token)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(tier_id) DO UPDATE SET
       purchased_at  = excluded.purchased_at,
       expires_at    = excluded.expires_at,
       receipt_token = excluded.receipt_token`,
    [row.tier_id, row.purchased_at, row.expires_at, row.receipt_token],
  );
}
