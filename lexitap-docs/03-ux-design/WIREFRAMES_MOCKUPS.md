---
title: Wireframes and Mockups
category: ux-design
status: active
updated: 2026-05-24
priority: P1
tags: [wireframes, mockups, ui, screens, home, quiz, progress, settings, paywall, knowledge-map]
---

# Wireframes and Mockups

Low-fidelity ASCII wireframes with annotations for every MVP screen. These are layout and behavior references, not pixel comps. Tokens (color, type, spacing, components) come from [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md); the journeys connecting these screens are in [USER_FLOWS.md](./USER_FLOWS.md); accessibility annotations reference [ACCESSIBILITY_REQUIREMENTS.md](./ACCESSIBILITY_REQUIREMENTS.md).

All wireframes assume dark-mode-first, a 4-tab structure (Home, Quiz, Progress, Settings), and no typing in quiz flows.

## Table of Contents

- [Conventions](#conventions)
- [Home](#home)
- [Quiz — MultipleChoice](#quiz--multiplechoice)
- [Quiz — DragDrop](#quiz--dragdrop)
- [Quiz — Feedback States](#quiz--feedback-states)
- [Progress](#progress)
- [Settings](#settings)
- [Paywall](#paywall)
- [Onboarding and Knowledge Map](#onboarding-and-knowledge-map)
- [Open Questions](#open-questions)

## Conventions

```
[ Button ]    primary/secondary button       ( ) / (•)  unselected / selected
└ tab ┘       bottom tab item                  ▓▓▓░░      progress fill
🔥 12         streak chip (flame + integer)    ◔ ◑ ◕ ●    mastery ring states
```

Annotations follow each frame as `>` notes.

## Home

```
┌─────────────────────────────┐
│ Good evening, Mei      🔥 12 │  ← title greeting + streak chip (top-right)
│                              │
│ ┌─────────────────────────┐ │
│ │  8 words due today      │ │  ← due count, body.lg
│ │  ▓▓▓▓▓░░░░  daily cap    │ │  ← daily-cap meter (calm, not pressure)
│ │                         │ │
│ │  [   Start review   ]   │ │  ← PRIMARY button (full width)
│ └─────────────────────────┘ │
│                              │
│  [  Learn new words  ]       │  ← SECONDARY button
│                              │
│  Foundation · A2–B1      ◑   │  ← active tier + overall mastery ring
│                              │
│                              │
├─────────────────────────────┤
│  ⌂Home   ▶Quiz  ▲Prog  ⚙Set │  ← tab bar, Home active (accent)
└─────────────────────────────┘
```

> Streak chip is the only warm-color element; everything else is calm dark + teal accent. If zero words due, the due card swaps to "All caught up" and emphasizes Learn new words. Daily-cap meter never shows overdue guilt counts.

## Quiz — MultipleChoice

```
┌─────────────────────────────┐
│ ←            ▓▓▓▓░░░  4/12   │  ← back + session progress (no timer)
│                              │
│        diligent              │  ← word under study, display type
│        /ˈdɪlɪdʒənt/   ♪      │  ← phonetic + audio play (tier-dependent)
│                              │
│  Which meaning fits?         │  ← caption prompt
│                              │
│ ┌─────────────────────────┐ │
│ │ ( ) careless and lazy   │ │  ← option card (min height 56, tappable)
│ ├─────────────────────────┤ │
│ │ (•) hard-working and    │ │  ← selected = accent border
│ │     careful             │ │
│ ├─────────────────────────┤ │
│ │ ( ) extremely wealthy   │ │
│ └─────────────────────────┘ │
│                              │
│        [   Check   ]         │  ← primary, enabled once an option picked
├─────────────────────────────┤
│  ⌂Home  ▶Quiz  ▲Prog  ⚙Set  │
└─────────────────────────────┘
```

> 2–4 options. No TextInput. Audio glyph only on tiers with pronunciation (e.g. TOEFL). Progress bar shows position, never a countdown clock.

## Quiz — DragDrop

```
┌─────────────────────────────┐
│ ←            ▓▓▓▓▓░░  5/12   │
│                              │
│  Match each word to its      │
│  meaning                     │
│                              │
│  ┌ candid ┐ ┌ frugal ┐       │  ← draggable chips (radius.full)
│  └────────┘ └────────┘       │
│                              │
│  ┌─────────────────────────┐ │
│  │ honest, direct  [  ⤓  ] │ │  ← drop zone (sunken, dashed)
│  ├─────────────────────────┤ │
│  │ careful with money [ ⤓ ]│ │
│  └─────────────────────────┘ │
│                              │
│        [   Check   ]         │
├─────────────────────────────┤
│  ⌂Home  ▶Quiz  ▲Prog  ⚙Set  │
└─────────────────────────────┘
```

> Chip lift + selection haptic on pickup; valid drop zone shows accent border; snap-to on release. Drag has a tap-accessible fallback for VoiceOver/TalkBack (see accessibility doc): pick chip, then tap target.

## Quiz — Feedback States

```
CORRECT                          GENTLE CORRECTION
┌─────────────────────────┐      ┌─────────────────────────┐
│ ✓ hard-working and      │      │ – careless and lazy     │  ← your pick, caution
│   careful   (success)   │      │                         │     fill + dash (NO red X)
│                         │      │ ✓ hard-working and      │  ← correct shown, success
│ Nice — locked in.       │      │   careful               │
│                         │      │                         │
│      [ Continue ]       │      │ Close — this one means  │
└─────────────────────────┘      │ "hard-working." You'll  │
                                 │ see it again soon.      │
                                 │      [ Continue ]       │
                                 └─────────────────────────┘
```

> Three redundant channels: color (success/caution), icon (check/dash), and copy. No alarm red, no error haptic, no "wrong!" language. Correction always teaches and re-queues the word.

## Progress

```
┌─────────────────────────────┐
│ Progress                     │  ← title
│                              │
│ 🔥 12-day streak             │  ← streak summary (warm)
│ ▓▓▓▓▓▓▓░░░░  this week       │  ← 7-day show-up dots/bar
│                              │
│ Your tiers                   │
│ ┌─────────────────────────┐ │
│ │ Foundation        ◕     │ │  ← tier row + mastery ring
│ │ 1,840 / 3,000 mastered  │ │
│ ├─────────────────────────┤ │
│ │ Advanced          ◑     │ │
│ │ 420 / 6,000             │ │
│ ├─────────────────────────┤ │
│ │ TOEFL          🔒 ◔     │ │  ← locked tier → tap opens Paywall
│ │ Unlock to start         │ │
│ └─────────────────────────┘ │
├─────────────────────────────┤
│  ⌂Home  ▶Quiz  ▲Prog  ⚙Set  │
└─────────────────────────────┘
```

> Streak and mastery are framed as growth, never deficit. Locked tiers are an invitation (tap → Paywall), not a wall. Counts shown internally; external marketing copy still avoids committing word counts ([PRODUCT_REQUIREMENTS_DOCUMENT.md](../02-product-definition/PRODUCT_REQUIREMENTS_DOCUMENT.md)).

## Settings

```
┌─────────────────────────────┐
│ Settings                     │
│                              │
│ ACCOUNT                      │
│  Sign in / sync          ›   │  ← cloud sync (free)
│  Restore purchases       ›   │
│  Have a teacher code?    ›   │  ← referral redeem (flow 6)
│                              │
│ CONTENT                      │
│  Unlock content          ›   │  → Paywall
│  Active tier: Foundation ›   │
│                              │
│ STUDY                        │
│  Daily reminder       [ ●]   │  ← single gentle reminder toggle
│  Appearance: System      ›   │  ← System / Dark / Light (dark default)
│                              │
│ ABOUT                        │
│  Privacy · Terms · Help  ›   │
├─────────────────────────────┤
│  ⌂Home  ▶Quiz  ▲Prog  ⚙Set  │
└─────────────────────────────┘
```

> No ads, no tracking toggles to apologize for (privacy promise). Appearance defaults to System with Dark fallback. Reminder is opt-in and singular.

## Paywall

```
┌─────────────────────────────┐
│              ✕               │  ← dismissible (no trap)
│  Unlock TOEFL Vocabulary     │  ← contextual to trigger
│                              │
│  • Audio pronunciations      │
│  • Official-test context     │
│  • Yours forever — no        │
│    subscription, no ads      │
│                              │
│ ┌─────────────────────────┐ │
│ │ TOEFL          $14.99    │ │
│ │ one-time      [ Unlock ] │ │  ← primary
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ Premium Pass  $29.99/yr  │ │  ← value anchor
│ │ Unlocks ALL paid tiers   │ │
│ │              [ Choose ]  │ │
│ └─────────────────────────┘ │
│  Teacher code TEACHER_MARIA  │  ← if active: shows discount
│  applied · 20% off           │
│  Restore purchases           │  ← always present
└─────────────────────────────┘
```

> Honest framing per Marketing Pillars: own-forever, zero-ads, best-bang-for-buck. Always dismissible. Referral discount shows struck-through original. No auto-renew dark patterns.

## Onboarding and Knowledge Map

```
SELF-SEGMENT                     ADAPTIVE Y/N                KNOWLEDGE MAP REVEAL
┌─────────────────────┐          ┌─────────────────────┐    ┌─────────────────────┐
│ Where are you with   │         │ Do you know this?   │    │ You already know    │
│ English?             │         │                     │    │                     │
│ ( ) Just starting    │         │     ubiquitous      │    │      ~1,840         │
│ ( ) I get by         │         │                     │    │       words         │
│ (•) I'm advanced     │         │  [ No ]    [ Yes ]  │    │                     │
│ ( ) Prepping a test  │         │                     │    │ ▓▓▓▓▓▓░░░░░░        │
│                      │         │   ●●●○○ ~item 3/~15 │    │ known·learning·new  │
│   [   Continue   ]   │         │                     │    │                     │
└─────────────────────┘          └─────────────────────┘    │  [ Start learning ] │
                                                             └─────────────────────┘
```

> Self-segmentation seeds first item difficulty. Adaptive quiz shows approximate progress, not a hard count (it ends on SE threshold). Pseudo-words appear inline among real items (not visually flagged). The reveal is the one allowed celebratory motion moment — endowed-progress effect. Full logic in [ONBOARDING_FLOW_SPEC.md](./ONBOARDING_FLOW_SPEC.md).

## Open Questions

- **Tablet/large layout:** these frames are phone-first; confirm whether a two-column tablet layout is in MVP scope or deferred.
- **Audio glyph placement:** shown next to phonetics; confirm whether audio autoplay-on-reveal is wanted on pronunciation tiers or strictly tap-to-play.
- **Home greeting personalization:** uses first name when an account exists; confirm fallback copy for account-less users.
