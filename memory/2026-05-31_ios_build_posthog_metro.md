# iOS Build Green — PostHog Metro Resolution + Doctor Metro False-Positive (2026-05-31)

**First successful EAS iOS build.** Fixed the bundling blocker, build `0324f457` finished green, `words.db` (57.3 kB) ships in the bundle. **C0 not yet closed** — on-device launch + non-zero word-count query is still the gate (build success ≠ device proof). Android on hold per Ryan.

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

## Open follow-ups
- **Close C0:** install build `0324f457` on the provisioned iPhone (UDID `…801E`), confirm dictionary loads with non-zero count.
- Push branch + PR for `6668a6d` (not yet pushed as of this note).
- Nativewind debt / reanimated-4 collapse — device-validated, separate task.
- Unrelated pre-existing: PostHog US→EU host bug (`PostHogAnalyticsService.ts:12`), A6 opt-out toggle — see [[2026-05-31_analytics_posthog_policy]].
