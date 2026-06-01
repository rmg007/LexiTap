// Pure throttle decision for user.db backups. No I/O, no Date.now — the caller
// passes `nowMs` in so the decision is deterministic and trivially testable. The
// application layer owns persistence of `lastBackupAtMs` (AsyncStorage) and the
// actual BackupPort.backupNow call; this module only answers "is it time yet?".

// Minimum spacing between backup uploads: 6 hours. Backups are cheap but not
// free (bytes + a Storage write); once-per-session-ish is plenty for an
// offline-first app where the only loss window is a single device's recent edits.
export const MIN_BACKUP_INTERVAL_MS = 21_600_000; // 6h * 60m * 60s * 1000ms

/**
 * Decide whether enough time has elapsed since the last successful backup to
 * back up again.
 *
 * @param lastBackupAtMs epoch ms of the last successful backup, or null/undefined
 *   if the user has never been backed up (→ always back up).
 * @param nowMs current epoch ms (injected; never read from the clock here).
 * @returns true when a backup should be performed now.
 *
 * Robust to clock skew: a `lastBackupAtMs` in the future (negative elapsed) is
 * treated as "not yet due" so a wonky clock cannot trigger a backup storm.
 */
export function shouldBackup(
  lastBackupAtMs: number | null | undefined,
  nowMs: number,
): boolean {
  if (lastBackupAtMs === null || lastBackupAtMs === undefined) return true;
  const elapsed = nowMs - lastBackupAtMs;
  return elapsed >= MIN_BACKUP_INTERVAL_MS;
}
