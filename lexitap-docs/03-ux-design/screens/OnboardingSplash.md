---
title: Onboarding — Splash Spec
screen_id: onboarding-splash
category: ux-design
status: active
updated: 2026-05-24
priority: P1
tab: null
target_file: TBD
related_flows: [first-launch-onboarding-and-diagnostic]
tags: [screen, onboarding, splash, cold-open]
---

# Onboarding — Splash

> AI-buildable spec. Tokens from [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md). Brand cold-open on first launch. Brief, calm, no account required (offline-first). Auto-advances to the Value screen.

## 1. Purpose

The first frame a new user sees: brand identity, dark-mode-first, no mascots/cartoons. Sets tone (calm, premium) before value framing.

## 2. Entry & exit

| Direction | From / To | Trigger |
|---|---|---|
| Enter | First app launch | No prior onboarding |
| Exit | Onboarding — Value | Auto-advance (short) or tap |
| Exit | Home | If onboarding already complete, skip splash chain |

## 3. Layout

```
┌─────────────────────────────┐
│                              │
│                              │
│                              │
│          LexiTap             │  ← wordmark (A), centered
│                              │
│                              │
│                              │
└─────────────────────────────┘
```

## 4. Anatomy

| Ref | Region | Component | Tokens | Content source |
|---|---|---|---|---|
| A | Wordmark | Brand logotype | `text.primary` on `bg.base` | static brand asset |

No illustrated characters or mascots (brand rule).

## 5. Data requirements

| Data | Source | Notes |
|---|---|---|
| Onboarding-complete flag | local settings | if true, bypass entire onboarding chain |
| Resume point | local settings | if mid-diagnostic, route to resume (see Adaptive Y/N) |

No network call.

## 6. States

| State | Trigger | Rendering |
|---|---|---|
| **Cold open** | First launch | Wordmark; auto-advance after a brief beat |
| **Onboarding complete** | Returning user | Skip to Home (splash not shown or instant) |
| **Mid-diagnostic resume** | Quit during diagnostic | Route to resume at last answered item |

## 7. Interactions

| Element | Trigger | Result | Haptic |
|---|---|---|---|
| Anywhere | tap (optional) | Skip the beat, advance to Value | none |
| (auto) | timeout | Advance to Value | none |

## 8. Copy

| Key | String |
|---|---|
| wordmark | "LexiTap" (brand asset) |

No tagline here — value framing is the next screen.

## 9. Accessibility

- Wordmark exposes accessible name "LexiTap".
- Respect Reduce Motion (no animated logo reveal if disabled).
- Auto-advance timing accounts for screen-reader users (don't advance before VoiceOver finishes the brand announcement, or allow tap-to-advance).

## 10. Motion

| Element | Animation | Duration |
|---|---|---|
| Wordmark fade-in | subtle fade | `motion.base` (220ms) |
| Reduce Motion | static | per a11y doc |

## 11. Acceptance criteria

- [ ] Dark-mode-first; no mascots, cartoons, or illustrated characters.
- [ ] No account or network required.
- [ ] Auto-advances to Value, with tap-to-skip.
- [ ] Returning users (onboarding complete) bypass the splash chain.
- [ ] Mid-diagnostic quit resumes at the last answered item.

## 12. Open questions

- Exact auto-advance duration and whether splash is shown at all on warm launches.
