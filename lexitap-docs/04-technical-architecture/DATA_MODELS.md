---
title: Data Models and Domain Entities
category: technical
status: active
updated: 2026-05-24
priority: P1
tags: [data-models, domain, typescript, entities, repositories, ports, mapping]
---

# Data Models and Domain Entities

The TypeScript domain types, repository interfaces (ports), and DB-row-to-domain mapping for LexiTap. These types live in `src/domain/` and carry no React/SQLite/network dependencies (see [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md#the-dependency-rule)). Column definitions are authoritative in [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md); this document is the in-memory shape.

## Table of Contents

- [Conventions](#conventions)
- [Vocabulary Types](#vocabulary-types)
- [Progress and SRS Types](#progress-and-srs-types)
- [Quiz Types](#quiz-types)
- [Entitlement Types](#entitlement-types)
- [Sync and Stats Types](#sync-and-stats-types)
- [Repository Interfaces (Ports)](#repository-interfaces-ports)
- [Row-to-Domain Mapping](#row-to-domain-mapping)
- [Open Questions](#open-questions)

---

## Conventions

- Timestamps are `number` (epoch ms, from JS `Date.now()`), matching SQLite `INTEGER`.
- JSON columns (`synonyms`, `antonyms`) are parsed into `string[]` at the mapping boundary, never stored as raw strings in domain objects.
- IDs are branded string types to prevent mixing (`WordId`, `TierId`, `SessionId`).
- No `any`; use `unknown` + guards. Named exports only.

```ts
export type WordId = string & { readonly __brand: 'WordId' };
export type TierId = string & { readonly __brand: 'TierId' };
export type SessionId = number & { readonly __brand: 'SessionId' };
```

## Vocabulary Types

```ts
export type WordType = 'vocabulary' | 'expression' | 'idiom' | 'phrasal_verb';
export type CefrLevel = 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export interface Word {
  id: WordId;
  word: string;                 // multi-word for idioms, e.g. "look up to"
  definition: string;
  tierId: TierId;
  pos?: string;
  cefrLevel?: CefrLevel;
  wordType: WordType;
  difficulty?: number;          // 1-5
  theme?: string;
  exampleSentence: string;      // contains exactly one "_" blank
  imagePath?: string;
  audioPath?: string;
  synonyms: string[];
  antonyms: string[];
  usageNotes?: string;
  isDeleted: boolean;           // derived from deleted_at !== null
}

export interface ContentTier {
  id: TierId;
  name: string;
  description?: string;
  isFree: boolean;
  priceUsd: number | null;
  sku: string | null;           // IAP product id
  wordCount: number;
  displayOrder: number;
  isActive: boolean;
}

// Word joined with the caller's progress (review queue shape)
export interface WordWithProgress {
  word: Word;
  progress: UserProgress;
}
```

## Progress and SRS Types

```ts
export type MasteryLevel = 0 | 1 | 2 | 3 | 4 | 5;
export type SchedulerVersion = 'v1-fixed' | (string & {});  // open for v2-fsrs

export interface UserProgress {
  wordId: WordId;
  masteryLevel: MasteryLevel;
  nextReviewDate: number;
  lastReviewedAt?: number;
  consecutiveCorrect: number;
  totalAttempts: number;
  totalCorrect: number;
  firstSeenAt?: number;
  schedulerVersion: SchedulerVersion;
}

// Pure scheduler port — domain logic, no I/O. v1-fixed implementation.
export interface Scheduler {
  readonly version: SchedulerVersion;
  next(input: { masteryLevel: MasteryLevel; isCorrect: boolean; now: number }):
    { masteryLevel: MasteryLevel; nextReviewDate: number };
}
```

`v1-fixed` intervals: `[1, 3, 7, 14, 30]` days indexed by new mastery; incorrect drops mastery by 1 (min 0) and schedules `now + 1 day`.

## Quiz Types

```ts
export type AssessmentType = 'multiple_choice' | 'drag_drop' | 'image_match' | 'classification';
export type QuizMode = 'review' | 'learn';

export interface QuizSession {
  id: SessionId;
  tierId: TierId;
  mode: QuizMode;
  words: Word[];
  currentIndex: number;
  correctCount: number;
  startedAt: number;
  completedAt?: number;
}

// Append-only review event (maps to quiz_attempts; never mutated)
export interface QuizAttempt {
  id: number;
  sessionId: SessionId;
  wordId: WordId;
  assessmentType: AssessmentType;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  answeredAt: number;
  timeToAnswerMs?: number;
  preMasteryLevel?: MasteryLevel;     // mastery before this attempt (replay)
  scheduledReviewDate?: number;       // schedule the scheduler set (replay)
  schedulerVersion?: SchedulerVersion;
}

export interface QuizResult {
  isCorrect: boolean;
  totalCorrect: number;
  isSessionComplete: boolean;
}
```

## Entitlement Types

```ts
export interface Entitlement {
  tierId: TierId;
  purchasedAt: number;
  expiresAt: number | null;   // null = permanent unlock, set = subscription / B2B seat expiry
  receiptToken?: string;
}

// Access decision is application-layer logic (Premium Pass unlocks all paid tiers)
export interface TierAccess {
  tierId: TierId;
  hasAccess: boolean;
  reason: 'free' | 'purchased' | 'premium_pass' | 'promo' | 'locked';
}
```

## Sync and Stats Types

Streak and freeze state is owned by `StreakState` (gamification domain); `UserStats` composes it with lifetime totals. See [../02-product-definition/SRS_FORGIVENESS_MECHANICS.md](../02-product-definition/SRS_FORGIVENESS_MECHANICS.md) for the freeze rules and [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md#user_stats-streak--forgiveness-state) for the persisted row.

```ts
// Pure streak/forgiveness state — a function of (state, today), no I/O.
export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  lastActivityLocalDate: number | null;  // YYYYMMDD in the user's IANA tz (civil date)
  freezeCount: number;                    // banked streak freezes
  freezesGrantedTotal: number;
}

export interface UserStats {
  streak: StreakState;
  totalSessions: number;
  totalWordsMastered: number;
}

export interface UserAccount {
  id: string;                  // UUID
  email: string;
  displayName?: string;
  authProvider: 'email' | 'google';
  timezone: string;            // IANA, AsyncStorage source of truth
}

export interface EventLogEntry {
  id: number;
  // Open string; only 'answer_recorded' is emitted today (others planned).
  eventType: 'answer_recorded' | 'session_completed' | 'tier_unlocked' | string;
  payload?: unknown;           // JSON-parsed
  occurredAt: number;
}
```

## Repository Interfaces (Ports)

Defined in `domain/`, implemented in `infrastructure/db/`. Use cases depend only on these interfaces.

```ts
export interface WordRepository {
  getWordsDueForReview(tierId: TierId, limit: number): Promise<WordWithProgress[]>;
  getNewWords(tierId: TierId, limit: number): Promise<Word[]>;     // active only (deleted_at IS NULL)
  getById(id: WordId): Promise<Word | null>;                       // unfiltered (history render)
}

export interface UserProgressRepository {
  get(wordId: WordId): Promise<UserProgress | null>;
  upsert(progress: UserProgress): Promise<void>;
  countDue(tierId: TierId, now: number): Promise<number>;
}

export interface QuizSessionRepository {
  save(session: QuizSession): Promise<SessionId>;
  complete(id: SessionId, completedAt: number): Promise<void>;
}

export interface QuizAttemptRepository {
  append(attempt: Omit<QuizAttempt, 'id'>): Promise<void>;          // INSERT only — never update/delete
}

export interface EntitlementRepository {
  getAll(): Promise<Entitlement[]>;
  upsert(e: Entitlement): Promise<void>;
}

export interface SyncService {
  pull(userId: string): Promise<void>;
  push(userId: string, sinceCursor: number): Promise<void>;
}
```

`QuizAttemptRepository` deliberately exposes only `append` — there is no update/delete, enforcing the append-only invariant at the type level.

## Row-to-Domain Mapping

Mapping happens at the infrastructure boundary. Domain objects never carry DB nullability quirks or raw JSON strings.

```ts
// infrastructure/db/mappers/wordMapper.ts
export function toWord(row: WordRow): Word {
  return {
    id: row.id as WordId,
    word: row.word,
    definition: row.definition,
    tierId: row.tier_id as TierId,
    pos: row.pos ?? undefined,
    cefrLevel: (row.cefr_level as CefrLevel) ?? undefined,
    wordType: (row.word_type ?? 'vocabulary') as WordType,
    difficulty: row.difficulty ?? undefined,
    theme: row.theme ?? undefined,
    exampleSentence: row.example_sentence,
    imagePath: row.image_path ?? undefined,
    audioPath: row.audio_path ?? undefined,
    synonyms: row.synonyms ? JSON.parse(row.synonyms) : [],
    antonyms: row.antonyms ? JSON.parse(row.antonyms) : [],
    usageNotes: row.usage_notes ?? undefined,
    isDeleted: row.deleted_at != null,
  };
}
```

Each table gets a `*Mapper.ts` with `toDomain` (and `toRow` for writable tables). Sync mirror rows map through the same domain types so cloud and local converge on one shape.

## Open Questions

- Whether to model `MasteryLevel` as a value object with behavior or keep it a numeric literal union (currently union; scheduler holds the transition logic).
- Branded ID types add ergonomic friction in tests; may relax to plain `string` if it proves noisy.
