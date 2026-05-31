---
title: Backup Integration Guide
status: reference
updated: 2026-05-31
---

# Backup Integration Guide

How to integrate encrypted backup (BK1-BK2) into the mobile app. See [../plans/P3_BACKUP_PLAN.md](../plans/P3_BACKUP_PLAN.md) for full architecture.

---

## Quick Reference

- **What:** Upload `user.db` to Supabase Storage after quiz; restore on device switch
- **Where:** `src/infrastructure/backup/` (SupabaseBackupService), `src/application/backup/` (use cases)
- **When:** After quiz completion + app foreground + every 6h (throttled)
- **How:** RLS path-scoped (`{userId}/user.db`), server-side encryption at rest, no client AES
- **Errors:** All silent (never throw), logged to analytics

---

## File Structure

```
mobile/src/
├── domain/backup/
│   └── BackupPort.ts                 # Abstract port (upload/download/check)
├── application/backup/
│   ├── ScheduleBackupUseCase.ts       # Periodic trigger (every 6h)
│   ├── ScheduleBackupUseCase.test.ts
│   ├── RestoreBackupUseCase.ts        # Device-switch restore
│   └── RestoreBackupUseCase.test.ts
├── infrastructure/backup/
│   ├── SupabaseBackupService.ts       # Storage adapter (real)
│   ├── SupabaseBackupService.test.ts
│   └── NoopBackupService.ts           # Stub for tests
└── infrastructure/db/
    ├── database.ts                     # ← Hydration gate added here
    └── migrations/
        └── 004_backup_timestamp.ts     # new migration
```

---

## Port Definition

**File:** `src/domain/backup/BackupPort.ts`

```typescript
export interface BackupPort {
  /**
   * Upload the local user.db to Supabase Storage at {userId}/user.db.
   * Path is RLS-scoped (user can only write own file).
   *
   * @throws SyncError on network/auth/RLS failure
   * Caller must handle; never re-thrown
   */
  uploadBackup(dbPath: string): Promise<void>;

  /**
   * Download backup from Supabase Storage {userId}/user.db to local path.
   * If no backup exists (404), silently returns (caller interprets as "empty schema").
   *
   * @throws SyncError on network/auth/RLS failure (except 404)
   * Caller must handle; never re-thrown
   */
  downloadBackup(targetPath: string): Promise<void>;

  /**
   * Check if a backup exists at {userId}/user.db (for UI, optional).
   * @returns true if file exists and is accessible via RLS
   */
  hasRemoteBackup(): Promise<boolean>;
}
```

---

## Adapter: SupabaseBackupService

**File:** `src/infrastructure/backup/SupabaseBackupService.ts`

Full implementation (see plan for context):

```typescript
import { SupabaseClient } from '@supabase/supabase-js';
import * as FileSystem from 'expo-file-system';
import { BackupPort } from '../../domain/backup/BackupPort';
import { AuthService } from '../auth/AuthService';
import { SyncError } from '../supabase/errors';

export class SupabaseBackupService implements BackupPort {
  constructor(
    private supabaseClient: SupabaseClient,
    private authService: AuthService,
  ) {}

  async uploadBackup(dbPath: string): Promise<void> {
    const userId = this.authService.getCurrentUserId();
    if (!userId) {
      throw new SyncError('Not authenticated');
    }

    // Read file as base64
    const base64 = await FileSystem.readAsStringAsync(dbPath, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Upload to Supabase Storage
    const remotePath = `${userId}/user.db`;
    const { error } = await this.supabaseClient.storage
      .from('user-backups')
      .upload(remotePath, Buffer.from(base64, 'base64'), {
        upsert: true,
        contentType: 'application/octet-stream',
      });

    if (error) {
      throw new SyncError(`Backup upload failed: ${error.message}`);
    }
  }

  async downloadBackup(targetPath: string): Promise<void> {
    const userId = this.authService.getCurrentUserId();
    if (!userId) {
      throw new SyncError('Not authenticated');
    }

    const remotePath = `${userId}/user.db`;
    const { data, error } = await this.supabaseClient.storage
      .from('user-backups')
      .download(remotePath);

    if (error) {
      if (error.statusCode === 404) {
        // No backup exists; caller will interpret as fresh schema
        return;
      }
      throw new SyncError(`Backup download failed: ${error.message}`);
    }

    // Write to target path
    const base64 = Buffer.from(data).toString('base64');
    await FileSystem.writeAsStringAsync(targetPath, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
  }

  async hasRemoteBackup(): Promise<boolean> {
    const userId = this.authService.getCurrentUserId();
    if (!userId) return false;

    const remotePath = `${userId}/user.db`;
    const { data, error } = await this.supabaseClient.storage
      .from('user-backups')
      .list(userId);

    if (error) return false;
    return data?.some((file) => file.name === 'user.db') ?? false;
  }
}
```

