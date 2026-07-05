# E2E-1 re-run — stale simulator binary + local build playbook (2026-07-05)

E2E-1 was already green + synced (2026-07-04, commit `d84af32`). This session re-ran the flow on a fresh iOS 26.3 simulator after a context compaction. The test failed at `quiz-option-0` not found — even though the source at `mobile/src/presentation/components/assessments/MultipleChoice.tsx:134` has `testID={`quiz-option-${index}`}`.

## Root cause

The installed binary was from **2026-06-11** (app container timestamp `1781184231369`). The `testID` fix landed in commit `0fbba76` on **2026-07-04** — the binary predated the fix by 23 days. A fresh `expo run:ios` from `mobile/` rebuilt and reinstalled the binary; the test passed on the next run (exit 0, all steps COMPLETED).

## Local `expo run:ios` playbook

Run **from `mobile/`** (not repo root — root has no `expo` installed):

```bash
cd mobile
SENTRY_DISABLE_AUTO_UPLOAD=true npx expo run:ios \
  --device "2FBE3837-C047-4E1D-9A3E-849EEBFA0478" \
  --configuration Release \
  --no-bundler
```

- `SENTRY_DISABLE_AUTO_UPLOAD=true` is **required** — without it, sentry-cli tries to upload source maps and fails when the auth token is present (the same reason `eas.json` preview/beta profiles carry this flag). Build exits code 65 otherwise.
- `--configuration Release` — embeds the JS bundle; Maestro E2E requires no Metro server.
- `--no-bundler` — Metro already bundled before Xcode starts; avoids a second Metro process.
- UDID `2FBE3837-C047-4E1D-9A3E-849EEBFA0478` = iPhone 11 Pro Max, iOS 26.3.

## XCTest driver recovery

If `maestro test` hangs on "iOS driver not ready in time" after a prior crash:

```bash
# 1. Ensure sim is booted
xcrun simctl boot 2FBE3837-C047-4E1D-9A3E-849EEBFA0478

# 2. Uninstall the stale XCTest runner (forces Maestro to reinstall fresh)
xcrun simctl uninstall 2FBE3837-C047-4E1D-9A3E-849EEBFA0478 \
  "dev.mobile.maestro-driver-iosUITests.xctrunner"

# 3. Re-run with a generous startup timeout
MAESTRO_DRIVER_STARTUP_TIMEOUT=120000 maestro test \
  --udid 2FBE3837-C047-4E1D-9A3E-849EEBFA0478 \
  mobile/.maestro/learn-loop.yaml
```

## testmanagerd snapshot-timeout mitigation

The diagnostic `repeat: while: visible: "No, not yet"` makes 2 view-hierarchy fetches per iteration (condition check + tapOn). Without pacing, testmanagerd slows from 3s/iter → 34s/iter by tap 20, then crashes. `waitForAnimationToEnd` after each tap gives testmanagerd recovery time. `sleep` and `pause` are invalid Maestro 2.6.0 commands.

## Worktree litter (cannot reap automatically)

- `lexitap-e2e` / `e2e-run`: 1 commit not in main (`ab5ce34 fix(e2e): repair learn-loop.yaml selectors`) + stash `@{0}` (WIP on master). **Ryan: commit or drop the stash, then triage whether `ab5ce34` is superseded by the current `learn-loop.yaml`.**
- `feat/au1-bk1-consumer-wave`: 2 commits not in main, LOCAL-ONLY (not pushed). **Ryan: these are from the 2026-05-31 consumer-wave session — check if superseded by `590de22` (AUTH-1 code).**
