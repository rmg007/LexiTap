---
title: P3 Encrypted Backup Plan (BK1-BK2)
status: active
updated: 2026-05-31
phase: Phase 3 (Money + identity)
depends-on:
  - AU1-AU3 (auth must be shipped first)
  - A0 (Expo Go exit)
---

# P3 Encrypted Backup Implementation Plan

Server-side encryption at rest + RLS path-scoping. No client-side AES. Backup tied to authentication state: only authenticated users can upload/download their own `user.db`. Storage bucket is `user-backups` with path-scoped RLS (`{uid}/user.db`).

---

## High-Level Design

### Storage Model

- **Bucket:** `user-backups` (Supabase Storage)
- **Path:** `{userId}/user.db` (RLS policy: authenticated user can only read/write own file)
- **Encryption:** Server-side encryption at rest (Supabase default) + TLS in transit
- **No client-side AES** — rely on Supabase Storage + HTTPS transport
- **No progress tracking** — one-shot blob upload/download (deferred per RELEASE_PLAN)

### Backup Flow

```
After quiz completion + app backgrounding:
  1. App detects user is authenticated
  2. ReadFile(user.db from device) → binary blob
  3. Upload blob to Storage: {userId}/user.db (upsert: true)
  4. Log result (success/error) to analytics
  5. Never throw — graceful degrade

Periodic (every 6h or on app resume):
  6. If authed and last-backup > 6h, repeat steps 2–5
  7. If offline, queue event (no sync thread)
```

### Recovery Flow (Device Switch / Fresh Install)

```
On first sign-in after fresh install:
  1. User authenticates (AU1-AU3)
  2. App checks: local user.db exists?
     → Yes: skip restore (authoritative)
     → No: attempt download
  3. Download blob from Storage: {userId}/user.db
  4. Write to device (via expo-file-system)
  5. Open via expo-sqlite (migration-runs if schema < current)
  6. If no backup found: schema-init (empty state)

Hydration gate:
  - Backup restore must COMPLETE before `openDatabase()` runs migrations
  - If migrate-first, then clobber-from-backup = data loss
```

---

## Task Breakdown

### BK1 — Supabase Storage Setup + RLS

**Effort:** S (config only)

**Pre-requisites:**
- Supabase project exists (set up during AU1-AU3)
- `supabaseClient` configured in `mobile/src/infrastructure/supabase/`

**Deliverables:**

1. **Create storage bucket** — "user-backups" (not public; private by default)
2. **Define RLS policy** (PostgreSQL, on storage.objects):
   ```sql
   CREATE POLICY "Users can read/write own backups"
   ON storage.objects FOR ALL
   USING (
     auth.uid()::text = (string_to_array(name, '/'))[1]
   )
   WITH CHECK (
     auth.uid()::text = (string_to_array(name, '/'))[1]
   )
   ```
   - Path: `{uid}/user.db`
   - Only authenticated user can read/write their own file
   - Other files/paths: forbidden (403)
   - No public download

3. **Document** — Storage bucket config (readme in `mobile/src/infrastructure/backup/` or in BACKUP_INTEGRATION.md)

**Tests:**
- Unit: RLS query syntax verified (no runtime test; config-only)
- Integration: defer to BK2 (upload/download are integrated)

**Files touched:**
- (Supabase console only — no code changes here)
- `mobile/BACKUP_INTEGRATION.md` (documentation)

---

### BK1.1 — SupabaseBackupService Adapter

**Effort:** M

**Pre-requisites:**
- BK1 (bucket + RLS exist)
- AU2 (SupabaseAuthService ready, user has auth.uid())

**Deliverables:**

1. **New port:** `mobile/src/domain/backup/BackupPort.ts`
   ```typescript
   export interface BackupPort {
     uploadBackup(dbPath: string): Promise<void>;
     downloadBackup(targetPath: string): Promise<void>;
     hasRemoteBackup(): Promise<boolean>;
   }
   ```

