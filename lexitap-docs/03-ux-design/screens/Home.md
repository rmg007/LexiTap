---
title: Home Screen Spec
screen_id: home
category: ux-design
status: active
updated: 2026-05-24
priority: P1
tab: Home
target_file: mobile/src/presentation/screens/HomeScreen.tsx
related_flows: [daily-review-session, learning-new-words, maintaining-recovering-streak]
tags: [screen, home, due, streak, daily-cap, tier]
---

# Home Screen

> AI-buildable spec. Generate layout and UI from this file alone. All visual values are token names defined in [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md) — never hardcode hex, px, or duration. Behavior and copy here are normative; the ASCII frame is layout intent, not pixel-exact.

## 1. Purpose

The returning-user landing surface. Answers two questions at a glance: "what do I do right now?" (review or learn) and "is my streak safe?" Calm, encouraging, zero guilt. Primary action is **Start review**.

## 2. Entry & exit

| Direction | From / To | Trigger |
|---|---|---|
| Enter | App cold/warm launch (returning user, onboarding complete) | Default route |
| Enter | Onboarding → Knowledge Map → "Start learning" | Post-onboarding |
| Enter | Session Complete | Auto-return after streak +1 |
| Enter | Any tab | Tap `⌂ Home` tab |
| Exit | Quiz (review) | Tap **Start review** |
| Exit | Learn Card flow | Tap **Learn new words** |
| Exit | Progress / Settings | Tap tab bar item |

Home is a root tab — no back affordance.

## 3. Layout

```
┌─────────────────────────────┐
│ Good evening, Mei      🔥 12 │  ← greeting (A) + streak chip (B), top row
│                              │
│ ┌─────────────────────────┐ │
│ │  8 words due today      │ │  ← due card (C): count
│ │  ▓▓▓▓▓░░░░  daily cap    │ │  ← daily-cap meter (D)
│ │                         │ │
│ │  [   Start review   ]   │ │  ← PRIMARY (E)
│ └─────────────────────────┘ │
│                              │
│  [  Learn new words  ]       │  ← SECONDARY (F)
│                              │
│  Foundation · A2–B1      ◑   │  ← active tier + mastery ring (G)
│                              │
├─────────────────────────────┤
│  ⌂Home   ▶Quiz  ▲Prog  ⚙Set │  ← tab bar (H), Home active
└─────────────────────────────┘
```

## 4. Anatomy

| Ref | Region | Component | Tokens | Content source |
|---|---|---|---|---|
| A | Greeting | Text, `headline` | `text.primary` | Time-of-day + first name (account) / fallback copy |
| B | Streak chip | Streak indicator pill, `radius.full`, `mono` tabular | `streak` color (active) | `streak.currentCount`, `streak.state` |
| C | Due count | Card → Text `body.lg` | `bg.surface`, `border.subtle`, `text.primary` | `getWordsDueForReview().length` (capped at soft daily cap) |
| D | Daily-cap meter | Progress bar | fill `accent` on `border.subtle` track | reviewed-today / soft cap |
| E | Start review | Primary button, min height 48 | `accent`, label `#062826` | static |
| F | Learn new words | Secondary button | `border.strong`, `text.primary` | static; hidden if no new words AND items due |
| G | Active tier | Row: Text `body` + mastery ring | `text.secondary`, ring `accent` arc | active tier name + CEFR band + tier mastery % |
| H | Tab bar | Tab bar, 4 items | active `accent`, inactive `text.tertiary` | static nav |

Layout: screen gutter `space.4`; vertical rhythm between stacked blocks `space.3`; card internal padding `space.4`. Max two type weights visible.

## 5. Data requirements

| Data | Source (see [SYSTEM_ARCHITECTURE.md](../../04-technical-architecture/SYSTEM_ARCHITECTURE.md)) | Notes |
|---|---|---|
| Due words count | `getWordsDueForReview` use case | Filter `deleted_at IS NULL`; capped at soft daily cap |
| Reviewed-today count | review-session/event log read | Drives daily-cap meter fill |
| Streak count + state | streak read (IANA-tz evaluated) | `state ∈ {active, at-risk, frozen}`; never UTC |
| Active tier + CEFR band | entitlement / active-tier read | e.g. "Foundation · A2–B1" |
| Tier mastery ratio | progress read for active tier | Drives ring G |
| New words available | `getNewWords` (count only) | Controls F visibility / empty wording |
| User first name | account (nullable) | Drives greeting fallback |

No network call required to render — all reads hit local SQLite. Render with last-known values while a background sync runs.

## 6. States

