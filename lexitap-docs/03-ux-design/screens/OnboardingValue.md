---
title: Onboarding — Value Spec
screen_id: onboarding-value
category: ux-design
status: active
updated: 2026-05-24
priority: P1
tab: null
target_file: TBD
related_flows: [first-launch-onboarding-and-diagnostic]
tags: [screen, onboarding, value-framing, no-account]
---

# Onboarding — Value

> AI-buildable spec. Tokens from [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md). One screen of value framing — "Master vocabulary without typing." No account required yet (offline-first). Leads into the diagnostic.

## 1. Purpose

Communicate the core promise in one calm screen before asking the learner to do anything: vocabulary mastery through fast, no-typing recognition. Sets expectations and consent to begin the diagnostic.

## 2. Entry & exit

| Direction | From / To | Trigger |
|---|---|---|
| Enter | Onboarding — Splash | Auto/tap advance |
| Exit | Onboarding — Self-Segment | Tap **Get started** |

## 3. Layout

```
┌─────────────────────────────┐
│                              │
│   Master vocabulary          │  ← headline (A)
│   without typing.            │
│                              │
│   Fast, tap-based reviews    │  ← supporting copy (B)
│   that fit your day.         │
│                              │
│                              │
│      [   Get started   ]     │  ← primary (C)
│                              │
│   No account needed.         │  ← reassurance (D)
│                              │
└─────────────────────────────┘
```

## 4. Anatomy

| Ref | Region | Component | Tokens | Content source |
|---|---|---|---|---|
| A | Headline | Text `display`/`headline` | `text.primary` | static value prop |
| B | Supporting copy | Text `body.lg` | `text.secondary` | static |
| C | Get started | Primary button | `accent` | → Self-Segment |
| D | Reassurance | Text `caption` | `text.tertiary` | static "No account needed." |

Imagery, if any, is contextual — never whimsical/cartoon.

## 5. Data requirements

None beyond static content. No network, no account.

## 6. States

| State | Trigger | Rendering |
|---|---|---|
| **Default** | Loaded | Headline + copy + Get started + reassurance |
| **A/B copy variant** | experiment flag (optional) | Alternate value-framing copy; same layout |

## 7. Interactions

| Element | Trigger | Result | Haptic |
|---|---|---|---|
| Get started (C) | tap | Advance to Self-Segment | none |

## 8. Copy

| Key | String |
|---|---|
| headline | "Master vocabulary without typing." |
| support | "Fast, tap-based reviews that fit your day." |
| btn.start | "Get started" |
| reassurance | "No account needed." |

ESL-global audience only — never American-student framing.

## 9. Accessibility

- Read order: headline → support → Get started → reassurance.
- Get started ≥ 48×48, focused on load. Copy meets AA contrast.

## 10. Motion

| Element | Animation | Duration |
|---|---|---|
| Content fade-in | subtle | `motion.base` |
| Reduce Motion | static | per a11y doc |

## 11. Acceptance criteria

- [ ] Single value-framing screen; no account or network required.
- [ ] Copy targets global ESL learners, never American-student vocab framing.
- [ ] Get started advances to Self-Segment.
- [ ] No mascots/cartoons; any imagery is contextual.

## 12. Open questions

- Whether to support multiple localized value-prop variants at launch ([LOCALIZATION_I18N_STRATEGY.md](../../06-content-data/LOCALIZATION_I18N_STRATEGY.md)).