2. **Adapter:** `mobile/src/infrastructure/backup/SupabaseBackupService.ts`
   ```typescript
   export class SupabaseBackupService implements BackupPort {
     constructor(private supabaseClient: SupabaseClient, private authService: AuthService) {}

     async uploadBackup(dbPath: string): Promise<void> {
       const userId = this.authService.getCurrentUserId();
       if (!userId) throw new Error('Not authenticated');

       const blob = await FileSystem.readAsStringAsync(dbPath, {
         encoding: FileSystem.EncodingType.Base64,
       });

       const remotePath = `${userId}/user.db`;
       const result = await this.supabaseClient.storage
         .from('user-backups')
         .upload(remotePath, Buffer.from(blob, 'base64'), {
           upsert: true,
           contentType: 'application/octet-stream',
         });

       if (result.error) throw new SyncError(`Backup upload failed: ${result.error.message}`);
     }

     async downloadBackup(targetPath: string): Promise<void> {
       const userId = this.authService.getCurrentUserId();
       if (!userId) throw new Error('Not authenticated');

       const remotePath = `${userId}/user.db`;
       const { data, error } = await this.supabaseClient.storage
         .from('user-backups')
         .download(remotePath);

       if (error) {
         if (error.statusCode === 404) {
           // No backup exists; leave targetPath unwritten (fresh schema)
           return;
         }
         throw new SyncError(`Backup download failed: ${error.message}`);
       }

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

3. **Error handling:**
   - 401 → user not authenticated → silent no-op (offline state)
   - 403 → RLS denied (shouldn't happen; own path) → log + silent
   - 404 → no remote backup → create empty schema (not an error)
   - 500+ → transient → queue for retry (see BK2)
   - Never throw to caller; wrap in `SyncError` + log to analytics

4. **Container integration:**
   ```typescript
   // container.ts
   const backupService = new SupabaseBackupService(supabaseClient, authService);
   container.register('backupService', () => backupService);
   ```

**Tests:**
- Mock `supabaseClient` + `authService`
- Upload: user auth → file read → upload called with correct path
- Download: user auth → file exists → written to path
- Download 404: no file → no write (fresh schema)
- Offline (no auth): silent return (no error)
- RLS 403: logged + silent

**Files touched:**
- `mobile/src/domain/backup/BackupPort.ts` (new)
- `mobile/src/infrastructure/backup/SupabaseBackupService.ts` (new)
- `mobile/src/infrastructure/backup/SupabaseBackupService.test.ts` (new)
- `mobile/src/infrastructure/container.ts` (register service)
- `mobile/src/infrastructure/supabase/errors.ts` (add SyncError)

---

### BK1.2 — Periodic Backup Trigger

**Effort:** M

**Pre-requisites:**
- BK1.1 (SupabaseBackupService exists)
- Quiz answer flow (to know when to trigger)

**Deliverables:**

1. **Use case:** `mobile/src/application/backup/ScheduleBackupUseCase.ts`
   ```typescript
   export class ScheduleBackupUseCase {
     constructor(
       private backupService: BackupPort,
       private prefs: PreferencesService, // last_backup_ms
       private analytics: AnalyticsPort,
     ) {}

     async triggerIfNeeded(dbPath: string): Promise<void> {
       const lastBackupMs = await this.prefs.getLastBackupMs();
       const nowMs = Date.now();

       // Only backup every 6h (or after quiz)
       if (lastBackupMs && nowMs - lastBackupMs < 6 * 60 * 60 * 1000) {
         return; // Not yet
       }

       try {
         await this.backupService.uploadBackup(dbPath);
         await this.prefs.setLastBackupMs(nowMs);
         this.analytics.capture('backup_completed', { success: true });
       } catch (err) {
         this.analytics.capture('backup_failed', { reason: err.message });
         // Silent fail — don't block quiz flow
       }
     }
   }
   ```

2. **Preference storage:**
   - Add `last_backup_ms` to `user_stats` (nullable)
   - Migration 004: `ALTER TABLE user_stats ADD COLUMN last_backup_ms INTEGER;`

3. **Trigger points:**
   - After quiz session completion (`finishQuizSession` hook)
   - On app resume (`AppState` listener)
   - On successful sign-in (`AU2`)

4. **Queue (no live sync):**
   - If offline during backup: do nothing (no queue)
   - Next app foreground + WiFi OR manual Settings button will retry
   - **No background threads, no periodic wake-lock**

**Tests:**
- First backup: runs immediately
- Second backup < 6h later: skipped
- Second backup > 6h later: runs
- Offline (error): silent, `last_backup_ms` not updated
- Analytics events fired (success + failure)

**Files touched:**
- `mobile/src/application/backup/ScheduleBackupUseCase.ts` (new)
- `mobile/src/application/backup/ScheduleBackupUseCase.test.ts` (new)
- `mobile/src/infrastructure/db/migrations/004_backup_timestamp.ts` (new)
- `mobile/src/infrastructure/storage/PreferencesService.ts` (add getter/setter)
- (Quiz session completion hook → call `triggerIfNeeded`)
- (AppState listener → call `triggerIfNeeded`)

---

### BK2 — Restore on Device Switch

**Effort:** L

**Pre-requisites:**
- BK1.1 (SupabaseBackupService)
- BK1.2 (backup trigger + last_backup_ms)
- AU2 (SupabaseAuthService ready)

**Critical constraint:** **Hydration gate before `openDatabase()`**
- User signs in → download backup (if exists) → restore to file → **then** open db + run migrations
- Migrations run on already-restored schema (should be idempotent, but rely on versioning)

**Deliverables:**

1. **Use case:** `mobile/src/application/backup/RestoreBackupUseCase.ts`
   ```typescript
   export class RestoreBackupUseCase {
     constructor(
       private backupService: BackupPort,
       private fileSystem: FileSystemPort,
       private analytics: AnalyticsPort,
     ) {}

     async restoreIfNeeded(dbPath: string): Promise<void> {
       // If local db exists and has data: skip restore (device-authoritative)
       const exists = await this.fileSystem.fileExists(dbPath);
       if (exists) {
         const stat = await this.fileSystem.getFileSize(dbPath);
         if (stat > 512) { // Assume non-empty if > 512 bytes
           return;
         }
       }

       // Attempt to download backup
       try {
         await this.backupService.downloadBackup(dbPath);
         this.analytics.capture('backup_restored', { success: true });
       } catch (err) {
         if (err instanceof SyncError && err.message.includes('404')) {
           // No backup; schema will be initialized empty
           this.analytics.capture('backup_restore_skipped', { reason: 'not_found' });
           return;
         }
         // Other errors: log + continue (fresh schema)
         this.analytics.capture('backup_restore_failed', { reason: err.message });
       }
     }
   }
   ```

2. **Integration point:** `mobile/src/infrastructure/db/database.ts`
   ```typescript
   export async function initializeDatabase(deps: Dependencies): Promise<SQLiteDatabase> {
     const dbPath = `${FileSystem.getDatabase

Dir()}/user.db`;

     // Hydration gate: restore backup BEFORE opening db
     await deps.restoreBackupUseCase.restoreIfNeeded(dbPath);

     const db = await openDatabase({ name: 'user.db', ... });

     // Now run migrations (safe to run on restored schema)
     await runMigrations(db);

     return db;
   }
   ```

3. **Empty-schema fallback:**
   - If no backup found (404) AND local file doesn't exist:
     - `openDatabase()` auto-creates empty schema
     - Migrations run on empty db
     - User sees onboarding (fresh state)

4. **Error boundaries:**
   - Restore network error → log + continue (fresh schema, user can restore manually later via Settings)
   - Restore file-write error → log + continue (fallback to empty)
   - Never block app launch

5. **Manual restore (Settings):**
   - Add "Restore from backup" button in Settings
   - Shows a sheet: "Restoring will overwrite local progress. Continue?"
   - On confirm: `restoreIfNeeded(dbPath)` + `db.close()` + reopen + reload UI
   - Success/failure toast

**Tests:**
- Fresh install, backup exists: download + initialize called
- Fresh install, no backup: empty schema created
- Device with existing data: restore skipped (not attempted)
- Network error during restore: silent, empty schema fallback
- File-write error: silent, empty schema fallback
- Manual restore: closes db, restores, reopens (UI refresh not tested; integration)

**Files touched:**
- `mobile/src/application/backup/RestoreBackupUseCase.ts` (new)
- `mobile/src/application/backup/RestoreBackupUseCase.test.ts` (new)
- `mobile/src/infrastructure/db/database.ts` (add hydration gate before `openDatabase()`)
- `mobile/src/infrastructure/db/migrations/index.ts` (ensure migrations are idempotent)
- `mobile/src/presentation/screens/SettingsScreen.tsx` (add manual restore button)
- `mobile/src/infrastructure/storage/PreferencesService.ts` (track restore state)

---

## Cross-Cutting Concerns

### Error Handling

- **401 Unauthorized** → user not authenticated → silent no-op (offline state, not an error)
- **403 Forbidden** → RLS denied → should not happen (own path); log + silent
- **404 Not Found** → no backup exists → not an error (fresh schema)
- **5xx Server Error** → transient → silent fail + retry next app foreground
- **Network offline** → silent fail (no queue; user will sync next time online)
- **File I/O error** → silent fail + fall back to empty schema
- **Database lock** → wait (expo-sqlite handles; should not propagate)

**Rule:** Backup/restore **never throws to the caller**. All errors → analytics event + silent continue.

### Analytics Events

```typescript
// Backup
'backup_completed' { success: true, size_bytes: number, duration_ms: number }
'backup_failed' { reason: string } // network, auth, file_io
'backup_skipped' { reason: 'recent_backup' | 'offline' }