| State | Trigger | Rendering |
|---|---|---|
| **Default** | ≥1 word due | Due card shows count + meter; Start review enabled |
| **Loading** | First mount before reads resolve | Skeleton on due card + tier row; streak chip hidden until known. No spinner blocking the whole screen |
| **Zero due / caught up** | 0 words due | Due card swaps to "All caught up" state; emphasize **Learn new words**; Start review demoted/hidden |
| **Cap reached today** | reviewed-today ≥ soft cap | Meter full; due card reads done-state copy; no overdue/guilt count anywhere |
| **No new words (tier exhausted)** | `getNewWords` == 0 | Learn new words → upgrade/next-tier nudge (never a hard wall, links Paywall per flow 5) |
| **Streak at-risk** | Today's session not done | Streak chip = flame outline + `caution` ring (gentle), not a countdown |
| **Streak frozen** | A freeze was auto-consumed | Chip = snowflake glyph, `text.secondary`; warm note surfaced once |
| **Account-less** | No account | Greeting uses fallback copy (no name); Settings still offers sign-in |
| **Offline** | No connectivity | Fully functional from SQLite; no error banner (offline is normal) |

Hard rule: never show overdue counts as a red alarm or home-screen guilt badge ([SRS_FORGIVENESS_MECHANICS.md](../../02-product-definition/SRS_FORGIVENESS_MECHANICS.md) anti-patterns).

## 7. Interactions

| Element | Trigger | Result | Haptic |
|---|---|---|---|
| Start review (E) | tap | Navigate to Quiz, load due words via `getWordsDueForReview` | none on tap |
| Learn new words (F) | tap | Navigate to Learn Card flow (`getNewWords`, default 10) | none |
| Tier row (G) | tap | Navigate to Progress (active tier focused) | none |
| Streak chip (B) | tap | Navigate to Progress streak summary | none |
| Tab bar item (H) | tap | Switch root tab | none |
| Streak increment | returning after session complete | Chip count animates +1 | `medium` (single) |

Buttons: pressed state `accent.pressed` + scale 0.98 (primary). No destructive actions on this screen.

## 8. Copy

| Key | String | Notes |
|---|---|---|
| greeting.morning/afternoon/evening | "Good morning/afternoon/evening, {name}" | Time-of-day by device clock |
| greeting.noName | "Good evening" (drop comma + name) | Account-less fallback |
| due.count | "{n} words due today" / "1 word due today" | Pluralize |
| due.caughtUp | "All caught up" | Zero-due headline |
| cap.label | "daily cap" | Meter label, lowercase, calm |
| btn.startReview | "Start review" | Primary |
| btn.learnNew | "Learn new words" | Secondary |
| tier.row | "{Tier} · {CEFR band}" | e.g. "Foundation · A2–B1" |

No exclamation-driven urgency. No "X overdue", no streak threats.

## 9. Accessibility

- Focus/read order: greeting → streak chip → due count → cap meter → Start review → Learn new words → tier row → tab bar. (See [ACCESSIBILITY_REQUIREMENTS.md](../ACCESSIBILITY_REQUIREMENTS.md).)
- Streak chip label announces semantic state, e.g. "Streak, 12 days, active" / "…, at risk, today's session not done yet". Never color-only.
- Daily-cap meter: `progressbar` role with value text "{reviewed} of {cap} reviewed today".
- All tap targets ≥ 48×48. Buttons meet AA contrast (`accent` fill uses `#062826` label by design).
- Tabular figures (`mono`) on streak + counts so numbers don't jiggle on change.

## 10. Motion

| Element | Animation | Duration |
|---|---|---|
| Streak +1 on return | count tick + subtle chip pulse | `motion.fast` (120ms) |
| Card mount | fade/slide in | `motion.base` (220ms) |
| Reduce Motion ON | collapse all of the above to cross-fade | per a11y doc |

No celebratory motion on Home — the one allowed "moment" is the onboarding Knowledge Map reveal, not here.

## 11. Acceptance criteria

- [ ] Renders entirely from local SQLite with no blocking network call.
- [ ] Due count equals `getWordsDueForReview` length, filtered `deleted_at IS NULL`, capped at the soft daily cap.
- [ ] Zero-due state shows "All caught up" and emphasizes Learn new words; Start review is not the dominant CTA.
- [ ] No overdue count, red badge, or guilt indicator appears in any state.
- [ ] Streak chip reflects active / at-risk / frozen with both color and a text label.
- [ ] Streak evaluation uses the user's IANA timezone (no `new Date()` UTC comparison).
- [ ] Greeting falls back gracefully with no account (no dangling comma/name).
- [ ] Tier row shows active tier name, CEFR band, and a mastery ring driven by real progress.
- [ ] Tier-exhausted state nudges upgrade without a hard wall.
- [ ] All interactive targets ≥ 48×48 and reachable via screen reader in the documented order.
- [ ] All motion respects Reduce Motion.

## 12. Open questions

- Home greeting personalization fallback copy for account-less users.
- Whether tapping the streak chip should deep-link to Progress or open a lightweight streak detail sheet.
- Tablet/large-layout treatment (content max-width 600) — confirm in MVP scope or deferred.
