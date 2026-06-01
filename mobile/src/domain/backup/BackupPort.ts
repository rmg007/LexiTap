// Domain port for off-device backup of the read-write user.db. Implemented in
// infrastructure/backup. Use cases depend on this interface — never on Supabase
// or expo-file-system — so backup is swappable and test-doubles are trivial.
//
// SILENT-FAIL CONTRACT: every method resolves to a BackupResult and MUST NEVER
// throw to the caller. Backup is a best-effort background concern; a network
// blip, an unconfigured build, or a missing remote object must never crash the
// app or interrupt the learner. Implementations wrap all I/O in try/catch and
// translate failures into a typed `reason` instead of propagating.

// Why a backup attempt did not succeed. Discriminated union so callers branch on
// `reason` without parsing error strings.
//   not_configured — Supabase env vars unset (Noop build / dev / tests). Expected.
//   offline        — network unreachable / request failed before a response.
//   no_backup      — restore/hasRemoteBackup: no remote object exists (404). Not
//                    an error — a fresh install or a user who never backed up.
//   server         — Supabase returned a 5xx (transient service failure).
//   unknown        — anything else (unexpected error, malformed response).
export type BackupFailureReason =
  | 'not_configured'
  | 'offline'
  | 'no_backup'
  | 'server'
  | 'unknown';

// Result of a backup/restore attempt. `ok: true` is success; otherwise a typed
// reason. Never an exception.
export type BackupResult = { ok: true } | { ok: false; reason: BackupFailureReason };

export interface BackupPort {
  // Upload the local user.db to the user's remote slot (upsert). Best-effort.
  backupNow(userId: string): Promise<BackupResult>;
  // Download the user's remote user.db and write it to the local db path. A
  // missing remote object resolves to { ok: false, reason: 'no_backup' }, not an
  // error. NOTE: this only writes the file; hot-swapping the live SQLite
  // connection is the caller's responsibility (it must run before openDatabase).
  restore(userId: string): Promise<BackupResult>;
  // Whether a remote backup exists for this user (drives the device-switch
  // "Restore?" prompt). Resolves false on any failure — never throws.
  hasRemoteBackup(userId: string): Promise<boolean>;
}