---

## Use Cases

### ScheduleBackupUseCase

**File:** `src/application/backup/ScheduleBackupUseCase.ts`

Periodic trigger (every 6h or after quiz):

```typescript
export class ScheduleBackupUseCase {
  constructor(
    private backupService: BackupPort,
    private prefs: PreferencesService,
    private analytics: AnalyticsPort,
  ) {}

  async triggerIfNeeded(dbPath: string): Promise<void> {
    const lastBackupMs = await this.prefs.getLastBackupMs();
    const nowMs = Date.now();

    // Throttle to every 6 hours
    if (lastBackupMs && nowMs - lastBackupMs < 6 * 60 * 60 * 1000) {
      return;
    }

    try {
      await this.backupService.uploadBackup(dbPath);
      await this.prefs.setLastBackupMs(nowMs);
      this.analytics.capture('backup_completed', {
        success: true,
      });
    } catch (err) {
      this.analytics.capture('backup_failed', {
        reason: err instanceof Error ? err.message : 'unknown',
      });
      // Silent fail; do not re-throw
    }
  }
}
```

**Trigger points:**
1. After quiz session completion (hook in `FinishQuizSessionUseCase`)
2. On app foreground (`AppState.addEventListener('focus', ...)`)
3. On successful sign-in (`AU2` completes)

---

### RestoreBackupUseCase

**File:** `src/application/backup/RestoreBackupUseCase.ts`

Hydration before DB open:

```typescript
export class RestoreBackupUseCase {
  constructor(
    private backupService: BackupPort,
    private fileSystem: FileSystemPort,
    private analytics: AnalyticsPort,
  ) {}

  /**
   * Restore backup if local db is empty or missing.
   * MUST be called BEFORE openDatabase() + migrations.
   */
  async restoreIfNeeded(dbPath: string): Promise<void> {
    // If local db exists and has content: skip (device-authoritative)
    const exists = await this.fileSystem.fileExists(dbPath);
    if (exists) {
      const stat = await this.fileSystem.getFileSize(dbPath);
      if (stat > 512) {
        // Non-empty; assume it's valid
        return;
      }
    }

    // Attempt to download backup
    try {
      await this.backupService.downloadBackup(dbPath);
      this.analytics.capture('backup_restored', {
        success: true,
      });
    } catch (err) {
      if (err instanceof SyncError && err.message.includes('404')) {
        // No backup; will init fresh schema
        this.analytics.capture('backup_restore_skipped', {
          reason: 'not_found',
        });
        return;
      }
      // Other errors: log + continue with fresh schema
      this.analytics.capture('backup_restore_failed', {
        reason: err instanceof Error ? err.message : 'unknown',
      });
    }
  }
}
```

---

## Database Integration

### Hydration Gate (CRITICAL)

**File:** `src/infrastructure/db/database.ts`

**Before:** (wrong order)
```typescript
export async function initializeDatabase(): Promise<SQLiteDatabase> {
  const db = await openDatabase({ name: 'user.db', ... });
  await runMigrations(db);
  // ❌ If you restore here, migrations already ran on empty schema
  return db;
}
```

