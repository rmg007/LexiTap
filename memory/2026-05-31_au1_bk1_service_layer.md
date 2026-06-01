# AU1 + BK1 Service Layer Landed (2026-05-31)

Phase-3 auth + backup **service layer** shipped as real, unit-tested code (NOT just plans). Built ahead of the Phase-2 beta gate by explicit user direction (content seeding + device test parked same session). Two parallel agents, disjoint dirs, committed-not-pushed, orchestrator integrated + pushed.

**State:** `origin/master` @ `9c3232a`. `npm run check` GREEN — 37 suites / 326 tests. Commits: `4539896` (BK1 backup) → `7fd0601` (AU1 auth) → `9c3232a` (barrel fix).

## What landed

**AU1 — Supabase magic-link (email OTP) auth** (`infrastructure/auth/`, `domain/auth/`)
- `AuthPort` (domain): `signInWithOtp / verifyOtp / signOut / getSession / onAuthStateChange`. Own `Result<T>` union + `ok/err`. Tagged `AuthError` (not_configured|network|invalid_otp|rate_limited|unknown).
- `SupabaseAuthService` (env-gated EXPO_PUBLIC_SUPABASE_URL/ANON_KEY), `StubAuthService`, `createAuthService` factory (mirrors `createAnalyticsService`). SecureStore token storage (`secureStoreAdapter.ts`); added dep `expo-secure-store@~14.0.1`.
- +30 tests. UI screens NOT built (follow-up).

**BK1 — Supabase Storage backup of user.db** (`infrastructure/backup/`, `domain/backup/`)
- `BackupPort`: `backupNow / restore / hasRemoteBackup` → `BackupResult` union, **silent-fail (never throws)**. Reasons: not_configured|offline|no_backup|server|unknown.
- `SupabaseBackupService` (reads user.db via expo-file-system → bucket `user-backups` key `${userId}/user.db`, upsert; 404→no_backup), `NoopBackupService`, `createBackupService` factory.
- `ScheduleBackupUseCase.shouldBackup(lastMs, nowMs)` — PURE, 6h throttle, `now` injected.
- +24 tests. Restore writes the file only — does NOT hot-swap the live DB (left to caller).

## ⚠️ Integration TODOs (next wave — DO NOT skip)

1. **SHARED AUTHENTICATED supabase client (RLS trap).** Each module currently makes its OWN client. Backup RLS scopes on `auth.uid()` — so backup MUST use auth's *authenticated* client/session, and callers MUST pass the Supabase user id as `userId`. Wire backup to receive auth's client. Naive wiring (backup's own anon client) → **backups silently fail RLS**.
2. **container.ts NOT wired.** No consumer yet → wiring left out deliberately (dangling = lint fail / dead code). Wiring lines (from agents):
   - `const auth = createAuthService();` (`@/infrastructure/auth`)
   - `const backupService = createBackupService();` (`@/infrastructure/backup/createBackupService`)
   - Expose on Services/ServicesContext when a screen consumes them.
3. **Two duplicated env seams** — `auth/supabaseEnv.ts` + `backup/backupEnv.ts` do the same read. Converge to ONE `infrastructure/supabase/env.ts`.
4. **Next wave = consumers:** sign-in screen + OTP-verify screen (AU1 UI), Settings "Back up now" + restore-on-fresh-install trigger (BK1), then wire container.

## Gotchas (hard-won, both agents hit independently)

- **babel-preset-expo INLINES `process.env.EXPO_PUBLIC_*` dot-reads to literals at build.** → Jest can't toggle the env-gate by mutating `process.env`; `delete` is rewritten to a no-op. Pattern used: dot-read (prod) + bracket-key fallback (Jest), isolated in a `*Env.ts` seam mocked via `jest.mock`. Services also accept injected url/anonKey (mirrors `PostHogAnalyticsService(apiKey)`). **Apply this to ALL future env-gated services.**
- **Concurrent-tree lesson (again):** both agents touched the shared barrel `domain/index.ts` despite disjoint-dir instructions → I had to reconcile (auth line survived, backup line dropped → re-added in `9c3232a`). RULE: assign shared barrel/registry files (`domain/index.ts`, `container.ts`) to a SINGLE owner, or let the orchestrator own them post-merge. node_modules-sharing makes git-worktree isolation impractical for this JS project → use strict explicit `git add <paths>`, no `-a/-A`, commit-not-push, orchestrator integrates.

## 🧑 Human action before backup works live
Create **private** Supabase bucket `user-backups` + RLS policies (per-user path scope `(storage.foldername(name))[1] = auth.uid()::text` for select/insert/update). Full SQL in BK1 agent report / `mobile/BACKUP_INTEGRATION.md`.
