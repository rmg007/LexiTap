# iOS Build Green — PostHog Metro Resolution + Doctor Metro False-Positive (2026-05-31)

**C0 PROVEN on the iOS simulator** (app cold-launches, `words.db` ATTACHed, 43 rows queried, onboarding UI renders). Got there by fixing FOUR distinct bugs in sequence — one bundling, two runtime, plus a doctor false-positive. Android on hold per Ryan.

> ⚠️ **EAS build `0324f457` is STALE — do NOT device-test it.** It was built from the PostHog-fix commit only; it predates the dual-React and ATTACH fixes below, so it crashes/hangs on launch. A NEW standalone EAS build is required for the physical-device C0 confirmation. The dev-client path (`npm run ios`) already works and is what proved C0 on the sim.

> **Hard lesson (drove the `npm run smoke` harness):** `npm run check` was GREEN (155 tests) through ALL of these launch-blocking bugs. jest-expo doesn't render through css-interop's jsx-runtime (misses dual-React) and doesn't do on-device ATTACH (misses the DB bug). **"check green" and "build green" both lied. Only running the real app caught them** — run `npm run smoke` (or the sim) for anything that touches rendering, native modules, or the DB.

## The bug: `@posthog/core/surveys` unresolved → iOS bundling died

`posthog-react-native@4.46.3` imports `@posthog/core/surveys` — a package **`exports` subpath**. `@posthog/core@1.29.14` declares `./surveys` in its `exports` map, but **Metro on Expo SDK 52 does not follow `exports` subpaths**, so bundling failed: `Unable to resolve module @posthog/core/surveys`.

**Why it slipped past `npm run check`:** jest uses jest-expo's *own* resolver, which resolved the subpath fine → 155 tests green while EAS Metro bundling failed. **Lesson: `npm run check` green ≠ build green. For build-affecting changes, run `npx expo export --platform ios` locally** (≈15–40s, reproduces Metro bundling without a cloud build — matches the RELEASE_PLAN "iterate local, reserve cloud builds for uploads" budget rule).

## The fix (committed, branch `fix/ios-build-posthog-core-resolution`, commit `6668a6d`)

`mobile/metro.config.js` — added a scoped `resolveRequest` branch redirecting `@posthog/core/*` subpaths straight to dist files (`dist/<sub>/index.js`; `vendor/*` → `dist/vendor/*.js`). Sits alongside the existing nativewind RN-redirect branch.
- **`require.resolve('@posthog/core/dist/...')` does NOT work** — the `exports` field makes Node refuse deep paths (`ERR_PACKAGE_PATH_NOT_EXPORTED`). Resolve via absolute `path.join` instead.
- **Deliberately did NOT flip `unstable_enablePackageExports = true`** — that changes resolution for *every* package and risks destabilizing the fragile nativewind shim. Scoped redirect = surgical, predictable.
- Verified: `expo export` bundles 2298 modules clean; 155 tests still green; EAS build green.

## expo-doctor `metro@0.84.4` failure = BENIGN FALSE-POSITIVE — do not chase

Doctor's "native modules use compatible support package versions" check flags `metro`/`metro-resolver`/`metro-config@0.84.4` (expected `^0.81.0`). **It's a false positive:**
- **Root `metro` is `0.81.5`** (correct for SDK 52) — this is what Expo's bundler actually uses (`@expo/cli` → `@expo/metro-config@0.19.12` → root metro). That's why the build works.
- The `0.84.4` copies are **nested + unused**, inside nativewind@4.2.4's bundled `react-native@0.85.3` CLI toolchain (`@react-native/community-cli-plugin@0.85.3` → `@react-native/metro-config@0.85.3` → metro 0.84.4). Expo never invokes that toolchain.
- **EAS does not gate on doctor** — build `0324f457` went green with this check failing.

**Piecemeal npm `overrides` CANNOT fix it (proven empirically 2026-05-31):** forcing `metro`/`metro-resolver`/`metro-config → 0.81.5` cleaned the first two, but `metro-config@0.84.4` regenerated as a **peer** of `@react-native/metro-config@0.85.3` — and `@react-native/metro-config@0.81.5` *itself requires `metro-config@^0.83.1`*, so there's no clean version to pin to. The override only made the tree messier. **Reverted.**

