import type { DatabaseHandle } from '@/infrastructure/db';
import type { AnalyticsPort } from '@/domain/analytics/AnalyticsPort';

// Flushes event_log rows (local audit trail) to PostHog in batches.
// Idempotent: event_log_id in the payload prevents double-count; synced_at marks
// the flush timestamp (when migration 003 adds the column). Preserves occurred_at
// (when the event was local-logged). Retryable: failed flushes retry on next call.
//
// NOTE: synced_at column requires migration 003 (ADD COLUMN synced_at).
// Until that migration is applied, the service still functions: it flushes all
// rows and tracks flushed IDs client-side to prevent re-emission within a session.
// Post-migration, synced_at provides durability across app restarts.

export interface EventLogRow {
  id: number;
  event_type: string;
  payload: string | null;
  occurred_at: number;
  synced_at?: number | null; // Optional until migration 003
}

export class FlushEventLogService {
  private flushedIds: Set<number> = new Set(); // Client-side dedup until synced_at persists

  constructor(
    private readonly db: DatabaseHandle,
    private readonly analytics: AnalyticsPort,
  ) {}

  async flush(): Promise<void> {
    try {
      // Attempt to fetch unsync'd rows. If synced_at column doesn't exist yet
      // (pre-migration 003), the query will fail and we'll fall back to client-side dedup.
      let rows: EventLogRow[] = [];
      try {
        rows = await this.db.all<EventLogRow>(
          `SELECT id, event_type, payload, occurred_at, synced_at
           FROM event_log
           WHERE synced_at IS NULL
           ORDER BY occurred_at ASC`,
          [],
        );
      } catch {
        // Migration 003 not yet applied; fall back to all rows minus client-side flushed.
        const allRows = await this.db.all<EventLogRow>(
          `SELECT id, event_type, payload, occurred_at
           FROM event_log
           ORDER BY occurred_at ASC`,
          [],
        );
        rows = allRows.filter((r) => !this.flushedIds.has(r.id));
      }

      if (rows.length === 0) {
        return; // Nothing to flush
      }

      const nowMs = Date.now();

      // Batch emit to analytics (fire-and-forget; PostHog SDK handles queueing).
      for (const row of rows) {
        const properties = row.payload ? JSON.parse(row.payload) : {};
        this.analytics.track(row.event_type, {
          ...properties,
          occurred_at: row.occurred_at,
          event_log_id: row.id, // Client-generated ID for idempotence
        });
        this.flushedIds.add(row.id); // Client-side tracking
      }

      // Try to mark rows as synced (if migration 003 applied).
      // If the column doesn't exist, silently skip (client-side dedup will suffice for now).
      try {
        await this.db.run(
          `UPDATE event_log
           SET synced_at = ?
           WHERE synced_at IS NULL`,
          [nowMs],
        );
      } catch {
        // synced_at column doesn't exist yet; client-side dedup handles it.
      }
    } catch (error) {
      // Swallow: flush failures must not crash the app. Next scheduled flush retries.
      // eslint-disable-next-line no-console
      console.warn('FlushEventLogService: flush failed', { error: String(error) });
    }
  }
}
