---
title: Session Complete Spec
screen_id: session-complete
category: ux-design
status: active
updated: 2026-05-24
priority: P1
tab: Quiz
target_file: TBD
related_flows: [daily-review-session, maintaining-recovering-streak]
tags: [screen, session-complete, streak, done-state]
---

# Session Complete

> AI-buildable spec. Tokens from [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md). Calm "done" moment that secures the streak and returns the learner Home. Showing up = streak maintained; no performance scoring, no guilt.

## 1. Purpose

Close a review or learn-check session: confirm the day's work is done, increment the streak, and route Home in the "done" state. Reinforces the habit loop without pressure to do more.

## 2. Entry & exit

| Direction | From / To | Trigger |
|---|---|---|
| Enter | Last question → Continue | Final item answered |
| Enter | Forgiveness sheet → Stop here | User stops at/after cap |
| Exit | Home (done state) | **Done** / auto-return |
| Exit | Quiz (more practice) | **Keep practicing** (optional, no penalty) |

## 3. Layout

```
┌─────────────────────────────┐
│                              │
│           ✓                  │  ← calm completion mark (A)
│                              │
│     Reviews done for today   │  ← headline (B)
│                              │
│        🔥 13-day streak      │  ← streak summary (C), +1 from this session
│                              │
│   12 words reviewed          │  ← neutral recap (D), not a score
│                              │
│      [     Done     ]        │  ← primary (E) → Home
│      Keep practicing         │  ← secondary/text (F), optional
│                              │
└─────────────────────────────┘
```

## 4. Anatomy

| Ref | Region | Component | Tokens | Content source |
|---|---|---|---|---|
| A | Completion mark | Icon | `success` | static |
| B | Headline | Text `headline` | `text.primary` | static |
| C | Streak summary | Streak chip/row, `mono` | `streak` | new streak count (post-increment) |
| D | Recap | Text `body` | `text.secondary` | count reviewed this session (neutral) |
| E | Done | Primary button | `accent` | → Home |
| F | Keep practicing | Text/secondary button | `text.secondary` | optional; → more items, no penalty |

## 5. Data requirements

| Data | Source | Notes |
|---|---|---|
| Words reviewed this session | `QuizSession` summary | neutral recap only — never accuracy % |
| New streak count + did-increment | streak service (IANA-tz) | increments once per day on first completion |
| More items available | `getWordsDueForReview` / `getNewWords` | controls "Keep practicing" visibility |

## 6. States

| State | Trigger | Rendering |
|---|---|---|
| **Standard complete** | Session finished, streak +1 | Mark + headline + streak + recap; Done primary |
| **Streak already counted today** | Second session same day | Show current streak without re-incrementing; recap still shown |
| **Streak frozen earlier** | Freeze consumed this period | Warm note ("A freeze kept your streak — welcome back"); no shame |
| **No more items** | Queue empty | Hide "Keep practicing"; emphasize Done |
| **More items remain** | Items still due | Show "Keep practicing" (soft catch-up, no penalty) |

## 7. Interactions

| Element | Trigger | Result | Haptic |
|---|---|---|---|
| Streak increment | on entry (first session of day) | Count animates +1 | `medium` (single) |
| Done (E) | tap | Navigate Home (done state) | none |
| Keep practicing (F) | tap | Load more items, no penalty | none |

## 8. Copy

| Key | String |
|---|---|
| headline | "Reviews done for today" |
| streak | "{n}-day streak" |
| recap | "{n} words reviewed" |
| btn.done | "Done" |
| btn.keep | "Keep practicing" |
| frozen.note | "A freeze kept your streak — welcome back." |

No "score", "accuracy", "you missed N". Recap is a count, not a grade.

## 9. Accessibility

- Read order: completion mark (labeled "Session complete") → headline → streak (with state) → recap → Done → Keep practicing.
- Streak announced with semantic state and count.
- Done is the focused element on entry; targets ≥ 48×48.

## 10. Motion

| Element | Animation | Duration |
|---|---|---|
| Completion mark | gentle fade/scale-in | `motion.base` (220ms) |
| Streak +1 tick | count tick | `motion.fast` |
| Reduce Motion | static / cross-fade | per a11y doc |

This is NOT the one allowed celebratory beat (that's the onboarding Knowledge Map reveal). Keep it calm.

## 11. Acceptance criteria

- [ ] Streak increments at most once per day, evaluated in the user's IANA timezone.
- [ ] Recap shows a neutral count, never an accuracy score or "missed" count.
- [ ] "Keep practicing" appears only when more items remain and applies no penalty.
- [ ] Frozen-streak case shows a warm note, never shame.
- [ ] Done routes Home into the done state.
- [ ] No red, no guilt, no compulsion mechanics.

## 12. Open questions

- Whether a target screen/route is its own screen or an overlay on Quiz (`target_file` TBD).
- Whether to surface a single gentle "Learn new words" nudge here when the review queue is empty.