// Restore
'backup_restored' { success: true, size_bytes: number }
'backup_restore_skipped' { reason: 'not_found' | 'existing_local_data' }
'backup_restore_failed' { reason: string } // network, file_io
'backup_restore_manual' { action: 'initiated' | 'confirmed' | 'completed' | 'failed' }
```

### Security Properties

- **At rest:** Supabase Storage server-side encryption (AES-256 by default)
- **In transit:** HTTPS only (expo-file-system + Supabase SDK enforce)
- **Identity:** RLS path-scoped to `auth.uid()` (no cross-user leakage)
- **No keys to manage:** Supabase handles encryption keys (not in the app)
- **No PII in logs:** Backup/restore events log size + duration, not contents
- **Offline safety:** No sync thread; queuing deferred (no lost data, but user not auto-healed on new device until they sign in)

### Database Schema (user.db)

Migration 004 (triggered by BK1.2):
```sql
ALTER TABLE user_stats ADD COLUMN last_backup_ms INTEGER NULL;
```

Migration 005 (if needed for future):
```sql
-- Add backup status tracking (deferred for Phase 4)
-- ALTER TABLE user_stats ADD COLUMN backup_status TEXT DEFAULT 'none';
```

### Supabase RLS (Bucket Policy)

Applied to `storage.objects`:
```sql
CREATE POLICY "Users can read/write own backups" ON storage.objects
FOR ALL
USING (
  auth.uid()::text = (string_to_array(name, '/'))[1]
)
WITH CHECK (
  auth.uid()::text = (string_to_array(name, '/'))[1]
);
```

Test with curl/Supabase CLI:
```bash
# As user {uid1}, upload to own path:
supabase storage create --path "{uid1}/user.db" --bucket user-backups < ~/user.db

