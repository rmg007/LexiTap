// Mock expo-file-system before importing the service under test. We control the
// bytes read from / written to user.db without touching a real filesystem.
jest.mock('expo-file-system', () => ({
  __esModule: true,
  documentDirectory: 'file:///docs/',
  EncodingType: { Base64: 'base64', UTF8: 'utf8' },
  readAsStringAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
}));

// Mock the env-gate directly. babel-preset-expo inlines `process.env.EXPO_PUBLIC_*`
// dot-reads at build time, so runtime mutation of those vars in a test is a no-op
// (delete is even rewritten away); mocking the gate module is the deterministic
// way to drive configured/unconfigured.
jest.mock('./backupEnv', () => ({
  __esModule: true,
  isBackupConfigured: jest.fn(),
}));

import * as FileSystem from 'expo-file-system';
import {
  SupabaseBackupService,
  BACKUP_BUCKET,
  backupObjectKey,
  type StorageApi,
  type StorageBucket,
} from './SupabaseBackupService';
import { isBackupConfigured } from './backupEnv';

const readAsStringAsync = FileSystem.readAsStringAsync as jest.Mock;
const writeAsStringAsync = FileSystem.writeAsStringAsync as jest.Mock;
const mockIsConfigured = isBackupConfigured as jest.Mock;

// A StorageError-shaped object: an Error carrying the HTTP status.
function storageError(message: string, status?: number): { message: string; status?: number } {
  return { message, status };
}

// Build a fake StorageApi whose single bucket's upload/download are jest mocks.
function makeStorage(): { storage: StorageApi; bucket: jest.Mocked<StorageBucket>; from: jest.Mock } {
  const bucket: jest.Mocked<StorageBucket> = {
    upload: jest.fn(),
    download: jest.fn(),
  };
  const from = jest.fn().mockReturnValue(bucket);
  const storage: StorageApi = { from };
  return { storage, bucket, from };
}

// A Blob-like with a known byte payload for the download path.
function fakeBlob(bytes: number[]): { arrayBuffer: () => Promise<ArrayBuffer> } {
  return {
    arrayBuffer: async () => new Uint8Array(bytes).buffer,
  };
}

const USER_ID = 'user-abc';

