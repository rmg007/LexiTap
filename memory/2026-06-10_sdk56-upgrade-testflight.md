# Session: Expo SDK 52 → 56 upgrade + TestFlight submission (2026-06-10)

**Outcome:** App SUBMITTED to TestFlight. Build `9bf46ff6` (Expo SDK 56 / RN 0.85 / React 19, version 0.1.0 build 2) compiled under Xcode 26 and was accepted by App Store Connect (submission `74f46a21`). Commit `556606c`.

## The cascade (BETA-1 → forced SDK upgrade)

Started as "push the build to TestFlight." Hit three walls in order:

1. **`--profile preview` is ad-hoc, ASC rejects it.** preview = `distribution: internal` (ad-hoc signed). TestFlight needs `distribution: store`. Added a `beta` submit profile to `mobile/eas.json` (`submit.beta.ios.ascAppId = 6775245619`). **Rule: TestFlight/App Store submits use the `beta` (store) profile, never `preview`.**
2. **ASC API key expired (401 NOT_AUTHORIZED).** Old key `YLG2BU44NG` was dead. Generated new key `PL3GWRNB7B` via `eas credentials --platform ios` → App Store Connect → Manage API Key → Add new. (App Store Connect → Users and Access → Integrations → generate, role App Manager, download .p8.)
3. **Apple error 90725: must build with iOS 26 SDK.** This is the real one. Expo SDK 52 (RN 0.76) cannot compile under Xcode 26 — Clang rejects RN's bundled `fmt` (`call to consteval function ... is not a constant expression` in RCT-Folly). A band-aid config plugin forcing `FMT_USE_CONSTEVAL=0` did NOT help (errored same way). **SDK 52 + Xcode 26 is a dead end.** Ryan chose the durable fix: upgrade SDK.

## The SDK 52 → 56 migration (the bulk of the work)

`npx expo install expo@^56` then `npx expo install --fix`, then hand-fix the rest. Key versions: **expo 56, RN 0.85.3, react 19.2.3, reanimated 4.3.1 (+ react-native-worklets 0.8.3 as a DIRECT dep — expo-doctor flags it otherwise: "may crash outside Expo Go"), @sentry/react-native ~7.11, jest-expo ~56, @testing-library/react-native ^14, react-test-renderer 19.2.3, typescript ~6, @babel/core ^7.29, babel-preset-expo ~56.0.14 (DIRECT dep — no longer hoisted from expo's nested node_modules; babel/jest can't resolve it otherwise).**

Gotchas, each cost a debug loop:

- **ERESOLVE on clean installs:** transitive `react-dom@19.2.7` wants react 19.2.7 exact vs pinned 19.2.3 → `overrides: { "react-dom": "19.2.3" }`. Also delete `node_modules` + lockfile for a true clean install; incremental `expo install --fix` ERESOLVEs on a dirty tree.
- **metro.config.js:** deleted the entire SDK-52 `resolveRequest`/`extraNodeModules` shim (nativewind dual-React/nested-RN-Flow + posthog `@posthog/core/*` subpaths). All obsolete on SDK 56: nativewind no longer nests its own RN/react, and Metro sets `unstable_enablePackageExports = true` by default. `scripts/patch-nativewind.js` likewise obsolete (deleted, postinstall removed).
- **babel.config.js:** reanimated 4 split its babel plugin out → `react-native-worklets/plugin` (not `react-native-reanimated/plugin`), still must be last.
- **jest worklets crash:** `WorkletsError: Native part of Worklets doesn't seem to be initialized` at import. react-native-worklets ships `jest/resolver.js` that strips the `native` extension, but jest-expo already sets the `@react-native/jest-preset` resolver and jest allows only one. Fix = **`mobile/jest-resolver.js`**: apply worklets' extension-stripping then delegate to the RN preset resolver; wire via `resolver` in jest.config.js.
- **expo-file-system:** classic sync API (`documentDirectory`, etc.) moved to `expo-file-system/legacy` in SDK 54+. `contentDb.ts` + `userDbPath.ts` import from `/legacy`; the backup test must `jest.mock('expo-file-system/legacy', ...)` too (not just the main module).
- **tsconfig:** TS6 deprecates `baseUrl` → drop it (paths resolve relative to tsconfig); `moduleResolution: bundler` base stopped auto-including ambient jest globals → add `types: ["jest","node"]`.
- **ThemeProvider:** RN 0.85 widened `useColorScheme()` to include `'unspecified'` → narrow explicitly to 'light'|'dark' else fallback.

## RTL 14 + React 19 test migration (the long tail — many debug loops)

- **`render()` is async now** (React 19 async act) → every render test must `await render(...)` / `await renderWithProviders(...)`; helpers that wrap render become async and all callers await.
- **`UNSAFE_*ByType` queries removed.** For the no-TextInput passive-recognition invariant, use the new test-renderer `root.queryAll((node) => node.type === 'TextInput')` (probed the host-type string = `'TextInput'`). `isHostTextInput` exists internally but isn't exported.
- **React 19 defers onPress-driven setState** → firing two dependent `fireEvent`s back-to-back (select option, then Submit) sees stale state and the second no-ops. Fix = a `selectOption` helper that presses then `await waitFor(... accessibilityState.selected === true)` before the next interaction. **Production is fine** (taps land on separate ticks); it's purely a back-to-back-fireEvent test artifact.
- **Age-gate year picker:** the deferred picker-open toggle is NOT observed by `waitFor`'s act-wrapped polling (re-reading an existing element's prop), but a raw real-timer tick flushes it. Helper `flushDeferred = () => new Promise(r => setTimeout(r, 50))` after the toggle press. Bizarre asymmetry: the same test passed in isolation but failed in-suite — burned a lot of time bisecting; the real-timer flush is the robust fix.

Final: `mobile npm run check` = **51 suites / 479 tests green**, `expo-doctor` **21/21**.

## Still Ryan's to do
- TestFlight processing finishes (Apple email) → App Store Connect → TestFlight → Internal Testing → add testers (BETA-1 tail).
- Unchanged blockers: CONTENT-2 paid enrichment, RC-1 RevenueCat accounts, AUTH-1 native sign-in.
