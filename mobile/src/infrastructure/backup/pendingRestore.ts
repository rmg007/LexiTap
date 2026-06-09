// Pure apply-decision for a Settings-staged restore.
//
// The Settings "restore from backup" flow CANNOT overwrite the live user.db: the
// SQLite connection is open, so a write would flush stale page cache over the
// restored file (data loss / corruption). Instead it downloads the remote backup
// to a STAGING file (see userDbPath.stagingDbFileUri) and sets a pending flag.
// This module promotes that staged file over user.db at the next boot, BEFORE
// openDatabase() opens the connection — honoring BackupPort.restore's "write
// before openDatabase" contract, exactly like the BK2 hydration gate.
//
// Pure function over an injected effects port (mirrors contentDbInstall) so it is
// unit-testable without expo-file-system / AsyncStorage. Concrete effects are
// wired in container.ts.

export interface PendingRestoreEffects {
  // Whether a Settings restore has been staged and is awaiting apply.
  isPending(): Promise<boolean>;
  // Whether the staged file actually exists (and is non-empty) on disk.
  stagingExists(): Promise<boolean>;
  // Promote the staged file over the live user.db (overwriting). Same-filesystem
  // rename; implementation deletes the destination first so the move can't fail
  // on "destination exists".
  applyStaging(): Promise<void>;
  // Clear the pending flag. Called only AFTER a successful apply.
  clearPending(): Promise<void>;
}

export interface PendingRestoreResult {
  applied: boolean;
}

// Apply a staged restore if one is pending. Idempotent and crash-safe: the flag
// is cleared LAST, so an interruption between applyStaging() and clearPending()
// simply retries the (idempotent) promotion on the next boot rather than losing
// the restore.
export async function applyPendingRestore(
  effects: PendingRestoreEffects,
): Promise<PendingRestoreResult> {
  if (!(await effects.isPending())) {
    return { applied: false };
  }
  // Flag set but the staged file is gone (storage cleared, or a partial write
  // that never finished). Clear the now-meaningless flag and boot normally
  // rather than blocking launch.
  if (!(await effects.stagingExists())) {
    await effects.clearPending();
    return { applied: false };
  }
  await effects.applyStaging();
  await effects.clearPending();
  return { applied: true };
}