**After:** (correct order)
```typescript
export async function initializeDatabase(
  deps: Dependencies, // includes restoreBackupUseCase
): Promise<SQLiteDatabase> {
  const dbPath = `${FileSystem.getDatabasesDir()}/user.db`;

  // 1. RESTORE FIRST (before opening db)
  await deps.restoreBackupUseCase.restoreIfNeeded(dbPath);

  // 2. THEN OPEN DB
  const db = await openDatabase({ name: 'user.db', ... });

  // 3. THEN RUN MIGRATIONS (safe on restored schema)
  await runMigrations(db);

  return db;
}
```

This ensures:
- Fresh install + backup exists → restore → open → migrate (safe)
- Fresh install + no backup → open → migrate (empty schema, creates tables)
- Device with data → skip restore → open → migrate (idempotent)

### Migration 004 (last_backup_ms)

**File:** `src/infrastructure/db/migrations/004_backup_timestamp.ts`

```typescript
export const migration004 = `
  ALTER TABLE user_stats ADD COLUMN last_backup_ms INTEGER NULL;
`;
```

This is additive (no data loss); safe to run on existing schemas.

---

## Container Registration

**File:** `src/infrastructure/container.ts`

Register the services:

```typescript
// Backup services
const backupService = new SupabaseBackupService(
  supabaseClient,
  authService,
);

const scheduleBackupUseCase = new ScheduleBackupUseCase(
  backupService,
  preferencesService,
  analyticsService,
);

const restoreBackupUseCase = new RestoreBackupUseCase(
  backupService,
  fileSystemService,
  analyticsService,
);

container.register('backupService', () => backupService);
container.register('scheduleBackupUseCase', () => scheduleBackupUseCase);
container.register('restoreBackupUseCase', () => restoreBackupUseCase);

// Pass to database init
const database = await initializeDatabase({
  restoreBackupUseCase,
  // ... other deps
});
```

---

## Hook: Quiz Completion

**File:** `src/application/quiz/FinishQuizSessionUseCase.ts`

Trigger backup after quiz:

```typescript
export class FinishQuizSessionUseCase {
  constructor(
    // ... existing deps
    private scheduleBackupUseCase: ScheduleBackupUseCase,
    private logger: LoggerPort,
  ) {}

  async execute(sessionId: string): Promise<void> {
    // ... finish quiz session logic

    // Trigger periodic backup (6h throttle)
    const dbPath = `${FileSystem.getDatabasesDir()}/user.db`;
    this.scheduleBackupUseCase.triggerIfNeeded(dbPath).catch((err) => {
      this.logger.error('Backup trigger failed', err);
      // Silent fail; quiz completion is not blocked
    });
  }
}
```

---

## Hook: App Foreground

**File:** `src/presentation/RootLayout.tsx` or app entry point

Trigger backup on foreground:

```typescript
import { AppState } from 'react-native';

export function AppRoot() {
  const scheduleBackupUseCase = useContext(ServicesContext).scheduleBackupUseCase;
  const dbPath = `${FileSystem.getDatabasesDir()}/user.db`;

  useEffect(() => {
    const subscription = AppState.addEventListener('focus', async () => {
      // Trigger backup (throttled to every 6h)
      await scheduleBackupUseCase.triggerIfNeeded(dbPath).catch((err) => {
        console.warn('Backup on foreground failed', err);
      });
    });

    return () => subscription?.remove();
  }, [scheduleBackupUseCase]);

  return <YourAppContent />;
}
```

---

## Hook: Sign-In

**File:** `src/application/auth/SignInUseCase.ts`

Trigger restore after successful sign-in (if first-ever auth on device):

```typescript
export class SignInUseCase {
  constructor(
    // ... existing deps
    private authService: AuthService,
    private scheduleBackupUseCase: ScheduleBackupUseCase,
    private logger: LoggerPort,
  ) {}

  async execute(email: string): Promise<void> {
    // ... sign in logic
    const user = await this.authService.signInWithOtp(email);

    // Trigger backup after sign-in (for next time)
    const dbPath = `${FileSystem.getDatabasesDir()}/user.db`;
    this.scheduleBackupUseCase.triggerIfNeeded(dbPath).catch((err) => {
      this.logger.warn('Backup after sign-in failed', err);
    });
  }
}
```

