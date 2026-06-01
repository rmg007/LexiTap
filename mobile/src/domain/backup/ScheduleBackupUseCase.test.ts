import { shouldBackup, MIN_BACKUP_INTERVAL_MS } from './ScheduleBackupUseCase';

describe('shouldBackup', () => {
  const NOW = 1_700_000_000_000; // arbitrary fixed epoch ms

  it('backs up when the user has never been backed up (null)', () => {
    expect(shouldBackup(null, NOW)).toBe(true);
  });

  it('backs up when the user has never been backed up (undefined)', () => {
    expect(shouldBackup(undefined, NOW)).toBe(true);
  });

  it('skips when the last backup was under the 6h interval ago', () => {
    const oneHourAgo = NOW - 60 * 60 * 1000;
    expect(shouldBackup(oneHourAgo, NOW)).toBe(false);
  });

  it('skips at exactly one ms under the threshold', () => {
    const justUnder = NOW - (MIN_BACKUP_INTERVAL_MS - 1);
    expect(shouldBackup(justUnder, NOW)).toBe(false);
  });

  it('backs up at exactly the threshold (>= is inclusive)', () => {
    const exactly = NOW - MIN_BACKUP_INTERVAL_MS;
    expect(shouldBackup(exactly, NOW)).toBe(true);
  });

  it('backs up when the last backup is well over the threshold', () => {
    const oneDayAgo = NOW - 24 * 60 * 60 * 1000;
    expect(shouldBackup(oneDayAgo, NOW)).toBe(true);
  });

  it('treats a future lastBackupAt (clock skew) as not yet due', () => {
    const inTheFuture = NOW + 60 * 60 * 1000;
    expect(shouldBackup(inTheFuture, NOW)).toBe(false);
  });

  it('exposes the interval as 6 hours in ms', () => {
    expect(MIN_BACKUP_INTERVAL_MS).toBe(6 * 60 * 60 * 1000);
  });
});
