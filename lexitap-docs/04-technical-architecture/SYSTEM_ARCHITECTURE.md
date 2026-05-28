---
title: System Architecture
category: technical
status: active
updated: 2026-05-24
priority: P0
tags: [architecture, hexagonal, domain-driven, clean-architecture, layers, offline-first, two-db, app-agnostic]
---

# System Architecture

This is the comprehensive architecture reference for LexiTap: the dependency rule, the two-database strategy, the offline-first data flow, and the app-agnostic design constraint. The operating-level summary used during day-to-day coding (folder structure per layer, banned constructs) lives in [../05-engineering-process/CODING_STANDARDS.md](../05-engineering-process/CODING_STANDARDS.md).

## Table of Contents

- [Goals and Constraints](#goals-and-constraints)
- [The Four Layers](#the-four-layers)
- [The Dependency Rule](#the-dependency-rule)
- [Source Layout](#source-layout)
- [Two-Database Strategy](#two-database-strategy)
- [Offline-First Data Flow](#offline-first-data-flow)
- [App-Agnostic Design](#app-agnostic-design)
- [Dependency Injection and Composition Root](#dependency-injection-and-composition-root)
- [Invariants](#invariants)
- [Open Questions](#open-questions)

---

## Goals and Constraints

LexiTap is a solo-founder, offline-first ESL vocabulary app. The architecture is optimized for three things, in priority order:

1. **Testable business logic** — the SRS scheduler, mastery scoring, and quiz orchestration must be unit-testable with zero React/SQLite/network dependencies.
2. **Offline-first correctness** — the local SQLite database is the source of truth. Cloud sync (Supabase) is a mirror, never an authority. Core features must work with the radio off.
3. **Reuse across future sister apps** — the domain and application layers are parameterized by `app_id` + tier slug so a future "USA Schools" product can reuse them without a rewrite. This is a *constraint on how we write code today*, not Phase 1 scope.

Hard constraints that shape every decision: solo founder, ~$194 realistic Year-1 cash outlay, no backend server at MVP (Supabase managed services only), no `TextInput` in quiz flows.

## The Four Layers

```
┌─────────────────────────────────────────────────────────┐
│  presentation/   React Native UI, expo-router screens,    │
│                  assessment widgets, theme. LexiTap-only.  │
├─────────────────────────────────────────────────────────┤
│  application/    Use cases. Orchestrate domain entities    │
│                  through repository PORTS. App-agnostic.   │
├─────────────────────────────────────────────────────────┤
│  domain/         Pure business logic. SRS, mastery, quiz   │
│                  session. NO React, NO SQLite, NO network. │
├─────────────────────────────────────────────────────────┤
│  infrastructure/ ADAPTERS. SQLite repos, Supabase sync,    │
│                  IAP, storage. Implements domain ports.    │
└─────────────────────────────────────────────────────────┘
```

**domain/** — Entities and value objects with behavior: `QuizSession`, `SpacedRepetition`, `Word`, `MasteryLevel`. Defines repository *interfaces* (ports) such as `WordRepository`. Contains no imports from `react`, `react-native`, `expo-sqlite`, or `@supabase/*`. This rule is enforceable with an ESLint `no-restricted-imports` boundary check.

**application/** — Use cases that orchestrate the domain: `StartQuizUseCase`, `AnswerQuestionUseCase`, `UnlockTierUseCase`, `SyncProgressUseCase`. Depends only on domain entities and domain port interfaces — never on a concrete adapter. Paywall/entitlement decisions live here (per the Paywall Reviewer in [../05-engineering-process/CODING_STANDARDS.md](../05-engineering-process/CODING_STANDARDS.md)), not in `domain/` or `presentation/`. `UnlockTierUseCase` persists a **verified** entitlement; it does not perform receipt validation. It is called only after the IAP adapter/server confirms the receipt — receipt validation is infrastructure/external responsibility.

**infrastructure/** — Concrete adapters implementing domain ports: `SQLiteWordRepository`, `SupabaseSyncService`, `StubIapService` (real IAP vendor wiring is deferred — see the IAP decision ADR), `AsyncStorageAdapter`. This is the only layer allowed to import `expo-sqlite`, `@supabase/supabase-js`, and IAP libraries. IAP adapters (`StubIapService` at MVP, `RevenueCatIapService` in Phase 3) live in `infrastructure/iap/`; receipt validation calls to RevenueCat/server originate here. The application layer calls `UnlockTierUseCase` only after the IAP adapter reports a validated receipt.

**presentation/** — React Native screens and components, `expo-router` file-based navigation, the four assessment widgets (`MultipleChoice`, `DragDrop`, `ImageMatch`, `Classification`), theme/branding. LexiTap-specific; the layer most likely to be rewritten for a sister app.

## The Dependency Rule

Dependencies point **inward only**: `presentation → application → domain` and `infrastructure → domain` (infrastructure implements inward-facing ports). The domain layer depends on nothing. Concrete adapters are injected at the composition root; no inner layer ever names a concrete outer-layer class.

| Layer | May import from | May NOT import |
|-------|-----------------|----------------|
| domain | (nothing — pure TS) | react, react-native, expo-sqlite, supabase |
| application | domain | react, react-native, concrete adapters |
| infrastructure | domain | application, presentation |
| presentation | application, domain | infrastructure concretes (uses DI) |

## Source Layout

Mirrors [../05-engineering-process/CODING_STANDARDS.md](../05-engineering-process/CODING_STANDARDS.md). Imports use the `@/` absolute prefix; default exports are banned.

```
src/
├── domain/
│   ├── vocabulary/      # Word, WordType, ContentTier value objects
│   ├── quiz/            # QuizSession, QuizAttempt, assessment types
│   ├── srs/             # v1-fixed.ts scheduler (+ future v2-fsrs.ts)
│   ├── user/            # Entitlement, UserProgress entity
│   └── gamification/    # Streak, mastery aggregation
├── application/
│   ├── quiz/            # StartQuizUseCase, AnswerQuestionUseCase
│   ├── tier/            # UnlockTierUseCase, CheckAccessUseCase
│   └── user/            # SyncProgressUseCase
├── infrastructure/
│   ├── db/              # SQLite repos, migrations/, ATTACH wiring
│   ├── sync/            # Supabase push/pull
│   ├── iap/             # IAP adapter (StubIapService at MVP), receipt validation calls
│   └── storage/         # AsyncStorage wrapper (timezone, sync cursor)
├── presentation/
│   ├── screens/         # QuizScreen / future quiz routes = no TextInput
│   ├── components/      # assessments/ = no TextInput
│   └── theme/
├── composition/         # container.ts — DI composition root (binds ports → adapters)
└── config/              # tiers.ts (TIER_CONFIG), app.ts (app_id)
```

## Two-Database Strategy

LexiTap ships **two physically separate SQLite databases** opened via `expo-sqlite`:

| DB | Mode | Contents | Source |
|----|------|----------|--------|
| `words.db` | read-only, bundled | `content_tiers`, `words` (immutable content) | built by content CLI (Track A), shipped in app binary |
| `user.db` | read-write, on device | `user_progress`, `user_entitlements`, `quiz_sessions`, `quiz_attempts`, `event_log` | created/migrated on first launch |

Cross-database joins use `ATTACH DATABASE`:

```sql
-- words.db is opened as the main connection; attach the user DB
ATTACH DATABASE 'file:user.db' AS userdb;

SELECT w.*, p.mastery_level, p.next_review_date
FROM words w
JOIN userdb.user_progress p ON w.id = p.word_id
WHERE w.tier_id = ?
  AND w.deleted_at IS NULL          -- active-word filter (learn/review queue)
  AND p.next_review_date <= ?
ORDER BY p.next_review_date ASC
LIMIT ?;
```

**Why split?** (1) Content updates ship a fresh `words.db` without touching user progress. (2) The read-only content DB can be replaced wholesale on app update while `user.db` survives. (3) Clean ownership boundary: Track A (content CLI) owns `words.db`; the app owns `user.db`. See [../06-content-data/CONTENT_PIPELINE_ARCHITECTURE.md](../06-content-data/CONTENT_PIPELINE_ARCHITECTURE.md) for how `words.db` is produced, and [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) for the full schema.

On app update with a new content DB, the launch sequence checks `PRAGMA user_version` on the bundled `words.db`, replaces the file if newer, and runs forward-only migrations on `user.db`. User data is never dropped.

## Canonical Authority Model

To prevent architecture drift and establish clear boundaries, LexiTap uses the following authority model. It clarifies which system owns the final "write permission" and which owns the offline "runtime source" by data class:

| Data Class | Runtime Source | Grant/Write Authority | Sync / Replay Rule |
|---|---|---|---|
| Bundled vocabulary content | `words.db` read-only | Content pipeline / shipped bundle | Replace content DB on versioned content update; never edits user DB |
| User progress / SRS | `user.db` | Local app domain/application logic | Cloud mirrors; last-write-wins by `last_reviewed_at`; append `quiz_attempts` for replay |
| Quiz attempts / event log | `user.db` append-only | Local app transaction | Never update/delete; compensating inserts only |
| Streak/freeze state | `user.db` | Local app, IANA civil date | Freeze fields are device-only per current schema/API docs; if synced later, needs explicit new decision |
| Verified paid entitlements | `user.db` for offline reads after grant | Store/RevenueCat/server-side validation for grant/revoke | Local row mirrors verified state; unverified local state must not unlock paid content |
| B2B/referral/promo entitlements | `user.db` for offline reads after grant | Supabase RPC / Edge Function / institutional backend | Review-sensitive; no in-app off-store steering |
| Account/auth data | Supabase Auth + `user_accounts` | Supabase Auth | Local device caches only what app needs |
| Analytics | `event_log` locally | Local app for functional events; off-device send obeys consent plan | Aggregate/off-device flow still needs final sink/consent decision |

Establishing this clear grid ensures that we never mistake local offline convenience caches for absolute verified authorities (e.g., in paid entitlements).

## Offline-First Data Flow

```
                         ┌──────────────────────────────┐
   App launch ──────────▶│ open words.db (RO, bundled)   │
                         │ open user.db (RW); migrate    │
                         │ ATTACH user.db AS userdb      │
                         └───────────────┬───────────────┘
                                         │
   Quiz / review (NEVER touches network) │
        StartQuizUseCase ────────────────▼
        getWordsDueForReview()  ──▶  SQLite (source of truth)
        AnswerQuestionUseCase:
          INSERT quiz_attempts (append-only, scheduler_version tagged)
          UPDATE user_progress (mastery, next_review_date)
          INSERT event_log (synchronous, same transaction)
                                         │
   On app open  ── pull ────────────────▼── Supabase user_progress_sync
   On app close ── push ─────────────────── (last-write-wins by last_reviewed_at)
                                            cloud is a MIRROR, not authority
```

The quiz/review path is 100% local. Sync runs opportunistically on app open (pull) and close (push), is transactional (all-or-nothing), and retries on next open if it fails. A user can be offline for weeks; progress accumulates locally and upserts cleanly on the next sync. Full sync semantics are in [API_CONTRACT.md](./API_CONTRACT.md) and [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md).

## App-Agnostic Design

The domain and application layers must not hardcode anything LexiTap-specific. Tier identity flows through configuration, not conditionals.

```ts
// src/config/app.ts
export const APP_ID = 'lexitap';   // 'usa-schools' for the sister app

// src/config/tiers.ts — configuration over conditionals
export const TIER_CONFIG = {
  foundation: { id: 'foundation', appId: 'lexitap', displayName: 'Foundation (CEFR A2-B1)', isFree: true },
  // ...
} as const;
```

**Banned:** `const name = appId === 'esl' ? 'Foundation' : 'Grade 6-8'`. **Required:** look up display strings, tier names, and CEFR/grade metadata from `TIER_CONFIG`. When the sister app is built, `src/domain/`, `src/application/`, and most of `src/infrastructure/` copy over unchanged; only `src/presentation/` and `src/config/` are rewritten. This is a constraint on Phase 1 code, **not** a Phase 1 deliverable — we do not build the sister app now.

Audience note: LexiTap targets global ESL learners (non-native English speakers) only. American-student vocabulary is the separate future "USA Schools" product. Do not blend the two audiences in any layer.

## Dependency Injection and Composition Root

Domain ports are bound to infrastructure adapters at a single composition root (`src/composition/container.ts`), invoked once at app bootstrap. Use cases receive repositories via constructor injection:

```ts
const wordRepo: WordRepository = new SQLiteWordRepository(db);     // prod
const startQuiz = new StartQuizUseCase(wordRepo, sessionRepo);
// tests swap in MockWordRepository — no SQLite, no Supabase
```

This is what lets domain tests run as pure unit tests and lets a future cloud-backed `WordRepository` slot in without changing use-case code.

## Invariants

1. No `TextInput` in quiz flows (`mobile/src/presentation/screens/QuizScreen.tsx`, any future `mobile/src/presentation/screens/quiz/`, and `mobile/src/presentation/components/assessments/`).
2. SQLite is the source of truth; cloud sync is a mirror.
3. Offline-first: no network in core learn/review features.
4. Content is bundled (`words.db` in the app binary).
5. `quiz_attempts` and `event_log` are append-only — insert compensating rows, never UPDATE/DELETE.
6. SRS state changes are version-tagged (`scheduler_version`) for safe future FSRS migration via replay.
7. Domain layer has zero React/SQLite/network imports (enforce via ESLint import boundaries).
8. The domain and application layers never perform receipt validation; that is infrastructure/external responsibility. `UnlockTierUseCase` is called only after the IAP adapter/server confirms the receipt; unverified local writes must not unlock paid content.

## Open Questions

- Exact ESLint rule set for enforcing layer import boundaries (candidate: `eslint-plugin-boundaries`) — not yet selected.
- Whether the composition root is hand-rolled or a lightweight DI lib — leaning hand-rolled to avoid a dependency at the current budget.
