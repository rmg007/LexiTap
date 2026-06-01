import * as FileSystem from 'expo-file-system';
import type { BackupPort, BackupResult } from '@/domain/backup/BackupPort';
import { isBackupConfigured } from './backupEnv';

// Supabase Storage backup of the read-write user.db (BK1).
//
// Storage layout: bucket `user-backups`, object key `${userId}/user.db`. RLS
// scopes every object to its owning user (the userId prefix must match
// auth.uid()), so each device can only read/write its own backup. Upload upserts
// (a user has exactly one current backup, not a history).
//
// SILENT-FAIL CONTRACT (see BackupPort): every method resolves to a typed result
// and NEVER throws. All I/O is wrapped; failures map to a BackupFailureReason.
//
// AUTH: this service does NOT own authentication. It is constructed with an
// already-authenticated Storage handle (the real one comes from a logged-in
// supabase client's `.storage`); RLS uses that session's JWT. createBackupService
// wires the real client; tests inject a fake.

// The slice of the Supabase Storage API this service needs. Structurally
// compatible with `SupabaseClient['storage']` so the real client can be passed
// straight in, while staying a tiny, no-auth surface that tests can fake.
export interface StorageBucket {
  upload(
    path: string,
    body: ArrayBuffer,
    options?: { upsert?: boolean; contentType?: string },
  ): Promise<{ data: unknown; error: StorageErrorLike | null }>;
  download(path: string): Promise<{ data: BlobLike | null; error: StorageErrorLike | null }>;
}

export interface StorageApi {
  from(bucketId: string): StorageBucket;
}

// Minimal shape of a Supabase StorageError: an Error carrying the HTTP `status`
// used to classify the failure (404 → no_backup, 5xx → server).
interface StorageErrorLike {
  message: string;
  status?: number;
  statusCode?: string;
}

// Minimal Blob surface (download returns a Blob; we only need its bytes).
interface BlobLike {
  arrayBuffer(): Promise<ArrayBuffer>;
}

// Bucket + object-key conventions (see header). Kept here so the RLS policy SQL
// in the PR notes and this code stay in lock-step.
export const BACKUP_BUCKET = 'user-backups';
export const backupObjectKey = (userId: string): string => `${userId}/user.db`;

// expo-sqlite stores user.db at `${documentDirectory}SQLite/user.db` (mirrors
// contentDb.ts's CONTENT_DB_PATH). We read/write that file directly — we do NOT
// touch the live SQLite connection (that is infrastructure/db's job).
function userDbFileUri(): string {
  const docDir = FileSystem.documentDirectory;
  if (docDir === null) {
    // No writable document directory (should never happen on-device). Caller
    // turns the thrown error into reason:'unknown' via the try/catch wrappers.
    throw new Error('SupabaseBackupService: FileSystem.documentDirectory is null');
  }
  return `${docDir}SQLite/user.db`;
}

// Decode a base64 string (expo-file-system's Base64 read) into an ArrayBuffer
// suitable for Storage.upload. RN ships a global atob.
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = globalThis.atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Encode an ArrayBuffer (downloaded bytes) back to base64 for
// expo-file-system's Base64 write. RN ships a global btoa.
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i] as number);
  }
  return globalThis.btoa(binary);
}

// Classify a Supabase StorageError (or thrown value) into a BackupFailureReason.
// 404 → no_backup; 5xx → server; otherwise unknown. Network failures usually
// throw (no `status`) and are handled as 'offline' at the call site, not here.
function classifyStorageError(error: StorageErrorLike): 'no_backup' | 'server' | 'unknown' {
  const status = error.status;
  if (status === 404) return 'no_backup';
  if (status !== undefined && status >= 500 && status <= 599) return 'server';
  // Supabase sometimes reports a missing object via message, not status.
  if (/not.?found/i.test(error.message)) return 'no_backup';
  return 'unknown';
}

// Heuristic for "the request never reached the server" → offline. RN fetch
// throws a TypeError "Network request failed"; we also catch abort/timeout text.
function isOfflineError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /network request failed|network error|timeout|timed out|fetch failed|abort/i.test(msg);
}

export class SupabaseBackupService implements BackupPort {
  constructor(private readonly storage: StorageApi) {}

  async backupNow(userId: string): Promise<BackupResult> {
    if (!isBackupConfigured()) return { ok: false, reason: 'not_configured' };
    try {
      const base64 = await FileSystem.readAsStringAsync(userDbFileUri(), {
        encoding: FileSystem.EncodingType.Base64,
      });
      const body = base64ToArrayBuffer(base64);
      const { error } = await this.storage.from(BACKUP_BUCKET).upload(backupObjectKey(userId), body, {
        upsert: true,
        contentType: 'application/x-sqlite3',
      });
      if (error) {
        // An upload should never legitimately 404; treat that as unknown.
        const reason = classifyStorageError(error);
        return { ok: false, reason: reason === 'no_backup' ? 'unknown' : reason };
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, reason: isOfflineError(err) ? 'offline' : 'unknown' };
    }
  }

  async restore(userId: string): Promise<BackupResult> {
    if (!isBackupConfigured()) return { ok: false, reason: 'not_configured' };
    try {
      const { data, error } = await this.storage.from(BACKUP_BUCKET).download(backupObjectKey(userId));
      if (error) {
        return { ok: false, reason: classifyStorageError(error) };
      }
      if (data === null) {
        // No error but no blob → treat as missing.
        return { ok: false, reason: 'no_backup' };
      }
      const buffer = await data.arrayBuffer();
      const base64 = arrayBufferToBase64(buffer);
      // Write the downloaded bytes to the user.db path. We deliberately do NOT
      // hot-swap the live SQLite connection here — that must be done by the
      // caller BEFORE openDatabase() runs (infrastructure/db owns that seam).
      await FileSystem.writeAsStringAsync(userDbFileUri(), base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return { ok: true };
    } catch (err) {
      return { ok: false, reason: isOfflineError(err) ? 'offline' : 'unknown' };
    }
  }

  async hasRemoteBackup(userId: string): Promise<boolean> {
    if (!isBackupConfigured()) return false;
    try {
      const { data, error } = await this.storage.from(BACKUP_BUCKET).download(backupObjectKey(userId));
      if (error || data === null) return false;
      return true;
    } catch {
      return false;
    }
  }
}