# Try to download as user {uid2}:
# Should 403 (RLS denied)
```

---

## Testing Strategy

### Unit Tests

**SupabaseBackupService:**
- Mock `supabaseClient.storage.from().upload()`
- Upload succeeds → no throw
- Upload fails (5xx) → SyncError + silent
- 401 auth missing → SyncError
- 403 RLS denied → SyncError + silent
- Download 404 → no file written (fresh schema)
- Download succeeds → file written

**ScheduleBackupUseCase:**
- First call → backup triggered
- Second call < 6h → skipped
- Second call > 6h → triggered
- Offline error → `last_backup_ms` not updated
- Analytics events fired

**RestoreBackupUseCase:**
- Local file exists + > 512 bytes → skip restore
- Local file missing → download + restore
- No remote backup (404) → empty schema
- Download error → silent + empty schema

### Integration Tests

(Defer to mobile/BACKUP_INTEGRATION.md)
- Real Supabase Storage (test bucket) + auth
- Fresh install → sign in → restore from backup → db opens + migrates
- Manual restore from Settings → works + UI updates

### End-to-End (Manual)

1. Device A: sign in, take a quiz, verify backup triggered (check last_backup_ms)
2. Device B: fresh install, sign in with same account → verify db restored (progress visible)
3. Offline device → backup skipped (no error)
4. Device A: Settings → manual restore → verify works

---

## Sequence & Dependencies

```
AU1 (Supabase Auth schema)
  ↓