Note: `RestoreBackupUseCase` is called at app **launch** (`database.ts` init), not here. Sign-in just ensures that future backups trigger.

---

## Settings: Manual Restore Button

**File:** `src/presentation/screens/SettingsScreen.tsx`

Add manual restore option:

```typescript
export function SettingsScreen() {
  const [isRestoring, setIsRestoring] = useState(false);
  const services = useContext(ServicesContext);
  const dbPath = `${FileSystem.getDatabasesDir()}/user.db`;

  const handleManualRestore = async () => {
    Alert.alert(
      'Restore from backup?',
      'This will overwrite your local progress. Continue?',
      [
        { text: 'Cancel', onPress: () => {} },
        {
          text: 'Restore',
          onPress: async () => {
            setIsRestoring(true);
            try {
              // Close db, restore, reopen, reload
              await services.database.close();
              await services.restoreBackupUseCase.restoreIfNeeded(dbPath);
              // Reopen db + UI
              const newDb = await initializeDatabase(services);
              services.setDatabase(newDb);
              Alert.alert('Success', 'Backup restored. App reloading...');
              // Force app reload (navigation.reset or RN reload)
            } catch (err) {
              Alert.alert(
                'Restore failed',
                err instanceof Error ? err.message : 'Unknown error',
              );
            } finally {
              setIsRestoring(false);
            }
          },
        },
      ],
    );
  };

  return (
    <SettingsContainer>
      {/* ... other settings ... */}

      <Section title="Backup">
        <Pressable
          onPress={handleManualRestore}
          disabled={isRestoring}
          accessibilityRole="button"
        >
          <Text>{isRestoring ? 'Restoring…' : 'Restore from backup'}</Text>
        </Pressable>
      </Section>
    </SettingsContainer>
  );
}
```

---

## Analytics Events

All events logged to PostHog + offline event_log:

```typescript
// Backup upload
'backup_completed' { success: true }
'backup_failed' { reason: string }
'backup_skipped' { reason: 'recent_backup' | 'offline' }

// Restore (hydration, at app launch)
'backup_restored' { success: true }
'backup_restore_skipped' { reason: 'not_found' | 'existing_local_data' }
'backup_restore_failed' { reason: string }

// Manual restore (Settings)
'backup_restore_manual' { action: 'initiated' | 'confirmed' | 'completed' | 'failed' }
```

---

## Testing

### Unit Tests

**SupabaseBackupService.test.ts:**
```typescript
describe('SupabaseBackupService', () => {
  it('uploads file to correct RLS path', async () => {
    const mockStorage = {
      upload: jest.fn().mockResolvedValue({ error: null }),
    };
    const mockAuthService = {
      getCurrentUserId: jest.fn().mockReturnValue('user123'),
    };

    const service = new SupabaseBackupService(
      { storage: { from: () => mockStorage } } as any,
      mockAuthService as any,
    );

    await service.uploadBackup('/path/to/user.db');

    expect(mockStorage.upload).toHaveBeenCalledWith(
      'user123/user.db',
      expect.any(Buffer),
      expect.objectContaining({ upsert: true }),
    );
  });

  it('handles 404 on download (no backup)', async () => {
    const mockStorage = {
      download: jest.fn().mockResolvedValue({
        error: { statusCode: 404 },
      }),
    };

    const service = new SupabaseBackupService(
      { storage: { from: () => mockStorage } } as any,
      mockAuthService as any,
    );

    // Should NOT throw; caller interprets as "no backup"
    await expect(service.downloadBackup('/path')).resolves.toBeUndefined();
  });

  // ... more tests for error cases
});
```

