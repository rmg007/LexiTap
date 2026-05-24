import type { DatabaseHandle } from '@/infrastructure/db/database';

// event_log is APPEND-ONLY (DATABASE_SCHEMA.md). INSERT-only by design: written
// synchronously in the same local transaction as the state change it
// accompanies (no background worker, no queue). No UPDATE/DELETE exposed.

export function insertEvent(
  db: DatabaseHandle,
  params: { eventType: string; payload: string | null; occurredAt: number },
): Promise<{ lastInsertRowId: number; changes: number }> {
  return db.run(
    `INSERT INTO event_log (event_type, payload, occurred_at) VALUES (?, ?, ?)`,
    [params.eventType, params.payload, params.occurredAt],
  );
}
