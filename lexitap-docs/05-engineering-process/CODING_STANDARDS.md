---
title: Coding Standards and Style Guide
category: engineering-process
status: active
updated: 2026-05-24
priority: P1
tags: [coding-standards, typescript, naming, hexagonal, error-handling, sql, style]
---

# Coding Standards and Style Guide

Conventions for all TypeScript in LexiTap, across both the mobile app (Track B) and the content CLI (Track A). These expand the terse Style/Banned/Preferred sections of [../../notion-docs/AGENTS_MOBILE_CONVENTIONS.md](../../notion-docs/AGENTS_MOBILE_CONVENTIONS.md) into rules with rationale and examples. The architecture these rules serve is described in [../../notion-docs/ARCHITECTURE.md](../../notion-docs/ARCHITECTURE.md).

## Table of Contents

- [Language and Tooling](#language-and-tooling)
- [Naming](#naming)
- [Folder Structure per Hexagonal Layer](#folder-structure-per-hexagonal-layer)
- [No Raw SQL in Components](#no-raw-sql-in-components)
- [Error Handling at Boundaries](#error-handling-at-boundaries)
- [Imports and Exports](#imports-and-exports)
- [Comment Policy](#comment-policy)
- [Banned Constructs](#banned-constructs)

## Language and Tooling

- **TypeScript 5.x, strict mode on.** `strict: true` in `tsconfig.json` is non-negotiable. `noImplicitAny`, `strictNullChecks`, and `noUncheckedIndexedAccess` all enabled.
- **Formatter:** `prettier --write`. Run via `npm run format`.
- **Linter:** `eslint --fix`. Run via `npm run lint`.
- **Type checker:** `tsc --noEmit`. Run via `npm run typecheck`.
- **Combined gate:** `npm run check` runs lint + typecheck + test. This is what "done" means.

`package.json` scripts (target shape):

```json
{
  "scripts": {
    "format": "prettier --write \"src/**/*.{ts,tsx}\"",
    "lint": "eslint \"src/**/*.{ts,tsx}\"",
    "typecheck": "tsc --noEmit",
    "test": "jest",
    "check": "npm run lint && npm run typecheck && npm run test"
  }
}
```

## Naming

| Kind | Convention | Example |
|------|-----------|---------|
| Domain entity / class | PascalCase | `QuizSession`, `SpacedRepetition` |
| Use case (application) | PascalCase + `UseCase` suffix | `StartQuizUseCase` |
| Repository interface | PascalCase + `Repository` | `WordRepository` |
| Repository impl | impl prefix + interface | `SQLiteWordRepository`, `MockWordRepository` |
| React component | PascalCase | `QuizScreen`, `MultipleChoice` |
| Hook | `use` + PascalCase | `useSpacedRepetition`, `useQuizSession` |
| Named query function | verb phrase, camelCase | `getWordsDueForReview`, `insertQuizAttempt` |
| Constant config object | SCREAMING_SNAKE | `TIER_CONFIG` |
| File (class/component) | matches the export | `QuizSession.ts`, `QuizScreen.tsx` |
| Test file | source + `.test` | `QuizSession.test.ts` |

Domain vocabulary is fixed: use `tier`, `word`, `mastery_level`, `next_review_date`, `scheduler_version`, `quiz_attempts`, `event_log` exactly as the schema defines. Do not invent synonyms.

## Folder Structure per Hexagonal Layer

Dependencies point inward only: `presentation -> application -> domain`, and `infrastructure` implements interfaces declared in `domain`. The domain layer imports nothing from React, SQLite, or Expo.

```
src/
├── domain/               # Pure business logic. NO React, NO SQLite, NO Expo imports.
│   ├── vocabulary/       # Word, WordRepository (interface)
│   ├── quiz/             # QuizSession, QuizResult
│   ├── user/             # mastery, progress entities
│   └── gamification/     # streak rules
├── application/          # Use cases — orchestration only, no I/O details.
│   ├── quiz/             # StartQuizUseCase, AnswerQuestionUseCase
│   ├── tier/             # entitlement / paywall logic
│   └── user/
├── infrastructure/       # Concrete adapters. The ONLY place raw SQL lives.
│   ├── db/               # SQLite repositories + named query functions
│   ├── sync/             # Supabase cloud sync
│   ├── iap/              # in-app purchases
│   └── storage/          # AsyncStorage wrapper
├── presentation/         # React Native UI.
│   ├── screens/
│   ├── components/
│   └── theme/
└── config/               # TIER_CONFIG and other config-over-conditionals data.
```

**Layer rules, enforced by review (and ideally by an ESLint import-boundary rule):**

- `domain/` may import only from `domain/`.
- `application/` may import from `application/` and `domain/`.
- `presentation/` may import from `application/`, `domain/`, and `config/` — never directly from `infrastructure/db`.
- SRS scheduling logic lives in `domain/` (e.g. `src/srs/v1-fixed.ts`). Entitlement/paywall logic lives in `application/`.

**Configuration over conditionals.** Branching on a variant string (`variant === 'esl' ? ... : ...`) is banned. Drive behavior from `config/tiers.ts` so the codebase stays reusable for a future Schools app.

## No Raw SQL in Components

Raw SQL strings appear in exactly one place: named query functions inside `infrastructure/db/`. Components, hooks, use cases, and domain code never contain SQL.

**Banned:**

```tsx
// presentation/screens/quiz/QuizScreen.tsx — WRONG
const rows = await db.getAllAsync(`SELECT * FROM words WHERE tier_id = '${tierId}'`);
```

This is wrong three ways: SQL in the presentation layer, string interpolation (injection), and a missing `deleted_at IS NULL` filter.

**Correct — a named, parameterized query function:**

```tsx
// infrastructure/db/wordQueries.ts
export async function getWordsDueForReview(
  db: SQLiteDatabase,
  tierId: string,
  limit: number,
): Promise<WordRow[]> {
  return db.getAllAsync<WordRow>(
    `SELECT w.*, p.mastery_level
       FROM words w
       JOIN user_progress p ON w.id = p.word_id
      WHERE w.tier_id = ?
        AND w.deleted_at IS NULL
        AND p.next_review_date <= ?
      ORDER BY p.next_review_date ASC
      LIMIT ?`,
    [tierId, Date.now(), limit],
  );
}
```

Rules baked into every query function:

- **Parameterized only.** Values pass as `?` bindings, never string concatenation.
- **Active-word queries filter `deleted_at IS NULL`.** History/audit/replay queries deliberately do not — comment the exception inline.
- **Append-only tables** (`quiz_attempts`, `event_log`) get only `INSERT` functions. There is no `update*` or `delete*` for them; corrections are compensating inserts.
- **SRS writes tag `scheduler_version`.** The query function takes it as a parameter.

The repository class wraps these functions to satisfy the `domain/` interface, keeping the SQL behind the port.

## Error Handling at Boundaries

Errors are caught and translated at layer boundaries, not swallowed in the middle.

- **Domain layer** throws typed domain errors (`NoWordsAvailableError`, etc.) and never catches infrastructure errors — it does not know they exist.
- **Application layer** may catch infrastructure errors (a failed DB read, a sync timeout) and translate them into domain-meaningful outcomes or re-throw a typed error.
- **Infrastructure layer** wraps low-level failures (SQLite, network) and throws a typed error rather than letting a raw driver exception escape.
- **Presentation layer** is the only place a `try/catch` turns an error into UI. Quiz and review flows must degrade gracefully offline — a sync failure is a silent no-op, never a blocking error dialog (SQLite is the source of truth).

Define error types, do not throw strings:

```tsx
// domain/quiz/errors.ts
export class NoWordsAvailableError extends Error {
  constructor(public tierId: string, public mode: 'review' | 'learn') {
    super(`No ${mode} words available for tier ${tierId}`);
    this.name = 'NoWordsAvailableError';
  }
}
```

## Imports and Exports

- **Named exports only.** Default exports are banned — they defeat refactoring and IDE rename.
- **Absolute imports via `@/`.** Configure the `@/*` path alias to `src/*`. No deep relative chains like `../../../domain`.
- **No `lodash`.** Use native ES2023 methods.

## Comment Policy

- Comment *why*, not *what*. The code says what; a comment earns its place by explaining a non-obvious decision, an invariant, or an exception.
- Every deliberate deviation from a convention gets a one-line comment naming the reason (e.g. the un-filtered history query, an append-only compensating insert).
- No commented-out code in commits. Delete it; git remembers.
- TODO comments must reference a plan or ADR (`// TODO(plan-046): ...`), never dangle.

## Banned Constructs

From the operating-layer doc, enforced in review:

- `any` — use `unknown` plus type guards.
- `console.log` outside tests — use `src/lib/logger.ts`.
- Network requests inside quiz logic — the app must work offline.
- `react-native-async-storage` for *structured* data — use `expo-sqlite`. (AsyncStorage is fine for small key-value like `user.timezone`.)
- Default exports.
- `lodash`.
- `TextInput` in `src/screens/quiz/` or `src/components/assessments/`.
- `new Date()` for streak-boundary comparison — convert to stored `user.timezone` first.
