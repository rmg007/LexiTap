# Session: Pull-forward batch — RTL-1 + LEGAL-3 + STORE-1 (2026-06-10)

3 tasks run concurrently in isolated worktrees via Workflow, merged cleanly (octopus, no conflicts). 479 mobile / 165 content-tool — all green after merge.

## RTL-1 · Test-utils extraction ✅
`mobile/src/test-utils/learnFixtures.ts` — shared BATCH fixture, `makeWord`, `makeSession`, `TIER`. Pure data, no React.
`mobile/src/test-utils/renderWithProviders.tsx` — `renderWithProviders`, `defaultServices`, `assertNoTextInput`. ThemeProvider + ServicesProvider wrapping.
`__fixtures__/learnFixtures.tsx` gutted to a thin re-export shim (backward compat). All learn test files updated to import from `@/test-utils/`. Gaps 3+4 (multi-sense cards 2+3, feedback-phase invariant) were already closed by commit `85d36c9`. Commit: `4c14527`.

## LEGAL-3 · Account data export ✅
`mobile/src/domain/export/UserDataExportUseCase.ts` — pure domain, constructor-injected `ExportDataPort`. `execute(nowMs?)` → JSON string of all user learning data.
`mobile/src/domain/export/UserDataExportUseCase.test.ts` — 5 tests (happy path, stats=null, no progress, optional fields, error rejection).
`SettingsScreen.tsx` — "Export my data" button in Legal card above Delete Account → `Share.share()`. Naming note: `export/` dir avoided eslint `expo*` case-insensitive pattern; used `UserDataExport*`.
Wired into container, ServicesContext, mockServices. NO db/ or srs/ paths touched. Commit: `6fdfc07`.

## STORE-1 · Store assets draft ✅
`plans/STORE_ASSETS_PLAN.md` — App Name ("LexiTap: English Vocabulary"), iOS Subtitle ("TOEFL, IELTS & Exam Prep", 30 chars), Android short desc, ~780-word full description, 94-char iOS keyword string, 6-screen portrait screenshot spec, 15s App Preview storyboard.
Commit: `7b7b885`.

## Notes
- LEGAL-3: 2 render test timeouts seen in first run (pre-existing load-sensitive flakiness, confirmed pass with `--testTimeout=15000`)
- All three tasks were "pull-forward" — not on the critical path (BUILD-1 is still the gate) but reduce future work
- None of these advance the launch date; BUILD-1 remains the only gate for Phase 3+
