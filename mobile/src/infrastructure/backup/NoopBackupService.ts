import type { BackupPort, BackupResult } from '@/domain/backup/BackupPort';

// Production default when Supabase env vars are absent (dev, tests, builds
// without backend config). Every call resolves to not_configured — never throws,
// never touches the filesystem or network. Zero overhead.
export class NoopBackupService implements BackupPort {
  async backupNow(_userId: string): Promise<BackupResult> {
    return { ok: false, reason: 'not_configured' };
  }

  async restore(_userId: string): Promise<BackupResult> {
    return { ok: false, reason: 'not_configured' };
  }

  async hasRemoteBackup(_userId: string): Promise<boolean> {
    return false;
  }
}
