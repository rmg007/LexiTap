---
title: Progress Screen Spec
screen_id: progress
category: ux-design
status: active
updated: 2026-05-24
priority: P1
tab: Progress
target_file: mobile/src/presentation/screens/ProgressScreen.tsx
related_flows: [maintaining-recovering-streak, purchasing-premium]
tags: [screen, progress, streak, tiers, mastery, paywall-entry]
---

# Progress Screen

> AI-buildable spec. Tokens from [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md). Growth-framed, never deficit. Streak and per-tier mastery; locked tiers are an invitation (tap → Paywall), not a wall.

## 1. Purpose

Show the learner their momentum: streak, weekly show-up, and per-tier mastery. Surfaces locked tiers as upgrade invitations routed to the Paywall.

## 2. Entry & exit

| Direction | From / To | Trigger |
|---|---|---|
| Enter | Tab bar | Tap `▲ Progress` |
| Enter | Home → tier row / streak chip | Deep link |
| Exit | Paywall | Tap a locked tier |
| Exit | Other tab | Tab bar |

## 3. Layout

```
┌─────────────────────────────┐
│ Progress                     │  ← title (A)
│                              │
│ 🔥 12-day streak             │  ← streak summary (B), warm
│ ▓▓▓▓▓▓▓░░░░  this week       │  ← 7-day show-up bar (C)
│                              │
│ Your tiers                   │  ← section header (D)
│ ┌─────────────────────────┐ │
│ │ Foundation        ◕     │ │  ← tier row + mastery ring (E)
│ │ 1,840 / 3,000 mastered  │ │
│ ├─────────────────────────┤ │
│ │ Advanced          ◑     │ │
│ │ 420 / 6,000             │ │
│ ├─────────────────────────┤ │
│ │ TOEFL          🔒 ◔     │ │  ← locked tier (F) → Paywall
│ │ Unlock to start         │ │
│ └─────────────────────────┘ │
├─────────────────────────────┤
│  ⌂Home  ▶Quiz  ▲Prog  ⚙Set  │
└─────────────────────────────┘
```

## 4. Anatomy

| Ref | Region | Component | Tokens | Content source |
|---|---|---|---|---|
| A | Title | Text `headline` | `text.primary` | static |
| B | Streak summary | Streak row, `mono` | `streak` | streak count + state |
| C | Weekly bar | 7-segment show-up bar | filled `accent`/`success`, empty `border.subtle` | last 7 days show-up (IANA-tz) |
| D | Section header | Text `caption` | `text.tertiary` | static "Your tiers" |
| E | Tier row | Card row + mastery ring | `bg.surface`, ring `accent` arc | tier name, mastered/total, mastery % |
| F | Locked tier row | Tier row + lock glyph | `text.tertiary`, lock icon | entitlement (locked) |

## 5. Data requirements

| Data | Source | Notes |
|---|---|---|
| Streak count + state | streak service (IANA-tz) | Warm growth framing. |
| 7-day show-up query | `user.db` — `event_log` table only (no ATTACH needed) | **Rolling 7 Show-up Query (user.db only):** Query `event_log` for `event_type = 'session_completed'`. Extract `occurred_at` epoch-ms timestamps and convert each to the user's IANA timezone using `toLocalCivilDate(occurredAt, tz)` to produce `YYYYMMDD` local civil-date strings. Find the 7 most recent distinct local dates that have at least one `session_completed` entry. This query touches `user.db` only — no ATTACH to `words.db` required. Prototype SQL (IANA-aware logic applied in application layer before query): `SELECT DISTINCT strftime('%Y%m%d', occurred_at/1000, 'unixepoch') AS utc_date FROM event_log WHERE event_type = 'session_completed' ORDER BY utc_date DESC LIMIT 7;` — then convert each UTC date to local civil date via `toLocalCivilDate`. |
| Tier list + lock state | `user_entitlements` read | Which tiers are unlocked. |
| Per-tier mastered/total | progress read | Counts shown internally. |
| Active tier | active-tier read | Emphasized row. |

External marketing copy avoids committing word counts, but internal Progress UI may show counts ([PRODUCT_REQUIREMENTS_DOCUMENT.md](../../02-product-definition/PRODUCT_REQUIREMENTS_DOCUMENT.md)).

## 6. States

| State | Trigger | Rendering |
|---|---|---|
| **Default** | Data loaded | Streak + weekly bar + tier list. |
| **Loading** | Before reads resolve | Skeleton rows render. **Mastery Ring Skeleton:** The mastery ring G renders as a static dashed gray outline (`bg.surface.sunken` border) while the non-trivial SQLite cross-DB ATTACH query computes total mastered words; no global blockers. |
| **New user** | Minimal history | Streak shows small honest number; tiers show early progress, framed as growth. |
| **Locked tier** | Tier not entitled | Lock glyph + "Unlock to start"; tap → Paywall (contextual to that tier). |
| **Streak at-risk / frozen** | Per streak service | Mirror Home chip states (color + label). |
| **Offline** | No connectivity | Renders from SQLite; no error. |

Hard rule: never frame remaining words as a deficit; no red, no guilt counters.

## 7. Interactions

| Element | Trigger | Result | Haptic |
|---|---|---|---|
| Locked tier (F) | tap | Open Paywall, contextual to tier | none |
| Unlocked tier (E) | tap | Set/confirm active tier (or detail) | `selection` |
| Streak summary (B) | tap | Streak detail (optional) | none |

## 8. Copy

| Key | String |
|---|---|
| title | "Progress" |
| streak | "{n}-day streak" |
| weekly | "this week" |
| section | "Your tiers" |
| tier.mastered | "{m} / {t} mastered" |
| tier.locked | "Unlock to start" |

## 9. Accessibility

- Read order: title → streak (with state) → weekly bar (value text) → section → each tier row (name, progress, lock state).
- Mastery ring exposes value text ("Foundation, 61% mastered"). Lock state announced.
- Targets ≥ 48×48. Growth framing in labels, never "behind"/"overdue".

## 10. Motion

| Element | Animation | Duration |
|---|---|---|
| Ring/bar fill on mount | ease fill-in | `motion.base` (220ms) |
| Reduce Motion | static final state | per a11y doc |

No celebratory motion here.

## 11. Acceptance criteria

- [ ] Streak + weekly show-up evaluated in the user's IANA timezone.
- [ ] Per-tier mastery driven by real progress reads; rings show value text.
- [ ] Locked tiers tap through to a Paywall contextual to that tier — never a hard wall.
- [ ] No deficit framing, red, or guilt counters in any state.
- [ ] All rows reachable and announced by screen reader in documented order.
- [ ] Renders from local SQLite without a blocking network call.

## 12. Open questions

- (None. Tapping an unlocked tier sets it active. Weekly bar semantics are resolved: rolling 7 most-recent civil dates in user's timezone.)
