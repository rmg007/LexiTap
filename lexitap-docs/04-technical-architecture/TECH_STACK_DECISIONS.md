---
title: Tech Stack Decision Doc
category: technical
status: active
updated: 2026-05-24
priority: P0
tags: [tech-stack, decisions, rationale, react-native, expo, supabase, sqlite, typescript, eas, tts]
---

# Tech Stack Decision Doc

Each technology choice for LexiTap recorded as a decision record: the choice, the rationale, the alternatives rejected, and the consequences. These are locked decisions; revisit only via a new ADR. Operating stack summary lives in [../../notion-docs/AGENTS_MOBILE_CONVENTIONS.md](../../notion-docs/AGENTS_MOBILE_CONVENTIONS.md).

## Table of Contents

- [TSD-001 Expo (managed) over bare React Native](#tsd-001-expo-managed-over-bare-react-native)
- [TSD-002 TypeScript strict mode](#tsd-002-typescript-strict-mode)
- [TSD-003 expo-sqlite for local persistence](#tsd-003-expo-sqlite-for-local-persistence)
- [TSD-004 Supabase over Firebase](#tsd-004-supabase-over-firebase)
- [TSD-005 No backend server at MVP](#tsd-005-no-backend-server-at-mvp)
- [TSD-006 EAS Build and Submit](#tsd-006-eas-build-and-submit)
- [TSD-007 TTS provider deferred (audio launch-TOEFL only)](#tsd-007-tts-provider-deferred-audio-launch-toefl-only)
- [TSD-008 State and data libraries](#tsd-008-state-and-data-libraries)
- [Decision Summary Table](#decision-summary-table)

---

## TSD-001 Expo (managed) over bare React Native

**Decision:** React Native 0.73+ via **Expo SDK 50, managed workflow**, Hermes engine, npm.

**Rationale:** A solo founder cannot afford to maintain native iOS/Android toolchains. Expo managed gives OTA-friendly builds, `expo-router`, `expo-sqlite`, `expo-haptics`, and `expo-av` out of the box, and EAS Build removes the need for a local Mac/Xcode CI rig. Config plugins cover the few native needs (IAP).

**Alternatives rejected:**
- *Bare React Native* — full native control, but doubles maintenance surface and demands native build expertise. Rejected: not worth it at this scope.
- *Flutter* — strong, but Dart ecosystem restart and weaker SQLite/IAP story for our exact needs. Rejected.
- *Native Swift + Kotlin* — two codebases for a solo founder. Rejected outright.

**Consequences:** If we ever need a native module Expo can't config-plugin, we run `expo prebuild` (escape hatch) rather than rewriting. Acceptable.

## TSD-002 TypeScript strict mode

**Decision:** TypeScript 5.x, `strict: true`. `any` is banned (use `unknown` + type guards). Named exports only.

**Rationale:** The domain layer (SRS, mastery, entitlements) carries the app's correctness-critical logic. Strict typing + the [DATA_MODELS.md](./DATA_MODELS.md) domain types catch row-to-entity mapping errors at compile time. `tsc --noEmit` is part of `npm run check`.

**Alternatives rejected:** Plain JS (no compile-time safety for money/entitlement logic); loose TS (defeats the purpose).

**Consequences:** Slightly more upfront typing effort; large payoff in refactor safety, critical for a one-person team.

## TSD-003 expo-sqlite for local persistence

**Decision:** **expo-sqlite** for all structured local data. Two databases (`words.db` read-only bundled, `user.db` read-write) joined via `ATTACH DATABASE`. See [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md#two-database-strategy).

**Rationale:** Offline-first requires a real relational store. SRS queries (`next_review_date <= ?` ordered, limited) and tier joins are natural SQL. SQLite is embedded, zero-cost, and ships in the binary.

**Alternatives rejected:**
- *AsyncStorage for structured data* — explicitly banned in conventions; no querying, no joins, no indexes.
- *WatermelonDB / Realm* — heavier dependencies and opinions; raw SQLite + repository ports give us full control and easier future migration. Rejected for scope/budget.
- *MMKV* — great for key/value (we use AsyncStorage-style for the timezone + sync cursor) but not relational. Not a replacement for SQLite.

**Consequences:** We hand-write parameterized queries behind repository interfaces (no raw SQL in components). Migrations are forward-only via `PRAGMA user_version`.

## TSD-004 Supabase over Firebase

**Decision:** **Supabase** (Postgres + Auth + Storage + RPC) for cloud sync, auth, and the teacher/referral backend. Cloud sync is FREE for all users.

**Rationale:** Postgres + Row-Level Security maps cleanly to our per-user mirror tables (`user_progress_sync`, `user_entitlements_sync`, `user_stats_sync`) and the teacher/referral/promo relational data. Supabase Auth handles email + Google OAuth and password hashing. RLS lets us enforce "users see only their rows" without a server. Generous free tier fits the $144 budget. SQL backend means no second query dialect to learn.

**Alternatives rejected:**
- *Firebase/Firestore* — NoSQL document model is a poor fit for relational referral/commission data; vendor lock-in; RLS-equivalent (security rules) is harder to reason about for money flows. Rejected.
- *Self-hosted Postgres + custom API* — operational burden a solo founder cannot carry. Rejected (see TSD-005).
- *AWS Amplify* — heavier, more services to wire, easier to overspend. Rejected for budget.

**Consequences:** Sync is "dumb mirror, last-write-wins"; conflict policy documented in [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md). Security policy in [SECURITY_MODEL.md](./SECURITY_MODEL.md).

## TSD-005 No backend server at MVP

**Decision:** **No custom backend server** at MVP. All cloud logic runs on Supabase managed services: Postgres, Auth, RLS policies, and Postgres RPC functions / Edge Functions only where strictly needed (e.g., receipt validation, referral commission write).

**Rationale:** A solo founder with a $144/year budget cannot run, secure, patch, and monitor a server. The app is offline-first; the cloud's job is sync + auth + teacher backend, all of which Supabase covers declaratively. Pushing logic to RLS + RPC keeps the trust boundary inside Supabase.

**Alternatives rejected:** Node/Express on a VPS or serverless platform — unnecessary operational and cost surface for MVP. Revisit only if a feature genuinely cannot be expressed as RLS + RPC.

**Consequences:** Anything requiring a trusted secret (store receipt validation keys) runs in a Supabase Edge Function, never in the app. See [API_CONTRACT.md](./API_CONTRACT.md).

## TSD-006 EAS Build and Submit

**Decision:** **EAS Build** for cloud iOS/Android binaries and **EAS Submit** for store delivery. Secrets via `.env` in dev, **EAS secrets** in production.

**Rationale:** No local Xcode/Android CI needed; EAS builds signed binaries in the cloud and submits to App Store Connect / Google Play. EAS secrets keep production keys out of the repo and out of the binary. Matches the no-hardcoded-secrets rule.

**Alternatives rejected:** Local fastlane + self-managed signing (more setup, more secrets handling); Codemagic/Bitrise (extra cost). EAS is the path of least resistance for an Expo app.

**Consequences:** Build minutes count against budget; we batch builds and rely on the free/cheap tier. Apple Developer ($99) + Google Play ($25 one-time) are the dominant line items in the $144 budget.

## TSD-007 TTS provider deferred (audio launch-TOEFL only)

**Decision:** Audio pronunciation is **launch-TOEFL only**; the TTS provider choice is **deferred and made at the content layer**, not the app. The app just plays a bundled `assets/audio/{word_id}.mp3` if `audio_path` is set.

**Rationale:** Audio is generated offline by the content CLI (Track A) and bundled — not generated on-device, not fetched at runtime. So the provider is a content-pipeline cost decision, not an app architecture decision. Candidates from [../../notion-docs/CONTENT_PIPELINE_ARCHITECTURE.md](../../notion-docs/CONTENT_PIPELINE_ARCHITECTURE.md): Google Cloud TTS (~$10/600 words) vs ElevenLabs (~$50, higher quality).

**Alternatives rejected:** On-device TTS (`expo-speech`) — robotic, inconsistent across platforms, defeats the curated-quality goal. Runtime fetch — violates offline-first.

**Consequences:** No TTS dependency in the app binary. Provider chosen when TOEFL audio is enriched; re-evaluated per post-launch tier.

## TSD-008 State and data libraries

**Decision:** **TanStack Query v5** for server/async data; **Zustand** for global UI state; `expo-router` for navigation; `react-native-reanimated` v3 for animation; `expo-haptics` (subtle); `@expo/vector-icons`. Jest + `@testing-library/react-native` for tests.

**Rationale:** TanStack Query gives caching/retry/stale handling for the (sparse) sync calls; Zustand is a tiny, unopinionated global store. Both are well-supported in Expo and keep the dependency count low. `lodash` is banned in favor of native ES2023.

**Alternatives rejected:** Redux/Redux-Toolkit (boilerplate-heavy for our small global state); MobX (more magic than needed). Rejected for simplicity.

**Consequences:** Domain/application layers stay framework-free; these libraries live only in `presentation/` and `infrastructure/`.

## Decision Summary Table

| ID | Area | Choice | Top alternative rejected |
|----|------|--------|--------------------------|
| TSD-001 | Framework | Expo SDK 50 managed | Bare React Native |
| TSD-002 | Language | TypeScript 5.x strict | Plain JS |
| TSD-003 | Local DB | expo-sqlite (two-DB ATTACH) | AsyncStorage / WatermelonDB |
| TSD-004 | Cloud | Supabase | Firebase |
| TSD-005 | Server | None (managed only) | Custom Node backend |
| TSD-006 | Build/ship | EAS Build + Submit | Local fastlane |
| TSD-007 | Audio | Bundled MP3, TTS deferred | On-device TTS |
| TSD-008 | State/data | TanStack Query + Zustand | Redux |

## Open Questions

- Final TTS provider for TOEFL audio (Google Cloud TTS vs ElevenLabs) — decided at enrichment time.
- Whether to adopt `eslint-plugin-boundaries` to mechanically enforce the dependency rule (see [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md)).
