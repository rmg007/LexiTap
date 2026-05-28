---
title: Forgiveness Sheet Spec
screen_id: forgiveness-sheet
category: ux-design
status: active
updated: 2026-05-24
priority: P0
tab: null
surface: bottom-sheet
target_file: TBD
related_flows: [hitting-the-daily-cap-forgiveness, daily-review-session]
tags: [screen, forgiveness, daily-cap, no-guilt, soft-catchup]
---

# Forgiveness Sheet

> AI-buildable spec. Tokens from [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md). A calm bottom sheet shown when the learner reaches the soft daily cap mid-session. Prevents SRS-backlog-as-punishment (the documented WordUp churn driver). Cap + soft catch-up + no guilt is a **locked decision** ([SRS_FORGIVENESS_MECHANICS.md](../../02-product-definition/SRS_FORGIVENESS_MECHANICS.md)).

## 1. Purpose

Acknowledge the learner has done enough for today, confirm the streak is already secured, and offer a no-pressure choice to stop or keep going. No red badge, no overdue guilt counter.

## 2. Entry & exit

| Direction | From / To | Trigger |
|---|---|---|
| Enter | Review session | Soft daily cap reached |
| Exit | Home (done state) | **Stop here** |
| Exit | Continue review (no penalty) | **Keep going** |
| Exit | Session Complete | Stops with day secured |

## 3. Layout

```
┌─────────────────────────────┐
│             ──               │  ← grabber handle (A)
│                              │
│   You've done your reviews   │  ← headline (B), calm
│   for today. Nice work.      │
│                              │
│   🔥 Streak secured          │  ← reassurance (C), no guilt
│                              │
│   [      Stop here      ]    │  ← primary, default emphasis (D)
│                              │
│        Keep going            │  ← secondary (E), soft catch-up
│                              │
└─────────────────────────────┘
```

## 4. Anatomy

| Ref | Region | Component | Tokens | Content source |
|---|---|---|---|---|
| A | Handle | Grabber | `border.subtle` | static |
| B | Headline | Text `headline` | `text.primary` | static |
| C | Reassurance | Streak row | `streak` / `success` | streak-secured fact |
| D | Stop here | Primary button (default) | `accent` | → Home done state |
| E | Keep going | Secondary/text button | `text.secondary` | → continue, no penalty |

## 5. Data requirements

| Data | Source | Notes |
|---|---|---|
| Cap reached | review session state | soft daily cap from settings/config |
| Streak secured boolean | streak service (IANA-tz) | showing up = maintained |
| Remaining due count | session | **Trigger and computation input only — NEVER displayed.** This count is used solely to: (1) determine whether to show the ForgivenessSheet at all (trigger condition: `totalOverdue > BASE_DAILY_CAP`, where `BASE_DAILY_CAP = 40` from `domain/srs/forgiveness.ts`), and (2) supply the `overdueWords` argument to `reanchorBacklog()`. It is NEVER rendered to the user in any form — no number, no bar, no percentage, no indirect hint. Rendering it would create the deficit guilt the spec exists to prevent. |

## 6. States

| State | Trigger | Rendering |
|---|---|---|
| **Default** | Cap reached | Headline + streak-secured + Stop here (emphasis) + Keep going |
| **Stop here** | Tap D | Triggers `reanchorBacklog(overdueWords, nowMs, tz)` from `domain/srs/forgiveness.ts` via the application layer. **Reanchor algorithm:** redistributes overdue items by writing new `next_review_at` dates to `user_progress`, spreading the backlog across upcoming days. Each future day absorbs up to `CATCH_UP_BUDGET = 20` additional items above the `BASE_DAILY_CAP = 40` base (constants from `domain/srs/forgiveness.ts` `FORGIVENESS` object). Items beyond that capacity roll to the following day. Only `next_review_at` is touched; mastery levels are never modified by this algorithm. This is the only time the forgiveness mechanic writes `next_review_at` to `user.db`. Returns Home in the done state. |
| **Keep going** | Tap E | Continue beyond cap voluntarily, no penalty either way; sheet is suppressed for the remainder of this session. |
| **Streak already counted** | Earlier session today | Still reassure; no double count |

Anti-pattern guard: never show overdue counts as a red alarm or home-screen guilt badge.

## 7. Interactions

| Element | Trigger | Result | Haptic |
|---|---|---|---|
| Stop here (D) | tap | Return Home (done); soft catch-up smooths backlog | none |
| Keep going (E) | tap | Resume reviewing, no penalty | none |
| Swipe down (A) | gesture | Dismiss = stop here (safe default) | none |

## 8. Copy

| Key | String |
|---|---|
| headline | "You've done your reviews for today. Nice work." |
| reassurance | "Streak secured" |
| btn.stop | "Stop here" |
| btn.keep | "Keep going" |

Banned: "X words overdue", "you're behind", any red or countdown.

## 9. Accessibility

- Sheet announced on present; Stop here is the default-focused, recommended action.
- Read order: headline → reassurance → Stop here → Keep going.
- Both actions ≥ 48×48. Swipe-to-dismiss has the button equivalent (Stop here).

## 10. Motion

| Element | Animation | Duration |
|---|---|---|
| Sheet present | slide up | `motion.base` (220ms) |
| Reduce Motion | fade | per a11y doc |

## 11. Acceptance criteria

- [ ] Appears at the soft daily cap, mid-session.
- [ ] Confirms the streak is already secured; no guilt, no red, no overdue counter.
- [ ] Stop here is the default/recommended action and returns Home in the done state.
- [ ] Keep going continues with no penalty either way.
- [ ] Remaining items roll forward via soft catch-up (redistributed across upcoming days), not dumped tomorrow.
- [ ] Swipe-to-dismiss equals Stop here (safe default).

## 12. Open questions

- (None. Keep going behavior is suppressed for the session; redistribution curve is linked directly to the canonical SRS spec.)
