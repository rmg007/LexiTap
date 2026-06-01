import { PerformBackupUseCase } from './PerformBackupUseCase';
import type { BackupPort, BackupResult } from '@/domain/backup/BackupPort';
import type { AuthPort, AuthSession } from '@/domain/auth/AuthPort';
import type { AnalyticsPort } from '@/domain/analytics/AnalyticsPort';
import { MIN_BACKUP_INTERVAL_MS } from '@/domain/backup/ScheduleBackupUseCase';

const NOW = 1_700_000_000_000;

const SESSION: AuthSession = {
  user: { id: 'user-123', email: 'test@example.com' },
  accessToken: 'tok',
  expiresAt: NOW + 3_600_000,
};

function makeAuth(session: AuthSession | null = SESSION): jest.Mocked<Pick<AuthPort, 'getSession'>> {
  return { getSession: jest.fn().mockResolvedValue(session) };
}

function makeBackup(result: BackupResult = { ok: true }): jest.Mocked<Pick<BackupPort, 'backupNow'>> {
  return { backupNow: jest.fn().mockResolvedValue(result) };
}

function makeAnalytics(): jest.Mocked<AnalyticsPort> {
  return { track: jest.fn() };
}

function makeUseCase(
  opts: {
    auth?: ReturnType<typeof makeAuth>;
    backup?: ReturnType<typeof makeBackup>;
    analytics?: jest.Mocked<AnalyticsPort>;
    lastBackupAtMs?: number | null;
  } = {},
) {
  const auth = opts.auth ?? makeAuth();
  const backup = opts.backup ?? makeBackup();
  const analytics = opts.analytics ?? makeAnalytics();
  const lastBackupAtMs = opts.lastBackupAtMs ?? null;
  const getLastBackupAtMs = jest.fn().mockResolvedValue(lastBackupAtMs);
  const setLastBackupAtMs = jest.fn().mockResolvedValue(undefined);

  const useCase = new PerformBackupUseCase(
    backup as unknown as BackupPort,
    auth as unknown as AuthPort,
    getLastBackupAtMs,
    setLastBackupAtMs,
    analytics,
  );

  return { useCase, auth, backup, analytics, getLastBackupAtMs, setLastBackupAtMs };
}

describe('PerformBackupUseCase.triggerIfNeeded', () => {
  it('backs up and persists timestamp when no prior backup (null)', async () => {
    const { useCase, backup, setLastBackupAtMs, analytics } = makeUseCase({ lastBackupAtMs: null });

    await useCase.triggerIfNeeded(NOW);

    expect(backup.backupNow).toHaveBeenCalledWith('user-123');
    expect(setLastBackupAtMs).toHaveBeenCalledWith(NOW);
    expect(analytics.track).toHaveBeenCalledWith('backup_completed', { success: true });
  });

  it('skips when last backup was under 6h ago', async () => {
    const recentMs = NOW - MIN_BACKUP_INTERVAL_MS + 60_000; // 1 min under threshold
    const { useCase, backup, setLastBackupAtMs } = makeUseCase({ lastBackupAtMs: recentMs });

    await useCase.triggerIfNeeded(NOW);

    expect(backup.backupNow).not.toHaveBeenCalled();
    expect(setLastBackupAtMs).not.toHaveBeenCalled();
  });

  it('backs up when last backup was over 6h ago', async () => {
    const oldMs = NOW - MIN_BACKUP_INTERVAL_MS - 1;
    const { useCase, backup, setLastBackupAtMs } = makeUseCase({ lastBackupAtMs: oldMs });

    await useCase.triggerIfNeeded(NOW);

    expect(backup.backupNow).toHaveBeenCalledWith('user-123');
    expect(setLastBackupAtMs).toHaveBeenCalledWith(NOW);
  });

  it('skips when the user is not signed in', async () => {
    const { useCase, backup, setLastBackupAtMs } = makeUseCase({
      auth: makeAuth(null),
    });

    await useCase.triggerIfNeeded(NOW);

    expect(backup.backupNow).not.toHaveBeenCalled();
    expect(setLastBackupAtMs).not.toHaveBeenCalled();
  });

  it('fires backup_failed analytics and does NOT update timestamp on a failed backup', async () => {
    const { useCase, setLastBackupAtMs, analytics } = makeUseCase({
      backup: makeBackup({ ok: false, reason: 'offline' }),
    });

    await useCase.triggerIfNeeded(NOW);

    expect(setLastBackupAtMs).not.toHaveBeenCalled();
    expect(analytics.track).toHaveBeenCalledWith('backup_failed', { reason: 'offline' });
  });

  it('never throws when backupNow rejects', async () => {
    const backup = { backupNow: jest.fn().mockRejectedValue(new Error('kaboom')) };
    const { useCase } = makeUseCase({ backup: backup as unknown as ReturnType<typeof makeBackup> });

    await expect(useCase.triggerIfNeeded(NOW)).resolves.toBeUndefined();
  });

  it('never throws when getSession rejects', async () => {
    const auth = { getSession: jest.fn().mockRejectedValue(new Error('auth down')) };
    const { useCase } = makeUseCase({ auth: auth as unknown as ReturnType<typeof makeAuth> });

    await expect(useCase.triggerIfNeeded(NOW)).resolves.toBeUndefined();
  });

  it('does not_configured backup still fires backup_failed analytics', async () => {
    const { useCase, analytics, setLastBackupAtMs } = makeUseCase({
      backup: makeBackup({ ok: false, reason: 'not_configured' }),
    });

    await useCase.triggerIfNeeded(NOW);

    expect(setLastBackupAtMs).not.toHaveBeenCalled();
    expect(analytics.track).toHaveBeenCalledWith('backup_failed', { reason: 'not_configured' });
  });
});
