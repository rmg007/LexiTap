import type { BackupPort } from '@/domain/backup/BackupPort';
import type { AuthPort } from '@/domain/auth/AuthPort';
import type { AnalyticsPort } from '@/domain/analytics/AnalyticsPort';
import { shouldBackup } from '@/domain/backup/ScheduleBackupUseCase';

// Orchestrates the periodic backup decision: check the 6h throttle, upload if
// due, persist the new timestamp on success, fire analytics. Best-effort —
// never throws; a network blip or an unauthenticated user resolves silently.
export class PerformBackupUseCase {
  constructor(
    private readonly backup: BackupPort,
    private readonly auth: AuthPort,
    private readonly getLastBackupAtMs: () => Promise<number | null>,
    private readonly setLastBackupAtMs: (ms: number) => Promise<void>,
    private readonly analytics: AnalyticsPort,
  ) {}

  // Call on app foreground + after quiz completion. `nowMs` is injected so the
  // timing decision is deterministic (never reads Date.now() internally).
  async triggerIfNeeded(nowMs: number): Promise<void> {
    try {
      const session = await this.auth.getSession();
      if (!session) return; // Not signed in; nothing to back up to.

      const lastMs = await this.getLastBackupAtMs();
      if (!shouldBackup(lastMs, nowMs)) return;

      const result = await this.backup.backupNow(session.user.id);
      if (result.ok) {
        await this.setLastBackupAtMs(nowMs);
        void this.analytics.track('backup_completed', { success: true });
      } else {
        void this.analytics.track('backup_failed', { reason: result.reason });
      }
    } catch {
      // Backup is best-effort and must never crash the app.
    }
  }
}
