---
title: SRS Forgiveness Mechanics
category: product
status: active
updated: 2026-05-24
priority: P0
tags: [srs, forgiveness, daily-cap, soft-catch-up, streak-freeze, scheduler, gamification, offline-first, v1-fixed]
---

# SRS Forgiveness Mechanics

Resolves backlog #43, the Phase 1 blocker that gates all scheduler/SRS code. This document specifies three forgiveness mechanics that wrap the locked `v1-fixed` scheduler so a returning or lapsed learner is never punished with a wall of overdue reviews or a destroyed streak. It is the authoritative design for [PRODUCT_REQUIREMENTS_DOCUMENT.md](./PRODUCT_REQUIREMENTS_DOCUMENT.md) Open Question #43 and the forgiveness properties required there.

The mechanics live in the domain layer ([../04-technical-architecture/SYSTEM_ARCHITECTURE.md](../04-technical-architecture/SYSTEM_ARCHITECTURE.md)): the cap and catch-up in `src/domain/srs/`, the streak machine in `src/domain/gamification/`. All functions are pure (no React, no SQLite, no network, no `Date.now()` inside — time is injected). Persisted state additions are in [Data Requirements](#data-requirements).

## Table of Contents

- [Overview](#overview)
- [Design Principles](#design-principles)
- [Mechanic 1: Daily Review Cap](#mechanic-1-daily-review-cap)
- [Mechanic 2: Soft Catch-Up](#mechanic-2-soft-catch-up)
- [Mechanic 3: Streak Freeze](#mechanic-3-streak-freeze)
- [Interaction Between the Three Mechanics](#interaction-between-the-three-mechanics)
- [Data Requirements](#data-requirements)
- [Implementation Interface](#implementation-interface)
- [Edge Cases](#edge-cases)
- [Open Questions](#open-questions)

---

## Overview

`v1-fixed` is unchanged and remains the only thing that mutates `mastery_level` and writes `next_review_date`. Intervals by mastery (0→5): +1d / +3d / +7d / +14d / +30d. Incorrect: `mastery -= 1` (min 0), `next_review = now + 1d`. `scheduler_version = 'v1-fixed'`.

The forgiveness layer is a strict superset that sits *in front of* and *beside* the scheduler:

- The **daily review cap** is a pure **selection/presentation filter** over the due set. It never writes `next_review_date` and never touches mastery. A word not shown today stays exactly as scheduled.
- **Soft catch-up** is a **budgeting policy on top of the cap** for the lapsed-user case. It decides how many of the overdue pile are eligible each day. It also performs a single, bounded, one-time re-anchor of stale `next_review_date`s (a deliberate, version-tagged write) so the overdue cliff is smoothed — this is the one place forgiveness writes scheduled dates, and it is additive smoothing, never interval growth.
- **Streak freeze** is entirely in `domain/gamification` and touches only streak state (`user_stats`). It never reads or writes SRS tables.

Because the cap and catch-up do not alter the `v1-fixed` interval math, a future FSRS migration can still replay `quiz_attempts` faithfully: forgiveness changed *what was surfaced when*, not *what the answer-driven schedule was*. The one re-anchor write is logged to `event_log` so replay can distinguish it from an answer-driven schedule change.

## Design Principles

1. No guilt: no red badges, no overdue counters as alarms, no "you missed N days" copy (locked, [../03-ux-design/USER_FLOWS.md](../03-ux-design/USER_FLOWS.md) flow 4 and flow 8).
2. Showing up = streak maintained. There is no word-count or time-on-task target for the streak.
3. Pure + deterministic: every function takes `now` (epoch ms) and the user's IANA timezone as inputs; no ambient clock reads. This makes domain unit tests trivial and keeps timezone handling explicit.
4. Forgiveness must not corrupt replay. The only scheduled-date write it performs (catch-up re-anchor) is bounded, idempotent per day, and event-logged.
5. Additive, forward-only data changes consistent with the migration strategy ([../04-technical-architecture/DATABASE_SCHEMA.md](../04-technical-architecture/DATABASE_SCHEMA.md#migration-strategy)).

## Mechanic 1: Daily Review Cap

### Parameters

| Parameter | Default | Notes |
|-----------|---------|-------|
| `BASE_DAILY_CAP` | `40` | Reviews surfaced per day in steady state. |
| `NEW_WORDS_PER_DAY` | `10` | Learn-flow batch; counted separately, not against the review cap. |
| `HARD_SESSION_CEILING` | `200` | Absolute upper bound including voluntary "Keep going" overflow, to protect device/UX. |

The cap is on **reviews surfaced**, evaluated per calendar day in the user's timezone. New-word learning ([../03-ux-design/USER_FLOWS.md](../03-ux-design/USER_FLOWS.md) flow 3) has its own budget and does not consume review-cap slots.

### Selection within the cap

The due set is every active word with `next_review_date <= endOfTodayLocal`. When `|dueSet| > effectiveCap`, we select the cap's worth and **defer the rest by not surfacing them** — we do not mutate their `next_review_date`. Selection priority (deterministic sort, ascending = surfaced first):

1. **Overdue depth, most overdue first** — `daysOverdue = floor((startOfTodayLocal - next_review_date) / 1d)`, larger first. The longest-waiting words are the highest risk of being forgotten.
2. **Mastery, lowest first** — fragile (low-mastery) words are more perishable than near-mastered ones, so on ties they win a slot.
3. **`next_review_date` ascending**, then `word_id` ascending — stable, deterministic tiebreak.

Overflow (due words beyond the cap) is simply **left unsurfaced today**. Because their `next_review_date` is untouched, they remain due tomorrow and are re-evaluated by the same selection — naturally rolling forward with no date mutation and no replay impact.

### Interaction with next_review_date

- Surfaced + answered → `v1-fixed` writes the new `next_review_date` as normal.
- Surfaced but session abandoned before answering → no write; still due tomorrow.
- Not surfaced (overflow) → **no write, ever, by this mechanic**. The queue selects within the cap; it does not reschedule what it chose not to show.

This is the load-bearing rule: the daily cap is purely a read-time selector. Date smoothing of a genuine backlog is the job of Mechanic 2, not the cap.

### Pseudocode

```
selectReviewQueue(dueWords, now, tz, cap):
    startOfToday = startOfLocalDay(now, tz)
    annotated = for w in dueWords:
        daysOverdue = floor((startOfToday - w.next_review_date) / DAY_MS)   # >=0
        { w, daysOverdue }
    sort annotated by:
        daysOverdue       DESC,
        w.mastery_level   ASC,
        w.next_review_date ASC,
        w.word_id         ASC
    return annotated[0 : cap].map(a => a.w)
```

## Mechanic 2: Soft Catch-Up

Triggered when a user returns after missing days and the due pile exceeds what one capped day can clear. Goal: meter the backlog back in over several days instead of dumping it, and gently re-anchor genuinely stale dates so the pile drains predictably.

### When it engages

Catch-up mode is active for a given day when `dueCount > BASE_DAILY_CAP`. While active, the **effective cap is raised by a bounded budget** so backlog drains faster than the trickle of a flat cap, without overwhelming:

```
effectiveCap = min(
    BASE_DAILY_CAP + CATCH_UP_BUDGET,
    HARD_SESSION_CEILING
)
```

| Parameter | Default | Notes |
|-----------|---------|-------|
| `CATCH_UP_BUDGET` | `20` | Extra reviews/day allowed while in catch-up. So effective cap = 60/day during catch-up. |
| `CATCH_UP_DRAIN_DAYS` | `5` | Target number of days to fully clear a backlog after a lapse (used by the re-anchor spread). |
| `LAPSE_THRESHOLD_DAYS` | `2` | A gap strictly greater than this (i.e. ≥3 missed days) qualifies as a "lapse" eligible for re-anchor. A 1–2 day gap is handled by the cap alone. |

### Prioritization

Identical to the daily-cap sort (most-overdue first, then lowest-mastery). Rationale: in a backlog the oldest items are the most likely forgotten and the most valuable to refresh first; among equally-overdue items, fragile low-mastery words go first. We deliberately do **not** put highest-mastery first — letting near-mastered words slip a few extra days costs little, whereas low-mastery words decay fast.

### One-time re-anchor (the only forgiveness write to next_review_date)

On the first app open after a qualifying lapse (gap ≥ `LAPSE_THRESHOLD_DAYS + 1` days since `last_activity_date`), we spread the overdue pile's `next_review_date`s across the next `CATCH_UP_DRAIN_DAYS` local days so the backlog presents as an even ramp rather than a single cliff. This is bounded, idempotent per lapse, and event-logged.

Algorithm — distribute overdue words into day-buckets, oldest/most-fragile into the earliest buckets, respecting effective daily capacity:

```
reanchorBacklog(overdueWords, now, tz):
    sorted = sort overdueWords by (daysOverdue DESC, mastery ASC, next_review_date ASC, word_id ASC)
    perDay = effectiveCap            # = BASE_DAILY_CAP + CATCH_UP_BUDGET
    writes = []
    for i, w in enumerate(sorted):
        bucket = min(floor(i / perDay), CATCH_UP_DRAIN_DAYS - 1)   # clamp to last day
        newDate = startOfLocalDay(now, tz) + bucket * DAY_MS
        # never push a word LATER than it was already due (forgiveness only pulls in, never delays past schedule)
        newDate = min(newDate, w.next_review_date) if w.next_review_date > newDate else newDate
        if newDate != w.next_review_date:
            writes.push({ word_id: w.word_id, next_review_date: newDate })
    return writes   # caller persists in one transaction + writes ONE event_log row: srs_backlog_reanchored
```

Notes:
- Words beyond `perDay * CATCH_UP_DRAIN_DAYS` are clamped into the final bucket (day `CATCH_UP_DRAIN_DAYS - 1`); they stay overdue and continue draining via the cap on subsequent days — acceptable, the pile shrinks daily.
- Mastery is never touched. `scheduler_version` on these rows stays `'v1-fixed'`; the re-anchor is recorded out-of-band in `event_log` (`event_type = 'srs_backlog_reanchored'`, payload = count + lapse length) so a future replay can identify and account for the smoothing.
- Re-anchor runs at most once per lapse: guarded by `last_catchup_anchor_date` (see [Data Requirements](#data-requirements)). If it already ran today, it is skipped.

### Worked example

User returns after 12 missed days with 180 overdue words. Effective cap = 60. Re-anchor spreads them: 60 into today (bucket 0), 60 into +1d, 60 into +2d (buckets clamp at day 4). Day 1 they review the 60 most-overdue/most-fragile (cap = 60). Each subsequent day surfaces the next bucket plus any organically-due words, capped at 60, draining the pile over ~3–5 days without a single overwhelming session — and the streak is already safe the moment they open and complete day 1.

## Mechanic 3: Streak Freeze

A freeze is a forgiveness token that absorbs exactly one missed day so a single (or freeze-covered) lapse does not reset `current_streak`. Lives entirely in `domain/gamification`; reads/writes only `user_stats` fields. Never references SRS tables.

### Earning, granting, banking

| Parameter | Default | Notes |
|-----------|---------|-------|
| `MAX_BANKED_FREEZES` | `2` | Hard cap on simultaneously held freezes. |
| `FREEZE_EARN_EVERY_N_STREAK_DAYS` | `7` | Earn 1 freeze for each 7 consecutive streak-days reached (at streak 7, 14, 21…). |
| `INITIAL_FREEZES_GRANTED` | `1` | Granted once at onboarding so a first-week lapse is survivable. |

- A freeze is granted when, on a streak increment, `current_streak % FREEZE_EARN_EVERY_N_STREAK_DAYS == 0` and `freeze_count < MAX_BANKED_FREEZES`. Earning above the cap is silently discarded (no negative; no overflow bank).
- Freezes are not purchasable at MVP (no IAP path for them — out of scope). Earn-by-streak + the onboarding grant only.

### Timezone handling

All day boundaries use the user's IANA timezone from AsyncStorage (source of truth, [../04-technical-architecture/DATABASE_SCHEMA.md](../04-technical-architecture/DATABASE_SCHEMA.md), never UTC, no retroactive re-anchoring). `last_activity_date` is stored as the **local civil date** (an integer `YYYYMMDD`, e.g. `20260524`) computed in the active timezone at the moment of the qualifying session — not a raw epoch — so streak-day math is a pure date-difference and is immune to later timezone changes. A timezone change going forward simply changes how *future* boundaries are computed; past `YYYYMMDD` anchors are never rewritten.

### Streak update state machine

Evaluated whenever a qualifying day-completion occurs (first completed review or learn-check of the day) and also on app open to detect a silent freeze consumption. Inputs: current `user_stats` + `today` (local `YYYYMMDD`).

Let `gap = civilDayDiff(today, last_activity_date)` (calendar days between the two local dates; `0` = same day, `1` = consecutive, `>=2` = one or more missed days).

On a **qualifying session completion today**:

```
gap == 0:   # already counted today
    no-op (streak already incremented today; idempotent)

gap == 1:   # consecutive day — normal increment
    current_streak += 1
    longest_streak = max(longest_streak, current_streak)
    last_activity_date = today
    maybeGrantFreeze()        # if current_streak % 7 == 0 and freeze_count < MAX

gap >= 2:   # one or more days missed since last activity
    missed = gap - 1          # number of fully-skipped days
    if missed <= freeze_count:
        freeze_count -= missed            # consume one freeze per missed day
        current_streak += 1               # streak preserved + today counts
        longest_streak = max(longest_streak, current_streak)
        last_activity_date = today
        emit warm note: "A freeze kept your streak — welcome back" (UI)
        maybeGrantFreeze()
    else:
        current_streak = 1                # reset: today restarts the streak at 1
        last_activity_date = today
        # freeze_count unchanged; encouraging restart copy (no guilt)
```

On **app open without a completed session** (passive check, no streak write):

```
gap == 0: streak intact, today still actionable
gap == 1: at-risk state — show gentle at-risk chip (flame outline), no write
gap >= 2: at-risk; freeze consumption is DEFERRED until the day is actually completed
          (we never silently spend a freeze for a day the user might still complete).
          Show at-risk chip; if the user never returns, the freeze is spent lazily
          on their next completion per the gap>=2 branch above.
```

Design choice: freezes are consumed **lazily at next completion**, not eagerly at midnight. This keeps the machine a pure function of (stats, today) with no background midnight job — correct offline, and it never burns a freeze for a day the user could still salvage by showing up.

`maybeGrantFreeze()`:

```
if current_streak > 0 and current_streak % FREEZE_EARN_EVERY_N_STREAK_DAYS == 0:
    freeze_count = min(freeze_count + 1, MAX_BANKED_FREEZES)
```

### Edge cases (streak)

- **Multiple sessions same day:** only the first increments; subsequent are `gap == 0` no-ops.
- **Missed more days than freezes held:** reset to 1 (today counts). E.g. 2 freezes, 4 days missed (`missed = 3 > 2`) → reset.
- **Exactly enough freezes:** 2 freezes, missed 2 days → consume both, streak preserved, `freeze_count = 0`.
- **Travel / timezone change:** future boundaries shift with the new tz; stored `YYYYMMDD` anchors are never rewritten (no retroactive re-anchoring). A user flying east/west may get a slightly longer/shorter "day" once; never penalized retroactively.
- **Clock tampering backward:** `civilDayDiff` can go negative; treat `gap < 0` as `gap == 0` (no-op) to avoid streak inflation from a rolled-back clock.

## Interaction Between the Three Mechanics

```
app open ─▶ applyStreakUpdate(passive)         # at-risk chip only, no write
         ─▶ if lapse(gap >= LAPSE_THRESHOLD+1): reanchorBacklog() once  # event-logged
review   ─▶ selectReviewQueue(due, effectiveCap)   # cap, or raised cap in catch-up
         ─▶ answer ─▶ v1-fixed writes next_review_date (unchanged)
session complete ─▶ applyStreakUpdate(completion)  # increment / freeze / reset
```

The streak is secured by **showing up and completing the day's first session** — independent of how many of the capped reviews remain. A user who hits the cap and taps "Stop here" ([../03-ux-design/USER_FLOWS.md](../03-ux-design/USER_FLOWS.md) flow 4) has already maintained the streak; the remaining backlog drains via cap + catch-up on following days.

## Data Requirements

All additive, forward-only, never-DROP, consistent with [../04-technical-architecture/DATABASE_SCHEMA.md](../04-technical-architecture/DATABASE_SCHEMA.md#migration-strategy). No `quiz_attempts`/`event_log` mutation; the re-anchor appends one `event_log` row.

### New `user_stats` fields (local mirror + Supabase `user_stats_sync`)

Streak state currently lives in `user_stats_sync` (cloud) and is recomputed locally on demand. The forgiveness machine needs durable streak/freeze state. Add to `user_stats_sync` and the local stats representation:

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `freeze_count` | INTEGER | `0` | Currently banked streak freezes (0..`MAX_BANKED_FREEZES`). |
| `last_activity_date` | INTEGER | NULL | **Reinterpreted as local civil date `YYYYMMDD`** (was epoch BIGINT). New writes use `YYYYMMDD`; see migration note. |
| `freezes_granted_total` | INTEGER | `0` | Audit: lifetime freezes granted (for analytics, never decremented). |
| `last_catchup_anchor_date` | INTEGER | NULL | Local `YYYYMMDD` of the last backlog re-anchor; guards once-per-lapse idempotency. |

Migration note: `last_activity_date` already exists as epoch BIGINT in `user_stats_sync`. To stay forward-only, **add a new column `last_activity_local_date INTEGER`** (`YYYYMMDD`) rather than repurposing the epoch column; the epoch column is left in place (deprecated, still synced for backward compatibility) and the machine reads/writes the new local-date column. (Listed above as `last_activity_date` for the machine's logical input; physical column = `last_activity_local_date`.)

Cloud migration: `ALTER TABLE user_stats_sync ADD COLUMN freeze_count INTEGER DEFAULT 0; ADD COLUMN last_activity_local_date INTEGER; ADD COLUMN freezes_granted_total INTEGER DEFAULT 0; ADD COLUMN last_catchup_anchor_date INTEGER;` Sync conflict resolution for these follows the existing last-write-wins by `last_reviewed_at`; freeze_count takes the higher of the two on merge to avoid double-spend across devices (see Open Questions).

### `user_progress`

No new columns required. The re-anchor writes the existing `next_review_date`. `scheduler_version` stays `'v1-fixed'` on re-anchored rows.

### `event_log`

New `event_type` value: `srs_backlog_reanchored`, payload `{ "count": N, "lapse_days": D, "drain_days": CATCH_UP_DRAIN_DAYS }`. Appended in the same transaction as the re-anchor writes (synchronous, per the event_log invariant).

### AsyncStorage keys

| Key | Type | Purpose |
|-----|------|---------|
| `forgiveness.config.version` | string | Tags which parameter set produced behavior (e.g. `'fp-v1'`), for future tuning without code archaeology. |

The IANA timezone is already the AsyncStorage source of truth (existing key per [../04-technical-architecture/DATABASE_SCHEMA.md](../04-technical-architecture/DATABASE_SCHEMA.md)); no new tz key. Parameter constants (caps/budgets/freeze cadence) are code constants in `src/domain/srs/` and `src/domain/gamification/`, not stored — they are not per-user state.

## Implementation Interface

Pure functions, no side effects, no ambient time. Time enters as `nowMs: number` (epoch ms) and `tz: string` (IANA). All return new values / write-descriptors; the application layer persists them.

```ts
// ── src/domain/srs/forgiveness.ts ───────────────────────────────────────────

export const FORGIVENESS = {
  BASE_DAILY_CAP: 40,
  NEW_WORDS_PER_DAY: 10,
  HARD_SESSION_CEILING: 200,
  CATCH_UP_BUDGET: 20,
  CATCH_UP_DRAIN_DAYS: 5,
  LAPSE_THRESHOLD_DAYS: 2,
  CONFIG_VERSION: 'fp-v1',
} as const;

/** A due word as seen by the selector (subset of user_progress + word). */
export interface DueWord {
  readonly wordId: string;
  readonly masteryLevel: number;      // 0-5
  readonly nextReviewDate: number;    // epoch ms
}

/** Compute the effective cap for today given how many words are due. */
export function effectiveDailyCap(dueCount: number): number;

/** Deterministic queue selection within the cap. Pure; mutates nothing. */
export function selectReviewQueue(
  due: readonly DueWord[],
  nowMs: number,
  tz: string,
  cap: number,
): DueWord[];

/** One next_review_date write descriptor (applied by infra in one txn). */
export interface ReanchorWrite {
  readonly wordId: string;
  readonly nextReviewDate: number;    // epoch ms, startOfLocalDay-aligned
}

export interface ReanchorResult {
  readonly writes: readonly ReanchorWrite[];
  readonly event: { type: 'srs_backlog_reanchored'; count: number; lapseDays: number; drainDays: number } | null;
}

/** True if the gap since last activity qualifies as a lapse needing re-anchor. */
export function isLapse(lastActivityLocalDate: number | null, todayLocalDate: number): boolean;

/**
 * Compute the one-time backlog re-anchor. Returns [] writes if not in lapse,
 * or if already anchored today (caller passes lastCatchupAnchorDate to guard).
 */
export function reanchorBacklog(
  overdue: readonly DueWord[],
  nowMs: number,
  tz: string,
  lapseDays: number,
  lastCatchupAnchorDate: number | null,
): ReanchorResult;

// ── src/domain/gamification/streak.ts ────────────────────────────────────────

export const STREAK = {
  MAX_BANKED_FREEZES: 2,
  FREEZE_EARN_EVERY_N_STREAK_DAYS: 7,
  INITIAL_FREEZES_GRANTED: 1,
} as const;

export interface StreakState {
  readonly currentStreak: number;
  readonly longestStreak: number;
  readonly lastActivityLocalDate: number | null;  // YYYYMMDD
  readonly freezeCount: number;
  readonly freezesGrantedTotal: number;
}

export type StreakOutcome =
  | { kind: 'noop' }                                   // gap == 0 or clock backward
  | { kind: 'incremented' }                            // normal consecutive day
  | { kind: 'freeze_consumed'; freezesSpent: number }  // lapse absorbed
  | { kind: 'reset' };                                 // lapse not coverable

export interface StreakUpdateResult {
  readonly state: StreakState;       // next state (caller persists)
  readonly outcome: StreakOutcome;   // drives UI copy (warm note / restart)
  readonly freezeGranted: boolean;   // a freeze was earned this update
}

/** Local civil date as YYYYMMDD in the given tz. Pure. */
export function toLocalCivilDate(nowMs: number, tz: string): number;

/** Calendar-day difference between two YYYYMMDD dates (can be negative). */
export function civilDayDiff(today: number, last: number): number;

/** Apply a qualifying day-completion. The core state machine (pure). */
export function applyStreakUpdate(
  state: StreakState,
  todayLocalDate: number,
): StreakUpdateResult;

/** Passive at-risk evaluation on app open (no state write). */
export function evaluateStreakAtRisk(
  state: StreakState,
  todayLocalDate: number,
): { atRisk: boolean };

/** Seed a brand-new user (onboarding grant). */
export function initialStreakState(): StreakState;
```

Contract notes for the implementer:
- `selectReviewQueue` and `reanchorBacklog` must be referentially transparent given `(inputs, nowMs, tz)`; no `Date.now()`, no `Intl` ambient locale — pass `tz` explicitly.
- `applyStreakUpdate` is the single writer of streak/freeze state; the application layer calls it once per completed session inside the same transaction as the `quiz_attempts`/`event_log` writes.
- The re-anchor's `writes` and its single `event_log` row are persisted atomically by the infrastructure repo; the domain function only produces the descriptors.

## Edge Cases

- **No `user_progress` rows yet (fresh user):** due set empty → `selectReviewQueue` returns `[]`; Home shows "All caught up / Learn new words" (flow 2 edge case). No re-anchor.
- **Due set smaller than cap:** cap is a ceiling, not a target — surface all due words, session ends naturally.
- **Backlog larger than `perDay * drainDays`:** overflow clamps into the final bucket and continues draining via the daily cap on subsequent days; no overwhelming session, pile strictly shrinks each day the user shows up.
- **Re-anchor would push a word later than already scheduled:** never — re-anchor only pulls dates inward (`min` guard), it cannot delay a word past its existing `next_review_date`.
- **Multi-day offline streak of completions impossible:** completions only happen on days the app is opened; lazy freeze consumption handles all skipped days at next completion.
- **Two devices, concurrent freeze spend:** last-write-wins per record could double-spend a freeze; merge rule keeps the *lower* `freeze_count` on conflict (conservative, never grants free streaks) — flagged in Open Questions for the sync implementer.
- **Clock rolled backward / negative gap:** treated as `noop` to prevent streak/freeze inflation.

## Open Questions

- **Freeze sync merge rule under conflict:** proposed conservative "keep lower freeze_count, keep higher current_streak" — needs validation against the device-switch test (Phase 2) to ensure it never double-spends nor double-grants. Owner: sync implementer.
- **Parameter tuning post-launch:** `BASE_DAILY_CAP=40`, `CATCH_UP_BUDGET=20`, `CATCH_UP_DRAIN_DAYS=5`, `FREEZE_EARN_EVERY_N_STREAK_DAYS=7` are sensible defaults; revisit against D7/D30 retention data (success metrics, [PRODUCT_REQUIREMENTS_DOCUMENT.md](./PRODUCT_REQUIREMENTS_DOCUMENT.md)). `forgiveness.config.version` exists to make this a data/config change, not a redesign.
- **Should new-word learning pause during heavy catch-up?** Currently new words remain available (separate budget). Possible refinement: suppress the "Learn new words" suggestion while a large backlog is draining to avoid pile-on. Deferred.
- **Surfacing freeze balance in UI:** whether to show "freezes: 2" on Home or keep it invisible until consumed (flow 8 implies warm post-hoc notification). UX decision deferred to [../03-ux-design/USER_FLOWS.md](../03-ux-design/USER_FLOWS.md) owner.
