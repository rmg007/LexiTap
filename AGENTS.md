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
- Secrets: `.env` in dev, EAS secrets in prod. Never commit secrets or hardcode them.

## Done means

`npm run check` (lint + typecheck + test) passes in the affected project.