**The only real fix** = collapse nativewind's entire nested RN-0.85/reanimated-4 universe (pin `react-native-reanimated`→root `3.16.1`, since css-interop's peer `>=3.6.2` is satisfied by it). That touches **runtime animation behavior** → passes CI but can break nativewind silently → **must be device-validated, as its own change, never bundled with C0.** This is part of the broader **nativewind@4.2.4-vs-SDK-52 debt** (also the cause of the `metro.config.js` RN-redirect shim + the `scripts/patch-nativewind.js` reanimated-v4 worklets patch). Right long-run play: a deliberate, device-validated nativewind/SDK upgrade — not more piecemeal patches.

## Runtime bug #1 — dual React → render crash (commit `3432117`)

Every screen died at startup with `Objects are not valid as a React child (found: object with keys {$$typeof, type, key, props, _owner, _store})` → black screen. **Two React copies in the bundle:** root `react@18.3.1` (pairs with RN 0.76.9) vs `nativewind/node_modules/react@19.2.6` (nativewind drags it in with RN 0.85). Babel compiles every `.tsx` with `jsxImportSource: react-native-css-interop`; css-interop's jsx-runtime imports `react/jsx-runtime`, which from nativewind's nested tree resolved to react@19 → elements stamped with a `$$typeof` symbol root react@18's reconciler rejects. No component is "wrong" — the element factory is, so every file reads clean.
- **Fix:** extended the existing `metro.config.js` nativewind `resolveRequest` shim (which already redirects `react-native`) to also redirect `react` + `react/*` from `NATIVEWIND_DEPS` origins → root react. Surgical; not `unstable_enablePackageExports`.
- **Same root cause as the metro-0.84.4 doctor noise** — both are the nativewind-4.2.4-vs-SDK-52 nested-RN-0.85 debt. A future nativewind/SDK upgrade should retire the whole shim (metro.config redirects + `patch-nativewind.js` + this).
- **Debugging note:** the error throws so early LogBox never mounts (black, no redbox), and expo-router's per-route boundary swallows it (neither a root class boundary NOR a `_layout` `ErrorBoundary` export caught it). Don't waste time on boundary tricks — the `{$$typeof,...}` child-object signature + `find node_modules -path '*/react/package.json'` showing two versions is the tell.

## Runtime bug #2 — bare-name ATTACH → the real C0 bug (commit `9c38fb0`)

After #1, the app hung on the splash spinner: `Failed to initialize app container … unable to open database: words.db`. `ATTACH DATABASE 'words.db'` (bare name) is handed straight to SQLite, which resolves a **relative path against the process CWD** (app-bundle root on iOS), NOT expo-sqlite's dir. `openDatabaseAsync('user.db')` works only because expo-sqlite resolves *names* to its managed dir internally; raw ATTACH does not. So the file was correctly installed at `<Documents>/SQLite/words.db` (both DBs verified in the same dir) yet ATTACH failed. **This is the C0 bug the release plan flagged but couldn't prove without a device.** The old `database.ts` comment ("expo-sqlite resolves the name against its SQLite directory") was the wrong assumption that created it.
- **Fix:** `contentDbAttachPath()` in `contentDb.ts` returns the install path minus the `file://` scheme; `database.ts` ATTACHes that absolute path. (Both deny-listed db/ files — edited with Ryan's explicit OK.)
- The absolute path is derived at runtime from `documentDirectory`, so it's correct on a real device too (`/var/mobile/...`), not just the sim.

## The smoke harness (commit `fcefa78`)

`npm run smoke` ([mobile/scripts/sim-smoke.sh](../mobile/scripts/sim-smoke.sh)): launches the app on the booted sim and asserts `words.db` is in the app container with `count(*) FROM words >= WORDS_MIN`. **Gap found:** it queries the DB *file* directly, so it PASSED (43 rows) even while the app was stuck on the spinner (container-init failed). It proves DB delivery, NOT that the app boots. Pair it with a screenshot and a Metro-log scan for `Failed to initialize|valid as a React child` to catch the render/init class. (A Maestro D2 flow with `assertVisible` would close this gap properly — still the recommended next harness layer.)

## Open follow-ups
- **NEW EAS build required** before any physical-device test — `0324f457` is stale (pre-fixes). Then close C0 on real hardware (iPhone `…801E`).
- **Close C0:** install build `0324f457` on the provisioned iPhone (UDID `…801E`), confirm dictionary loads with non-zero count.
- Push branch + PR for `6668a6d` (not yet pushed as of this note).
- Nativewind debt / reanimated-4 collapse — device-validated, separate task.
- Unrelated pre-existing: PostHog US→EU host bug (`PostHogAnalyticsService.ts:12`), A6 opt-out toggle — see [[2026-05-31_analytics_posthog_policy]].
