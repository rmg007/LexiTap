// Pure install-decision logic for the bundled content database (words.db).
//
// expo-sqlite resolves a database name against its own SQLite directory; it does
// NOT read from the app bundle. The read-only content DB therefore has to be
// physically copied out of the bundled assets into that directory before the
// first `ATTACH DATABASE 'words.db'`. Skipping this is the C0 bug: ATTACH on a
// missing file silently creates an EMPTY database, so every content query
// returns zero rows on a real device.
//
// This module holds ONLY the copy-or-skip decision (and the version gate) as a
// pure function over an injected effects port, so it is unit-testable without
// expo-asset / expo-file-system / native modules. The concrete effects live in
// contentDb.ts.

// The version of words.db currently bundled with the app. MUST equal the
// bundled DB's `PRAGMA user_version` (and build-manifest.json `user_version`).
// The content-release process (plan task C8) bumps this whenever a newer
// words.db is bundled; on the next launch the gate below re-copies it, so a
// content update shipped in an app update is not masked by the stale copy left
// over from the previous install.
export const BUNDLED_CONTENT_DB_VERSION = 8;

// File name expo-sqlite will ATTACH; the copy target shares it.
export const CONTENT_DB_FILE_NAME = 'words.db';

// Effects the installer needs, abstracted so tests can fake them. All paths are
// computed by the caller (contentDb.ts) from expo-file-system's SQLite dir.
export interface ContentDbInstallEffects {
  // Version recorded alongside the last successful copy; null when absent/unreadable.
  readInstalledVersion(): Promise<number | null>;
  // Copy the bundled words.db asset into the SQLite directory (overwrites).
  copyBundledDb(): Promise<void>;
  // Persist the version that was just copied (the version sentinel).
  writeInstalledVersion(version: number): Promise<void>;
  // The version of the asset bundled in this build.
  bundledVersion: number;
}

export interface ContentDbInstallResult {
  copied: boolean;
  // The version present in the SQLite dir after this call.
  version: number;
}

// Decide whether the bundled content DB must be copied, and do it.
//
// Copies when: no prior copy exists, the sentinel is unreadable/corrupt, or the
// bundled version is newer than the installed one. Never downgrades. Always
// writes the sentinel after a copy so the next launch is a no-op.
export async function ensureContentDbInstalled(
  effects: ContentDbInstallEffects,
): Promise<ContentDbInstallResult> {
  const installed = await effects.readInstalledVersion();
  const bundled = effects.bundledVersion;

  if (installed !== null && installed >= bundled) {
    return { copied: false, version: installed };
  }

  await effects.copyBundledDb();
  await effects.writeInstalledVersion(bundled);
  return { copied: true, version: bundled };
}