AU2 (SupabaseAuthService + session persist)
  ↓
BK1 (Storage bucket + RLS)
BK1.1 (SupabaseBackupService)
  ↓
BK1.2 (Periodic trigger + pref storage)
  ↓
BK2 (Restore + hydration gate)
```

**Critical path:** AU2 → BK1.1 → BK1.2, then BK2 in parallel (both depend on BK1.1).

---

## Known Risks

1. **Hydration gate ordering** — if migrations run before restore, you hydrate an empty schema then clobber it with the backup. **Must gate: restore → openDatabase → migrations.**

2. **Supabase API rate limits** — Storage API is generous, but under heavy load (cohort uploading simultaneously) may throttle. **Mitigation:** exponential backoff + silent fail (no retry loop).

3. **Large backup size** — user.db grows over time (quiz attempts, SRS state). **Constraint:** keep size < ~100MB (Supabase Storage soft limit). **Not an issue for Phase 3** (small cohorts); monitor on scaling.

4. **RLS policy debugging** — if path-parsing fails or uid extraction is wrong, all users get 403. **Test early in BK1** with curl + known UIDs.

5. **Device-switch UX** — user signs in on Device B and gets a 5+ second restore delay (network + file I/O). **Acceptable for Phase 3** (low-volume, not a UI blocker). **Future:** show a "Restoring progress…" screen (P4).

6. **Expired auth tokens** — if user's session is revoked between backup upload + completion, the file remains (idempotent, not harmful). **Not a risk.**

---

## Implementation Checklist

- [ ] **BK1:** Create `user-backups` bucket in Supabase
- [ ] **BK1:** Create RLS policy (test with curl + known UIDs)
- [ ] **BK1.1:** Write `BackupPort` + `SupabaseBackupService` + tests
- [ ] **BK1.1:** Register in container
- [ ] **BK1.2:** Write `ScheduleBackupUseCase` + tests
- [ ] **BK1.2:** Add migration 004 (last_backup_ms)
- [ ] **BK1.2:** Hook quiz completion + app foreground
- [ ] **BK1.2:** Add analytics events
- [ ] **BK2:** Write `RestoreBackupUseCase` + tests
- [ ] **BK2:** Add hydration gate to `database.ts` (CRITICAL)
- [ ] **BK2:** Add manual restore to Settings
- [ ] **BK2:** Integration test on real Supabase + devices
- [ ] **Integration:** Verify `npm run check` passes (all new tests)
- [ ] **Commit:** "feat(p3-bk1-bk2): encrypted backup (upload + restore, RLS-scoped)"
- [ ] **Update RELEASE_PLAN.md:** Mark BK1/BK2 complete

---

## Acceptance Criteria (P3 Beta)

1. ✓ BK1 bucket + RLS configured (manual verification)
2. ✓ BK1.1 + BK1.2 coded + 100% test coverage (unit)
3. ✓ Backup triggered after quiz + periodic (6h)
4. ✓ `npm run check` green (mobile: 155+ tests including BK tests)
5. ✓ Device A → Device B restore flow works (manual E2E, real Supabase)
6. ✓ Offline graceful degrade (no errors, analytics logged)
7. ✓ RLS enforced (cross-user attempt → 403, verified with curl)
8. ✓ Commit pushed to `master`

---

*Last updated: 2026-05-31*
