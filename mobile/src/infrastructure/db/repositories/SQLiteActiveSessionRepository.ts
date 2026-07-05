import type { ActiveSession, ActiveSessionRepository } from '@/domain/user/ActiveSession';
import type { DatabaseHandle } from '@/infrastructure/db/database';
import { mapActiveSessionRow } from '@/infrastructure/db/mappers';
import {
  selectActiveSession,
  upsertActiveSession,
  deleteActiveSession,
} from '@/infrastructure/db/queries/activeSessionQueries';

// SQLite implementation of ActiveSessionRepository. Single-row (id = 1) snapshot
// of the in-flight learn session. The batch + stage + index are serialized into
// the `payload` JSON column; the mapper parses it defensively (corrupt → null).
export class SQLiteActiveSessionRepository implements ActiveSessionRepository {
  constructor(private readonly db: DatabaseHandle) {}

  async get(): Promise<ActiveSession | null> {
    const row = await selectActiveSession(this.db);
    return row === null ? null : mapActiveSessionRow(row);
  }

  async save(session: ActiveSession): Promise<void> {
    await upsertActiveSession(this.db, {
      kind: session.kind,
      tierId: session.tierId,
      payload: JSON.stringify({
        batch: session.batch,
        stage: session.stage,
        index: session.index,
      }),
      updatedAt: Date.now(),
    });
  }

  async clear(): Promise<void> {
    await deleteActiveSession(this.db);
  }
}
