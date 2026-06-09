---
name: restore-staging-fix
description: Settings restore corruption fix — stage-to-disk + apply-at-boot (option c), never overwrites the live user.db
metadata:
  type: project
---

# Settings "Restore from backup" — stale-page corruption fixed (option c, 2026-06-01)

**Bug (medium, found by adversarial review):** Settings `forceRestore` called `backupService.restore()` AFTER `openDatabase()` (boot) → `FileSystem.writeAsStringAsync` overwrote the **live** `user.db` while the SQLite connection was still open. The open connection's stale in-memory page cache → (1) reads serve pre-restore pages until restart, (2) a subsequent WRITE (quiz/onboarding) flushes stale pages over the freshly-restored file = data loss/corruption. Relied on a manual restart that nothing enforced. Boot-time BK2 restore was always SAFE (no open connection yet).

**Correction baked into the fix:** expo-sqlite here uses the **default DELETE rollback journal**, NOT WAL — there are no `-wal`/`-shm` sidecars. The failure mode is the in-memory page cache, not sidecar files. Any "delete the WAL sidecars" fix would be solving a non-existent problem.

## Fix = option (c): stage + flag + apply-at-boot (Ryan's call: "whichever best in the long run")

Routes Settings restore back through the SAME safe seam the BK2 boot gate already uses (write file → THEN `openDatabase()`). Correct-by-construction: the live `user.db` is **provably never written under an open connection**.

- `BackupPort.stageRestore(userId)` — new port method. Downloads remote backup to a **staging** file (`SQLite/user.db.restore-pending`), beside `user.db`, NEVER over it. (`restore()` kept for the boot gate — writes `user.db` directly, safe pre-`openDatabase()`.)
- `AsyncStorageAdapter.{get,set,clear}PendingRestore()` — boolean flag `lexitap.backup.restorePending` (touches high-risk `infrastructure/storage/`; Ryan-authorized via option c). Added to container `ASYNC_STORAGE_KEYS` (wiped on account delete).
- `container.applyPendingRestore(effects)` — runs in `createContainer()` BEFORE the BK2 gate + `openDatabase()`. If flag set + staging file exists → `deleteAsync(user.db)` + `moveAsync(staging → user.db)` → clear flag. **Flag cleared LAST** → crash mid-apply retries next boot (idempotent, no lost restore). Stale flag w/ missing staging → clear + boot normally.
- Pure logic in `infrastructure/backup/pendingRestore.ts` over an injected effects port (mirrors `contentDbInstall` pattern) → unit-testable w/o native modules. Container wires real FileSystem/AsyncStorage effects.
- `infrastructure/backup/userDbPath.ts` — NEW single source of truth for `userDbFileUri()` + `stagingDbFileUri()`. Killed the duplicated `${docDir}SQLite/user.db` literal in container BK2 gate + SupabaseBackupService (drift prevention).
- `forceRestore()` now: `stageRestore` → on ok `setPendingRestore()` → return 'ok' (live DB untouched). Settings copy updated: confirm = "...the next time you open the app"; success = "Backup downloaded. Quit and reopen LexiTap to finish restoring..." (was the misleading "Restore complete").

**Why not (a)/(b):** (b) close+reopen `DatabaseHandle` (no `close()` exists → high-risk `infrastructure/db/`) + hot-swap the whole container graph into React context + quiesce writes = heaviest, fragile, throwaway. (a) `expo-updates` `Updates.reloadAsync()` is safe-by-LUCK (writes live then reloads; if reload fails its failure mode REINTRODUCES this bug) + native dep + new build. (c) is the **permanent foundation** — when (a) is later added for instant-apply, (c) STAYS (reload just makes the staged restore apply without manual restart). Never redone.

## Trade-off accepted: restore applies on NEXT app launch (not instant)

Live DB stays authoritative until the user fully quits + reopens; staged file applied cleanly at boot. Matches the UX the old code ALREADY required ("restart the app") — but now SAFE instead of corrupting. Acceptance ("zero stale-page write-back") fully met.

## DEFERRED follow-up (NOT done — needs a native build): instant-apply via expo-updates

Add `expo-updates`, call `Updates.reloadAsync()` in `forceRestore` right after `setPendingRestore()` → boot applies staged file immediately, no manual restart. `expo-updates` is absent today (confirmed) → NATIVE dep + new build (touches `app.config.ts`), and is needed anyway for the EAS-Update OTA release strategy in CLAUDE.md. Land it in the already-scheduled pre-submission native build (with AU2/AU3) where `reloadAsync` can be device-verified. The (c) staging+flag+boot-apply is the layer it sits on — already shipped + safe with manual-restart UX until then.

## Verification

✅ **`cd mobile && npm run check` GREEN (exit 0): 46 suites / 455 tests pass, lint + tsc clean.** Added 13 tests: `pendingRestore.test.ts` ×5 (pure boot-apply incl. crash-safe clear-last ordering + stale-flag), `AsyncStorageAdapter.test.ts` ×4 (flag get/set/clear), `SupabaseBackupService.test.ts` stageRestore ×4 (writes STAGING path not live; 404/not_configured/never-throws).

⚠️ **Concurrent-session hazard (repeated, but resolved).** A **concurrent session** was building DIAG-A (adaptive diagnostic / pseudo-words) in the SAME working tree — it edited `container.ts` mid-session (added `pseudoWords`/`runAdaptiveDiagnostic` interleaved with my restore hunks) and briefly left 3 tsc errors that made the whole-project check transiently red; it fixed them before final verification (check now green). **Did NOT commit** — `container.ts` carries BOTH features' uncommitted hunks, so `git add -A`/`commit -a` would entangle their work under a restore-fix message (the exact past failure mode). Commit must be sequenced/split with that session; my full change set is enumerated above for clean recovery.

## How to apply

If a user reports "I restored from backup but my old data is back / progress got mangled": confirm they fully quit+reopened (current UX requires it). If instant-apply is wanted, ship the deferred expo-updates `reloadAsync` follow-up. The corruption path is closed — `forceRestore` no longer writes the live DB. See [[bk1-2-bk2-backup-implementation]] for the original BK1.2/BK2 backup wiring.
