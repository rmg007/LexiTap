# AGENTS.md — LexiTap

LexiTap is a solo-founder, offline-first ESL vocabulary mobile app. Global ESL learners (non-native English speakers) only — American-student vocab is a separate future "USA Schools" product. Never blend audiences.

## Repo layout

| Path | What |
|------|------|
| `content-tool/` | Track A. Node + TS CLI that builds the bundled read-only `words.db`. |
| `mobile/` | Track B. Expo + React Native app. Source of truth = local SQLite. |
| `lexitap-docs/` | Full research/product documentation (8 categories). The single canonical doc layer. |
| `memory/ docs/ plans/` | Project memory, ADRs, and implementation plans. |

## Architecture (non-negotiable)

Hexagonal / clean. Dependencies point inward only:
`presentation -> application -> domain` and `infrastructure -> domain`.

- `domain/` — pure TS. NO imports from react, react-native, expo-sqlite, @supabase/*. SRS scheduling lives here.
- `application/` — use cases; entitlement/paywall logic here.
- `infrastructure/` — the ONLY place raw SQL and expo-sqlite/supabase/IAP imports live.
- `presentation/` — RN screens + the 4 assessment widgets. LexiTap-specific.

Two databases: `words.db` (read-only, bundled, built by Track A) + `user.db` (read-write, on device), joined via `ATTACH`. Cloud (Supabase) holds auth + content-error reports + encrypted `user.db` blob backups in Supabase Storage. Device is always authoritative; cloud is never queried for live state.

## Hard rules

- TypeScript strict; `noUncheckedIndexedAccess` on. No `any` (use `unknown` + guards).
- Named exports only. Absolute imports via `@/` → `src/*`. No `lodash`.
- No `TextInput` in `mobile/src/presentation/screens/QuizScreen.tsx`, any future `mobile/src/presentation/screens/quiz/`, or `mobile/src/presentation/components/assessments/` — passive recognition UX (tap/drag/match/classify) only.
- Parameterized SQL only, in named query functions under `infrastructure/db/`. Never interpolate.
- Active-word queries filter `deleted_at IS NULL`; history/replay queries deliberately do not.
- `quiz_attempts` and `event_log` are append-only — compensating inserts, never UPDATE/DELETE. `event_log` is scoped to the offline pending-writes buffer (e.g. `content_errors` awaiting sync), not a general analytics sink — wire to PostHog/Amplitude if analytics is needed.
- Every SRS write tags `scheduler_version`. SRS v1-fixed intervals: +1/3/7/14/30d by mastery 0-5.
- Streak boundaries evaluated in the user's IANA timezone, never UTC. No `new Date()` for streak comparison.
- Secrets: `.env` in dev, EAS secrets in prod. Never commit secrets or hardcode them. `OPENAI_API_KEY` (image-gen tooling) is dev/build-only — never bundled into mobile.
- RN/Expo conventions (lists, images, animation, styling, the `react`/Metro fragility): read [`mobile/EXPO_NOTES.md`](mobile/EXPO_NOTES.md) before touching rendering/styling. Notably: keep the `domain/index.ts` barrel (decided), `expo-image` not RN `Image`, FlashList for long lists, nativewind stays (unistyles rejected).
- Visual assets (designs, CSS, images, icons): follow [`scripts/README.md`](scripts/README.md) — right tool, canonical home, CRUD rules. Edit sources (SVG/tokens/Figma), regenerate derivatives. Final store icon + primary logo need Ryan's sign-off and ship as vectors (never AI-generated PNGs); everything else (og/marketing/content imagery) generate freely.
- Crash reporting (Sentry) imports live ONLY in `infrastructure/crash/`. Every event passes the `beforeSend`/`beforeBreadcrumb` PII scrub (fail-closed: scrub throws → drop event); never `Sentry.setUser` with email/id; drop `sync` + network breadcrumbs; no tracing/replay/screenshots. Env-gated by `EXPO_PUBLIC_SENTRY_DSN` (inert if unset).
- IAP port contract (2026-06-10): ONE port — domain `IapPort` (`@/domain/iap/IapPort`); the legacy `infrastructure/iap/IapService.ts` duplicate was deleted, never re-add it. `restorePurchases()` returns `null` = restore FAILED (unconfigured SDK/network) vs `[]` = succeeded-and-owns-nothing — UI must never show "no purchases found" for `null` (a fallback value that overlaps a legitimate result hides failures). `logIn`/`logOut` resolve booleans, never throw; the container's alias dedup (`syncIapIdentity`) commits `lastAliasedUserId` only on success so failures stay retryable; RevenueCat `LOG_OUT_ANONYMOUS_USER_ERROR` counts as logOut success. The `react-native-purchases` jest mock's `PURCHASES_ERROR_CODE` values must mirror the REAL SDK enum (`@revenuecat/purchases-typescript-internal/dist/errors.d.ts`) — they had silently diverged.
- Native sign-in (AUTH-1): `cancelled` AuthErrorKind = user dismissed the OS sheet → UI shows NO error; `unavailable` → hide the entry point. Do NOT route non-OTP auth failures through the shared `mapError` 4xx branch — it emits "That code is invalid or has expired." (the trap `deleteAccount` and `signInWithIdToken` both dodge explicitly). The native `AppleAuthenticationButton` has no `disabled` prop — gate via wrapper `pointerEvents` + a self-guarding handler.
- Restoring a backup must NEVER overwrite the live `user.db` while the SQLite connection is open — the open connection's stale page cache can flush over the restored file (data loss/corruption). expo-sqlite here uses the default DELETE journal (no `-wal`/`-shm` sidecars). Two restore seams: `BackupPort.restore` writes `user.db` directly and is safe ONLY before `openDatabase()` (the BK2 boot hydration gate). After boot (the Settings "restore from backup" flow) use `BackupPort.stageRestore` → downloads to a staging file beside `user.db` + arm `AsyncStorageAdapter.setPendingRestore()`; `container.applyPendingRestore()` promotes the staged file at the NEXT launch, before `openDatabase()`. Single source of truth for both paths: `infrastructure/backup/userDbPath.ts`.

## content-tool invariants

- **Input format is JSONL, not CSV. Do not import from CSV files.** `data/input/words_master.jsonl` is the single source of truth (one JSON object per line, one word per line). The legacy per-tier CSV files (`foundation.csv`, `toefl.csv`, etc.) are superseded and must not be used as import sources. They live in `data/input/archive/` for reference only. See [`plans/CONTENT_PIPELINE_JSONL_PLAN.md`](plans/CONTENT_PIPELINE_JSONL_PLAN.md).
- **`categories` array is the single place for CEFR level + tier membership.** Each word has `"categories": ["B2", "foundation", "toefl"]`. The import pipeline routes CEFR values (A1/A2/B1/B2/C1/C2) → `words.cefr_level` and all other slugs → `word_tiers`. Never set `cefr_level` directly on a word object; never use a separate `tiers` field.
- **`reviewed` is a first-class field on every word.** `words.reviewed INTEGER DEFAULT 0` in the DB; `"reviewed": false` in JSONL. It is Ryan's QA flag (set true after definition/senses/questions/audio are checked). Never omit it; never strip it during import/export.
- **Senses live inside the master JSONL, not in a separate file.** `"senses": []` for un-enriched words. The enrichment run writes senses back in-place. `ingest-senses` as a separate command is merged into `import` — do not resurrect it as a standalone step.
- **2,848 foundation words is the current scope — do not add new words without Ryan's approval.** Seeding is expensive (explanation + examples per sense + ~20–30 quiz questions + audio). Adding words before existing ones are fully seeded dilutes the effort.
- **`loadSenses` / `loadSenseExamples` must honour the tier filter.** Both functions accept an optional `tier?: string`; when set, they JOIN through `word_tiers` to return only senses/examples belonging to words in that tier. Passing `undefined` (no tier) returns all rows. Callers in `runValidate` must forward `options.tier`. Callers in `buildOutputDb` use the already-scoped `senses`/`senseExamples` vars and do NOT filter by tier again.
- **`buildOutputDb` must validate senses before writing the output DB.** After the existing `validateRows` + error check, call `validateSenseRows(senses, senseExamples, wordIds, { strict })` and throw on errors. Malformed senses must never silently ship.
- **`ingest-senses` must check word_id existence before writing.** FK constraints are disabled (`PRAGMA foreign_keys = OFF` in `openWorkingDb`). Add an explicit `SELECT 1 FROM words WHERE id = ? AND deleted_at IS NULL` guard inside the transaction and throw a descriptive error if the word is absent. Orphan senses are silent data corruption.
- **`INSERT_SENSE` / `INSERT_EXAMPLE` must be plain `INSERT`, no `ON CONFLICT`.** The ingest transaction does a clean-slate delete before inserting, so no conflict can occur. Dead `ON CONFLICT DO UPDATE` clauses are misleading and mask logic errors — remove them.
- **S6 is subsumed by S2 — do not add it back.** S2's contiguity loop at `i === 0` already catches `sense_index !== 0`. A separate S6 check fires twice for the same row. The S2 message at `i === 0` should read "senses must start at sense_index 0, found N" to be self-explanatory.
- **`isGlossStyle` regex must cover common dictionary-gloss openers beyond "word that/meaning".** Patterns like "a person who", "the act of", "the state of", "the quality of", "the type of" are also gloss style. The S8 warning is only useful if the regex is broad enough to catch common offenders.

## Done means

`npm run check` (lint + typecheck + test) passes in the affected project **— and would still pass in CI on a clean install.** Local green ≠ CI green.

- **Adding an import means adding a dependency.** When you `import` a package, it MUST land in that sub-project's `package.json` (`npm install --save …`, run *inside* `mobile/` or `content-tool/`). A package that exists only in local `node_modules` (hoisted / once-installed without `--save`) passes local `npm run check` but fails CI's clean `npm ci` with `Cannot find module …`. This is the repeated **"false-green-handoff"** failure mode — it stayed red & invisible for over a week (the missing `@anthropic-ai/sdk`, 2026-06-09).
- **Catch it before pushing:** `cd <subproject> && npm ls 2>&1 | grep -iE 'extraneous|UNMET|missing'` — any hit is a manifest gap. An empty result is the real "done".
- **CI runs on `main`** (`.github/workflows/ci.yml`, path-filtered to `mobile/**` / `content-tool/**`). After a push that touches those paths, confirm green: `gh run watch $(gh run list --workflow=ci.yml --branch main --limit 1 --json databaseId --jq '.[0].databaseId') --exit-status`. **A handoff that claims "tests pass" without CI confirmation is not trustworthy** — verify, don't assert.
- **If you rename or move anything a config file references** (branches, paths, script names), grep the repo for the old name and update it. The `master → main` rename silently broke CI for weeks because `ci.yml` still triggered on `[master]`.
- **Gitignored *generated* files are a CI failure class.** `mobile/expo-env.d.ts` (generated, gitignored per Expo convention) carries the CSS-module type declarations; without it `tsc --noEmit` fails TS2882 on `import '../global.css'` in every clean checkout. The committed twin `mobile/expo-types.d.ts` exists solely to fix this — **do not delete it.** This kept CI red from the SDK-56 upgrade (`556606c`) until `c188bb9`. General rule: **a workaround you need in a fresh worktree is a failure CI is already having** — check `gh run list` whenever a clean checkout needs manual setup.
- **Piping check output eats exit codes.** `npm run check | tail` reports exit 0 on a FAILED check (the pipeline's status is tail's). Use `set -o pipefail` (or no pipe) when the exit code is the verdict — a typecheck failure slipped past exactly this way (2026-06-10).
