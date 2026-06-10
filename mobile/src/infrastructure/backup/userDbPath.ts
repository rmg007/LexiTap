// SDK 56: the classic synchronous FileSystem API (documentDirectory) moved to
// the `/legacy` subpath. The new File/Paths API is async and would change this
// module's contract, so we stay on the legacy API — fully supported in SDK 56.
import * as FileSystem from 'expo-file-system/legacy';

// Single source of truth for the on-device read-write user.db path and the
// staging path used by the Settings "restore from backup" flow.
//
// expo-sqlite resolves a database name against `${documentDirectory}SQLite`, so
// user.db physically lives at `${documentDirectory}SQLite/user.db` (mirrors
// contentDb.ts's CONTENT_DB_PATH). SupabaseBackupService reads/writes that file
// directly; the boot-time restore-apply (container.ts) promotes the staging file
// over it. Both must agree on the path, so it is computed in exactly one place.

function sqliteDir(): string {
  const docDir = FileSystem.documentDirectory;
  if (docDir === null) {
    // No writable document directory (should never happen on-device). Callers
    // wrap this in try/catch and degrade (backup → reason:'unknown'; the boot
    // restore-apply → warn and continue to a fresh schema).
    throw new Error('userDbPath: FileSystem.documentDirectory is null');
  }
  return `${docDir}SQLite`;
}

// The live user.db. Written directly ONLY when no SQLite connection is open yet
// (the BK2 boot gate, before openDatabase()).
export function userDbFileUri(): string {
  return `${sqliteDir()}/user.db`;
}

// Where a Settings-triggered restore downloads to. Deliberately NOT user.db: the
// live SQLite connection is open while Settings runs, so overwriting user.db
// there would let the connection flush stale page cache over the restored file
// (data loss / corruption). The staged file sits beside user.db so the boot-time
// apply is a same-filesystem rename, and is promoted over user.db BEFORE
// openDatabase() — honoring BackupPort.restore's "write before openDatabase"
// contract. See infrastructure/backup/pendingRestore.ts.
export function stagingDbFileUri(): string {
  return `${sqliteDir()}/user.db.restore-pending`;
}
