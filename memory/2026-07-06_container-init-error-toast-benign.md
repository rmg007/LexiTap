# Progress-screen "Failed to initialize app container" toast — benign dev Fast-Refresh artifact, one real bug fixed

**Symptom (Ryan, screenshot):** Progress screen rendered fully with real data (Streak, Foundation Pack card), but a dev error toast sat at the bottom: `[lexitap:error] Failed to initialize app container ...`.

**Why this looked alarming:** [`app/_layout.tsx`](../mobile/app/_layout.tsx)'s boot gate is `ready = services !== null && ...` — if `createContainer()` had genuinely failed with no prior success, `services` stays `null` forever and the app is stuck on the splash spinner. It can never reach a fully-rendered Progress screen. So the toast and the working screen are, on the surface, contradictory.

## Root cause chain

1. **`_layout.tsx`'s `useEffect(() => { createContainer()... }, [])`** commit `f72d879` (same day, Design Level-Up session) *added* the font-loading `useFonts` hook + two new `useEffect`s to this component. Adding hooks changes the component's hook signature — React Fast Refresh cannot hot-patch a hook-signature change in place, so it forces a full **remount** of `RootLayout` on every subsequent save while iterating on that commit (not a soft re-render — cleanup runs, then a fresh mount).
2. A full remount re-runs the `[]`-dep effect, calling `createContainer()` again.
3. **`createContainer()` → `openDatabase()`** ([database.ts](../mobile/src/infrastructure/db/database.ts)) does `await db.execAsync(\`ATTACH DATABASE '${path}' AS contentdb\`)`. `expo-sqlite`'s connection registry lives in `node_modules`, which Fast Refresh does **not** reset — so a second `openDatabaseAsync(USER_DB_NAME)` call across a remount can return/reuse state tied to the *already-attached* `contentdb` alias. Re-running `ATTACH ... AS contentdb` on that state throws (SQLite: alias already in use). That's an independent-of-app-code collision that only exists because JS component state resets on remount while the native module's connection state does not.
4. **The actual code bug this exposed:** `_layout.tsx`'s effect used a `cancelled` flag correctly in the `.then` branch (`if (!cancelled) setServices(...)`) but **not** in the `.catch` branch — `.catch` unconditionally called `logger.error(...)` + `captureException(...)`. So when a remount's `createContainer()` attempt is superseded (its own cleanup already set `cancelled = true`) and *later* rejects (e.g. hitting the stale-ATTACH collision above), the doomed attempt still logs a scary toast and would report to Sentry in prod — even though a subsequent, live attempt already succeeded and populated `services` correctly. This is exactly what produced the screenshot: real data on screen (from the surviving attempt) + an error toast (from the superseded one, or a stale undismissed LogBox toast left over from an earlier point in the same edit-save-reload loop — Expo dev-client toasts don't auto-clear on a later successful render).

## Verdict: benign, dev-only

`app/_layout.tsx` mounts exactly once in a real (non-Fast-Refresh) app run — there is no code path that remounts the root component in production. The collision requires Fast Refresh forcing a remount while `node_modules`-owned native connection state survives across it. **Not prod-reachable** under normal operation.

## Fix shipped (both parts)

1. [`app/_layout.tsx`](../mobile/app/_layout.tsx) `.catch` branch now checks `cancelled` before logging/reporting, matching the `.then` branch — a superseded container-init attempt never surfaces a toast or a Sentry event once a newer attempt has taken over.
2. **Root cause itself fixed** (Ryan confirmed — guarded `infrastructure/db/` path, lift→edit→restore net-zero on `.claude/settings.json`'s deny list): [`database.ts`](../mobile/src/infrastructure/db/database.ts)'s `openDatabase()` now checks `PRAGMA database_list` for an existing `contentdb` alias before running `ATTACH DATABASE ... AS contentdb`. A repeat call (Fast-Refresh remount reusing the same cached native connection) is now a no-op instead of a thrown error — the collision described above can no longer happen at all, not just be silently swallowed.

`npm run check` green (68 suites / 617 tests) after both fixes.