describe('SupabaseBackupService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Env-gate OPEN by default; the not_configured tests close it explicitly.
    mockIsConfigured.mockReturnValue(true);
  });

  describe('backupNow', () => {
    it('reads user.db and uploads it (upsert) to the user-scoped key, returns ok', async () => {
      // base64 for bytes [1,2,3]
      readAsStringAsync.mockResolvedValue('AQID');
      const { storage, bucket, from } = makeStorage();
      bucket.upload.mockResolvedValue({ data: { path: backupObjectKey(USER_ID) }, error: null });

      const result = await new SupabaseBackupService(storage).backupNow(USER_ID);

      expect(result).toEqual({ ok: true });
      expect(from).toHaveBeenCalledWith(BACKUP_BUCKET);
      expect(readAsStringAsync).toHaveBeenCalledWith('file:///docs/SQLite/user.db', {
        encoding: 'base64',
      });
      // Uploaded to the per-user key, with upsert on.
      const [path, body, options] = bucket.upload.mock.calls[0] as [
        string,
        ArrayBuffer,
        { upsert?: boolean },
      ];
      expect(path).toBe(`${USER_ID}/user.db`);
      expect(options?.upsert).toBe(true);
      // Body carries the decoded bytes.
      expect(Array.from(new Uint8Array(body))).toEqual([1, 2, 3]);
    });

    it('maps a 5xx upload error to reason: server', async () => {
      readAsStringAsync.mockResolvedValue('AQID');
      const { storage, bucket } = makeStorage();
      bucket.upload.mockResolvedValue({ data: null, error: storageError('boom', 503) });

      const result = await new SupabaseBackupService(storage).backupNow(USER_ID);

      expect(result).toEqual({ ok: false, reason: 'server' });
    });

    it('maps a network failure (thrown) to reason: offline', async () => {
      readAsStringAsync.mockResolvedValue('AQID');
      const { storage, bucket } = makeStorage();
      bucket.upload.mockRejectedValue(new TypeError('Network request failed'));

      const result = await new SupabaseBackupService(storage).backupNow(USER_ID);

      expect(result).toEqual({ ok: false, reason: 'offline' });
    });

    it('returns not_configured when env vars are unset (no read, no upload)', async () => {
      mockIsConfigured.mockReturnValue(false);
      const { storage, bucket } = makeStorage();

      const result = await new SupabaseBackupService(storage).backupNow(USER_ID);

      expect(result).toEqual({ ok: false, reason: 'not_configured' });
      expect(readAsStringAsync).not.toHaveBeenCalled();
      expect(bucket.upload).not.toHaveBeenCalled();
    });

    it('never throws even if reading user.db throws an unexpected error', async () => {
      readAsStringAsync.mockRejectedValue(new Error('disk on fire'));
      const { storage } = makeStorage();

      await expect(new SupabaseBackupService(storage).backupNow(USER_ID)).resolves.toEqual({
        ok: false,
        reason: 'unknown',
      });
    });
  });

  describe('restore', () => {
    it('downloads the remote backup and writes it to the user.db path, returns ok', async () => {
      const { storage, bucket } = makeStorage();
      bucket.download.mockResolvedValue({ data: fakeBlob([9, 8, 7]), error: null });

      const result = await new SupabaseBackupService(storage).restore(USER_ID);

      expect(result).toEqual({ ok: true });
      expect(bucket.download).toHaveBeenCalledWith(`${USER_ID}/user.db`);
      const [uri, contents, options] = writeAsStringAsync.mock.calls[0] as [
        string,
        string,
        { encoding?: string },
      ];
      expect(uri).toBe('file:///docs/SQLite/user.db');
      expect(options?.encoding).toBe('base64');
      // [9,8,7] base64-encodes to 'CQgH'.
      expect(contents).toBe('CQgH');
    });

    it('maps a 404 to reason: no_backup (NOT an error) and writes nothing', async () => {
      const { storage, bucket } = makeStorage();
      bucket.download.mockResolvedValue({ data: null, error: storageError('Object not found', 404) });

      const result = await new SupabaseBackupService(storage).restore(USER_ID);

      expect(result).toEqual({ ok: false, reason: 'no_backup' });
      expect(writeAsStringAsync).not.toHaveBeenCalled();
    });

    it('maps a network failure to reason: offline', async () => {
      const { storage, bucket } = makeStorage();
      bucket.download.mockRejectedValue(new TypeError('Network request failed'));

      const result = await new SupabaseBackupService(storage).restore(USER_ID);

      expect(result).toEqual({ ok: false, reason: 'offline' });
    });

    it('returns not_configured when env vars are unset (no download, no write)', async () => {
      mockIsConfigured.mockReturnValue(false);
      const { storage, bucket } = makeStorage();

      const result = await new SupabaseBackupService(storage).restore(USER_ID);

      expect(result).toEqual({ ok: false, reason: 'not_configured' });
      expect(bucket.download).not.toHaveBeenCalled();
      expect(writeAsStringAsync).not.toHaveBeenCalled();
    });

    it('never throws even if writing user.db throws', async () => {
      const { storage, bucket } = makeStorage();
      bucket.download.mockResolvedValue({ data: fakeBlob([1]), error: null });
      writeAsStringAsync.mockRejectedValue(new Error('read-only fs'));

      await expect(new SupabaseBackupService(storage).restore(USER_ID)).resolves.toEqual({
        ok: false,
        reason: 'unknown',
      });
    });
  });

  describe('hasRemoteBackup', () => {
    it('returns true when a remote object is present', async () => {
      const { storage, bucket } = makeStorage();
      bucket.download.mockResolvedValue({ data: fakeBlob([1]), error: null });

      await expect(new SupabaseBackupService(storage).hasRemoteBackup(USER_ID)).resolves.toBe(true);
    });

    it('returns false on a 404 (no backup yet)', async () => {
      const { storage, bucket } = makeStorage();
      bucket.download.mockResolvedValue({ data: null, error: storageError('not found', 404) });

      await expect(new SupabaseBackupService(storage).hasRemoteBackup(USER_ID)).resolves.toBe(false);
    });

    it('returns false (never throws) on a network failure', async () => {
      const { storage, bucket } = makeStorage();
      bucket.download.mockRejectedValue(new TypeError('Network request failed'));

      await expect(new SupabaseBackupService(storage).hasRemoteBackup(USER_ID)).resolves.toBe(false);
    });

    it('returns false when env vars are unset', async () => {
      mockIsConfigured.mockReturnValue(false);
      const { storage, bucket } = makeStorage();

      await expect(new SupabaseBackupService(storage).hasRemoteBackup(USER_ID)).resolves.toBe(false);
      expect(bucket.download).not.toHaveBeenCalled();
    });
  });
});