**ScheduleBackupUseCase.test.ts:**
```typescript
describe('ScheduleBackupUseCase', () => {
  it('skips if last backup < 6h ago', async () => {
    const mockBackupService = { uploadBackup: jest.fn() };
    const mockPrefs = {
      getLastBackupMs: jest.fn().mockResolvedValue(Date.now() - 1000),
    };

    const useCase = new ScheduleBackupUseCase(
      mockBackupService as any,
      mockPrefs as any,
      mockAnalytics as any,
    );

    await useCase.triggerIfNeeded('/path');

    expect(mockBackupService.uploadBackup).not.toHaveBeenCalled();
  });

  it('uploads if last backup > 6h ago', async () => {
    const mockBackupService = { uploadBackup: jest.fn() };
    const mockPrefs = {
      getLastBackupMs: jest.fn().mockResolvedValue(
        Date.now() - 7 * 60 * 60 * 1000,
      ),
      setLastBackupMs: jest.fn(),
    };

    const useCase = new ScheduleBackupUseCase(
      mockBackupService as any,
      mockPrefs as any,
      mockAnalytics as any,
    );

    await useCase.triggerIfNeeded('/path');

    expect(mockBackupService.uploadBackup).toHaveBeenCalledWith('/path');
  });
});
```

### Integration Tests

(Deferred; run on real Supabase + device)
- Fresh install → sign in → backup exists → restore works
- Offline backup → silent (no error)
- RLS 403 on cross-user access (verified with curl)

---

## Supabase Configuration

### Storage Bucket

In Supabase console:

1. **Storage → Buckets → Create new bucket**
   - Name: `user-backups`
   - Public: OFF (private)
   - File size limit: 200 MB (or higher)

2. **Policies → Create policy**
   - Name: "Users can read/write own backups"
   - For: ALL operations
   - Using: `auth.uid()::text = (string_to_array(name, '/'))[1]`
   - With Check: same

Test with curl:
```bash
# As user, upload
curl -X POST \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -F "file=@user.db" \
  "https://${PROJECT_ID}.supabase.co/storage/v1/object/user-backups/${UID}/user.db?upsert=true"

# Download
curl -X GET \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  "https://${PROJECT_ID}.supabase.co/storage/v1/object/user-backups/${UID}/user.db"
```

---

## Environment Variables

None needed (Supabase client already configured in `supabaseClient.ts`).

If backup is ever gated by a feature flag:
```typescript
// In app.config.ts extra
EXPO_PUBLIC_BACKUP_ENABLED: 'true',

// In SupabaseBackupService
if (!process.env.EXPO_PUBLIC_BACKUP_ENABLED) {
  return; // No-op
}
```

---

## Debugging

### Check RLS Policy

In Supabase SQL console:
```sql
SELECT * FROM storage.policies WHERE bucket_id = (SELECT id FROM storage.buckets WHERE name = 'user-backups');
```

### List Files in Bucket

```typescript
const { data, error } = await supabaseClient.storage
  .from('user-backups')
  .list('user123');
console.log(data, error);
```

### Test Upload (CLI)

```bash
cd mobile
npx tsx <<EOF
import { initializeSupabase } from './src/infrastructure/supabase/client.ts';
const client = initializeSupabase();
const result = await client.storage
  .from('user-backups')
  .upload('test-user-id/test.db', Buffer.from('test data'));
console.log(result);
EOF
```

### Logs

- Backup events → PostHog dashboard (retention)
- Errors → Sentry (with PII scrub)
- Console: check `backup_completed` / `backup_failed` / `backup_restored` events

---

## Known Limits

- **Backup size:** < 200 MB (Supabase soft limit)
- **Upload speed:** ~1 MB/sec over LTE (rough; depends on device, network)
- **Sync latency:** User must sign in on Device B to trigger restore (no auto-sync thread)
- **Storage cost:** Negligible for Phase 3 (<100 users × ~50 KB average = ~5 MB)

---

## Post-Launch Improvements (P4+)

- [ ] Show "Restoring progress…" UI during hydration
- [ ] Backup progress bar (for large files)
- [ ] Background sync once per day (no queue; just periodic)
- [ ] Versioned backups (keep last N versions, not just upsert)
- [ ] Conflict resolution if device clock is wildly wrong
- [ ] Backup encryption key rotation (currently server-managed)

---

*Last updated: 2026-05-31*
