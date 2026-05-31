import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import {
  BUNDLED_CONTENT_DB_VERSION,
  CONTENT_DB_FILE_NAME,
  ensureContentDbInstalled,
  type ContentDbInstallEffects,
  type ContentDbInstallResult,
} from '@/infrastructure/db/contentDbInstall';

// Native effects for installing the bundled content DB. Copies words.db out of
// the app bundle into expo-sqlite's directory so `ATTACH DATABASE 'words.db'`
// resolves to a real, populated file (see contentDbInstall.ts for the why).
//
// expo-sqlite resolves database names against `${documentDirectory}SQLite`, so
// that is where the copy must land and where the version sentinel lives.

const SQLITE_DIR = `${FileSystem.documentDirectory}SQLite`;
const CONTENT_DB_PATH = `${SQLITE_DIR}/${CONTENT_DB_FILE_NAME}`;
const VERSION_SENTINEL_PATH = `${CONTENT_DB_PATH}.version`;

// Metro bundles this as an asset (metro.config.js registers the `db` extension);
// expo-asset embeds it in the binary (app.config.ts expo-asset plugin).
const CONTENT_DB_MODULE = require('../../../assets/vocab/words.db');

async function readInstalledVersion(): Promise<number | null> {
  const db = await FileSystem.getInfoAsync(CONTENT_DB_PATH);
  if (!db.exists) {
    return null;
  }
  const sentinel = await FileSystem.getInfoAsync(VERSION_SENTINEL_PATH);
  if (!sentinel.exists) {
    return null;
  }
  try {
    const raw = await FileSystem.readAsStringAsync(VERSION_SENTINEL_PATH);
    const parsed = Number.parseInt(raw.trim(), 10);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function copyBundledDb(): Promise<void> {
  const dir = await FileSystem.getInfoAsync(SQLITE_DIR);
  if (!dir.exists) {
    await FileSystem.makeDirectoryAsync(SQLITE_DIR, { intermediates: true });
  }
  const asset = Asset.fromModule(CONTENT_DB_MODULE);
  await asset.downloadAsync();
  if (!asset.localUri) {
    throw new Error('contentDb: bundled words.db asset has no localUri after download');
  }
  // Overwrite any stale copy from a previous version.
  await FileSystem.deleteAsync(CONTENT_DB_PATH, { idempotent: true });
  await FileSystem.copyAsync({ from: asset.localUri, to: CONTENT_DB_PATH });
}

async function writeInstalledVersion(version: number): Promise<void> {
  await FileSystem.writeAsStringAsync(VERSION_SENTINEL_PATH, String(version));
}

const effects: ContentDbInstallEffects = {
  readInstalledVersion,
  copyBundledDb,
  writeInstalledVersion,
  bundledVersion: BUNDLED_CONTENT_DB_VERSION,
};

// Ensure the bundled content DB is present and current in expo-sqlite's dir.
// Call once, before opening/ATTACHing the database. Idempotent.
export function installContentDb(): Promise<ContentDbInstallResult> {
  return ensureContentDbInstalled(effects);
}

// Absolute filesystem path of the installed content DB, for SQL `ATTACH`.
// A bare `ATTACH 'words.db'` is handed straight to SQLite, which resolves a
// relative path against the process CWD (the app-bundle root on iOS) — NOT the
// expo-sqlite directory — so it fails to open on-device even though the file is
// present (the C0 bug, proven on a real build). ATTACH this full path instead.
// documentDirectory carries a file:// scheme; SQLite wants a plain path, so strip it.
export function contentDbAttachPath(): string {
  return CONTENT_DB_PATH.replace(/^file:\/\//, '');
}
