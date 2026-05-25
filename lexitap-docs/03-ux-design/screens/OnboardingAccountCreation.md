---
title: Onboarding — Account Creation Spec
screen_id: onboarding-account-creation
category: ux-design
status: active
updated: 2026-05-24
priority: P2
tab: null
target_file: TBD
related_flows: [first-launch-onboarding-and-diagnostic, switching-devices-sync]
tags: [screen, onboarding, account, optional, sync, skippable]
---

# Onboarding — Account Creation

> AI-buildable spec. Tokens from [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md). The **optional, skippable** account step at the end of onboarding (USER_FLOWS flow 1, step 7). Offline-first: skipping costs nothing; the user can create an account later in Settings. Reuses the [SigninAccount.md](./SigninAccount.md) machinery with onboarding framing.

## 1. Purpose

Offer cloud sync at the natural moment (right after the motivating Knowledge Map reveal) without gating entry. Pushes the freshly-seeded local SRS state to the cloud if the user opts in; otherwise lands on Home unchanged.

## 2. Entry & exit

| Direction | From / To | Trigger |
|---|---|---|
| Enter | Knowledge Map Reveal → Start learning | Optional step |
| Exit | Home | Account created OR **Skip for now** |

## 3. Layout

```
┌─────────────────────────────┐
│  Save your progress?         │  ← headline (A)
│                              │
│  Sync across devices, free.  │  ← value (B)
│  You can do this later.      │
│                              │
│  [  Continue with Apple  ]   │  ← provider buttons (C)
│  [  Continue with Google ]   │
│  [  Email                ]   │
│                              │
│        Skip for now          │  ← skip (D), prominent enough
└─────────────────────────────┘
```

## 4. Anatomy

| Ref | Region | Component | Tokens | Content source |
|---|---|---|---|---|
| A | Headline | Text `headline` | `text.primary` | static |
| B | Value | Text `body` | `text.secondary` | static — free, deferrable |
| C | Provider buttons | Auth buttons | per-provider on `bg.surface.raised` | available providers |
| D | Skip | Text button | `text.secondary` | always present |

## 5. Data requirements

| Data | Source | Notes |
|---|---|---|
| Seeded local SRS state | Stage 6 seeding | pushed to cloud on opt-in |
| Provisional teacher code (if any) | redemption service | bind to the new account so attribution survives |
| Auth providers | auth config (Supabase) | platform-appropriate |

## 6. States

| State | Trigger | Rendering |
|---|---|---|
| **Default** | Entered | Provider buttons + Skip |
| **Creating** | Provider chosen | Progress affordance; on success push local snapshot to cloud |
| **Skip** | Tap D | Land on Home; remain offline-first; account available later in Settings |
| **Provisional code present** | Teacher code applied pre-account | Bind code → new account on creation |
| **Offline** | No connectivity | Allow skip; defer account creation to later |

## 7. Interactions

| Element | Trigger | Result | Haptic |
|---|---|---|---|
| Provider (C) | tap | Create account; push seeded state; bind any provisional code | none |
| Skip (D) | tap | Continue to Home, offline-first | none |

## 8. Copy

| Key | String |
|---|---|
| headline | "Save your progress?" |
| value | "Sync across devices, free. You can do this later." |
| skip | "Skip for now" |

No pressure — skipping is a first-class path, not a guilt trip.

## 9. Accessibility

- Provider buttons labeled with provider + action; Skip clearly reachable (not visually buried).
- Read order: headline → value → providers → skip. Targets ≥ 48×48.

## 10. Motion

| Element | Animation | Duration |
|---|---|---|
| Content fade-in | subtle | `motion.base` |
| Reduce Motion | static | per a11y doc |

## 11. Acceptance criteria

- [ ] Account creation is optional; Skip lands on Home with full offline functionality.
- [ ] Cloud sync framed as free and deferrable.
- [ ] On opt-in, the freshly-seeded local SRS state is pushed to the cloud.
- [ ] Any provisionally-stored teacher code binds to the new account (attribution survives sync).
- [ ] SQLite remains source of truth; cloud is the sync layer.
- [ ] Skip is visually prominent enough to be a genuine first-class choice.

## 12. Open questions

- Whether this step is shown to all users or only when a teacher code / test-prep flag suggests sync value.
- Provider set at MVP (shared with [SigninAccount.md](./SigninAccount.md) open question).
