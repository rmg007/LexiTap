---
title: Testing Strategy
category: engineering-process
status: active
updated: 2026-05-24
priority: P1
tags: [testing, jest, unit-tests, mocked-repositories, srs-replay, content-validation, test-pyramid]
---

# Testing Strategy

How LexiTap is tested. The hexagonal architecture (see [../04-technical-architecture/SYSTEM_ARCHITECTURE.md](../04-technical-architecture/SYSTEM_ARCHITECTURE.md)) makes most of the high-value logic testable as pure functions with zero mocking, which is exactly where test effort concentrates. This doc defines the test pyramid, what each layer tests, what is deliberately left untested, and the two domain-specific test categories that protect LexiTap's riskiest surfaces: SRS replay and content validation.

## Table of Contents

- [The Pyramid](#the-pyramid)
- [Tooling](#tooling)
- [Domain Tests: Pure Unit](#domain-tests-pure-unit)
- [Application Tests: Mocked Repositories](#application-tests-mocked-repositories)
- [SRS Replay Testing](#srs-replay-testing)
- [Content Validation Tests](#content-validation-tests)
- [What NOT to Test](#what-not-to-test)
- [Definition of Done](#definition-of-done)

## The Pyramid

```
        ┌───────────────────────┐
        │  manual: iOS + Android │   smallest — critical UI flows only
        ├───────────────────────┤
        │  application (mocked)  │   medium — use cases with mock repos
        ├───────────────────────┤
        │   domain (pure unit)   │   largest — SRS, mastery, quiz session
        └───────────────────────┘
```

The base is intentionally wide. Because `domain/` has no React, SQLite, or Expo dependency, its tests are fast, deterministic, and need no setup. The middle layer tests orchestration with mocked repositories. The top is thin: a small set of critical flows verified by hand on a real Simulator and Emulator. There is no large automated end-to-end suite — it is not worth the maintenance cost at solo-founder scale (see [What NOT to Test](#what-not-to-test)).

## Tooling

- **Jest** (Expo default test runner).
- **`@testing-library/react-native`** for the few component tests.
- **`jest.mock` / `jest.fn`** for mocked repositories.
- Tests live alongside source: `QuizSession.ts` -> `QuizSession.test.ts`. Integration tests go in `__tests__/integration/`.
- Run via `npm test`; the full gate is `npm run check` (lint + typecheck + test).
- **Coverage target: at least 75% on new code.** Concentrate it in `domain/` and `application/`, where it is cheap and meaningful.

## Domain Tests: Pure Unit

The domain layer holds the logic where a bug hurts most: spaced-repetition scheduling, mastery scoring, and quiz-session orchestration. These are pure functions and classes, so tests construct inputs and assert outputs with no mocks.

```tsx
// domain/srs/v1-fixed.test.ts
describe('SpacedRepetition (v1-fixed)', () => {
  it('advances interval on a correct answer', () => {
    const next = SpacedRepetition.calculateNextReviewDate(1, true);
    expect(next).toEqual(addDays(new Date(), 7)); // mastery 1 -> 2 -> 7d per [1,3,7,14,30]
  });

  it('regresses but never below the floor on an incorrect answer', () => {
    const next = SpacedRepetition.calculateNextReviewDate(0, false);
    expect(next).toEqual(addDays(new Date(), 1)); // mastery clamps at 0
  });
});
```

Cover at minimum:

- **SRS intervals:** every transition across the `[1, 3, 7, 14, 30]` fixed schedule, including the clamps (mastery floor 0, ceiling 5).
- **Mastery scoring:** increment on correct, decrement on incorrect, boundary clamps.
- **Quiz session:** `currentWord`, `isComplete`, `answerQuestion` correct/incorrect tallying, and session completion at the last index.

## Application Tests: Mocked Repositories

Use cases orchestrate domain entities and repositories. Test them with mocked repositories — never a real SQLite database. The mock implements the same `domain/` interface the production repository implements.

```tsx
// application/quiz/StartQuizUseCase.test.ts
describe('StartQuizUseCase', () => {
  it('returns up to 20 review words when available', async () => {
    const mockWordRepo = {
      getWordsDueForReview: jest.fn().mockResolvedValue(mockWords(20)),
      getNewWords: jest.fn(),
    };
    const useCase = new StartQuizUseCase(mockWordRepo, mockSessionRepo);

    const session = await useCase.execute('toefl', 'review');

    expect(session.words.length).toBe(20);
    expect(mockWordRepo.getWordsDueForReview).toHaveBeenCalledWith('toefl', 20);
  });

  it('throws NoWordsAvailableError when the queue is empty', async () => {
    const mockWordRepo = {
      getWordsDueForReview: jest.fn().mockResolvedValue([]),
      getNewWords: jest.fn(),
    };
    const useCase = new StartQuizUseCase(mockWordRepo, mockSessionRepo);

    await expect(useCase.execute('toefl', 'review')).rejects.toThrow(NoWordsAvailableError);
  });
});
```

These tests verify orchestration: the right repository method is called with the right arguments, results are assembled correctly, and the right typed error is thrown on empty/error paths.

## SRS Replay Testing

The append-only `quiz_attempts` log plus version-tagged schedulers (`scheduler_version`) exist so that a scheduler can be migrated later (e.g. v1-fixed -> v2-fsrs) by *replaying* history. Replay correctness is therefore a first-class test category.

A replay test feeds a deterministic sequence of dated answer events through a scheduler and asserts the resulting `next_review_date` and `mastery_level` trajectory:

```tsx
describe('SRS replay — v1-fixed over 30 days', () => {
  it('reproduces the same schedule deterministically from the attempt log', () => {
    const attempts = fixtureAttempts('mixed-30day'); // dated correct/incorrect events
    const state = replay('v1-fixed', attempts);
    expect(state.masteryLevel).toBe(4);
    expect(state.nextReviewDate).toEqual(expectedDate('v1-fixed', 'mixed-30day'));
  });
});
```

Replay tests must:

- Be fully deterministic — inject a clock, never read `Date.now()` inside the scheduler under test.
- Pin each fixture's `scheduler_version` so a future v2 scheduler can be added without breaking v1 replay (old attempts replay with their original version's logic).
- Cover catch-up after a gap (soft-rebalance, no full backlog dump) and the streak-boundary timezone logic using a stored `user.timezone`.

## Content Validation Tests

The content CLI's `validate` command is the gate that keeps bad data out of `words.db` (see [../06-content-data/CONTENT_PIPELINE_ARCHITECTURE.md](../06-content-data/CONTENT_PIPELINE_ARCHITECTURE.md)). Its rules get unit tests so a regression cannot silently let malformed content ship.

Cover the validation rules:

- **No orphan words** — every entry has at least one example sentence (this is also a Content Pipeline Reviewer checklist item).
- **No duplicate word within a tier.**
- **Required fields present:** `word`, `definition`, `tier_id`, `example_sentence`.
- **Example sentences contain the blank** (`_`) for cloze-style assessment.
- **`tier_id` references an existing tier.**
- **Multi-word entries** carry the correct `word_type` (`idiom` / `phrasal_verb`).
- **Distractors for multi-word entries** are sampled from the same `tier_id`.
- **Assets referenced exist** (no orphaned `image_path` / `audio_path`).

Each rule gets a passing fixture and a failing fixture; the test asserts the validator reports exactly the expected error.

## What NOT to Test

Spending test effort here is low-value at this scale:

- **Third-party libraries** — Expo, React Native, TanStack Query, Zustand, expo-sqlite. Assume they work; test only your usage of them.
- **Trivial getters/setters and pure pass-through wrappers.**
- **Exact pixel layout / styling** — verified by eye on Simulator and Emulator, not by snapshot tests that break on every nudge.
- **A heavy automated E2E suite** (Detox/Maestro) — deferred. The cost of maintaining device-driving E2E tests exceeds their value for a solo founder; critical flows are checked manually on both platforms per the Day-1 checklist.
- **Real-network sync round-trips in unit tests** — sync is mocked in application tests; the live round-trip is verified manually during Phase 2 device-switch testing.
- **Generated `words.db` contents** beyond what the `validate` rules already cover.

## Definition of Done

"Tests pass" means all three exit 0:

```bash
npm test          # jest
npm run typecheck # tsc --noEmit
npm run lint      # eslint
# or simply:
npm run check
```

UI changes additionally require a manual pass on **both** iOS Simulator and Android Emulator before the task is marked complete.
