import type { DatabaseHandle } from '@/infrastructure/db/database';
import type { ActiveSessionRow } from '@/infrastructure/db/rows';

// Named, parameterized queries for active_session (SESSION_RESUME_PLAN Part B).
// Single-row table (id = 1), like user_stats. Holds the in-flight learn session
// snapshot so Home can offer "Resume (n/10)" and the flow rehydrates exactly.
// Parameterized only — no interpolation.

const ACTIVE_SESSION_ID = 1;

export function selectActiveSession(db: DatabaseHandle): Promise<ActiveSessionRow | null> {
  return db.first<ActiveSessionRow>(
    `SELECT id, kind, tier_id, payload, updated_at FROM active_session WHERE id = ?`,
    [ACTIVE_SESSION_ID],
  );
}

export function upsertActiveSession(
  db: DatabaseHandle,
  params: { kind: string; tierId: string; payload: string; updatedAt: number },
): Promise<{ lastInsertRowId: number; changes: number }> {
  return db.run(
    `INSERT INTO active_session (id, kind, tier_id, payload, updated_at)
       VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       kind       = excluded.kind,
       tier_id    = excluded.tier_id,
       payload    = excluded.payload,
       updated_at = excluded.updated_at`,
    [ACTIVE_SESSION_ID, params.kind, params.tierId, params.payload, params.updatedAt],
  );
}

export function deleteActiveSession(
  db: DatabaseHandle,
): Promise<{ lastInsertRowId: number; changes: number }> {
  return db.run(`DELETE FROM active_session WHERE id = ?`, [ACTIVE_SESSION_ID]);
}
