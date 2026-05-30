---
title: User Flows
category: ux-design
status: active
updated: 2026-05-24
priority: P0
tags: [user-flows, navigation, screens, journeys, onboarding, srs, paywall, sync, streak]
---

# User Flows

Step-by-step flows plus ASCII flow diagrams for every core LexiTap journey. These describe behavior and decision points; per-screen layouts live in [screens/](./screens/README.md), tokens in [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md), and the diagnostic detail in [ONBOARDING_FLOW_SPEC.md](./ONBOARDING_FLOW_SPEC.md).

MVP screens are Home, Quiz, Progress, Settings (locked, [PRODUCT_REQUIREMENTS_DOCUMENT.md](../02-product-definition/PRODUCT_REQUIREMENTS_DOCUMENT.md)); Paywall and Onboarding/Knowledge Map are modal/first-run surfaces over that set. All quiz interaction is tap/drag/match/classify — never typing ([SYSTEM_ARCHITECTURE.md](../04-technical-architecture/SYSTEM_ARCHITECTURE.md)). Feedback is non-punitive throughout.

## Table of Contents

- [Flow Map Overview](#flow-map-overview)
- [1. First-Launch Onboarding and Diagnostic](#1-first-launch-onboarding-and-diagnostic)
- [2. Daily Review Session](#2-daily-review-session)
- [3. Learning New Words](#3-learning-new-words)
- [4. Hitting the Daily Cap (Forgiveness)](#4-hitting-the-daily-cap-forgiveness)
- [5. Purchasing Premium (Paywall)](#5-purchasing-premium-paywall)
- [7. Switching Devices (Sync)](#7-switching-devices-sync)
- [8. Maintaining and Recovering a Streak](#8-maintaining-and-recovering-a-streak)
- [Open Questions](#open-questions)

## Flow Map Overview

```
                       ┌──────────────────┐
   first launch  ───▶  │  ONBOARDING +    │
                       │  DIAGNOSTIC      │
                       │  → Knowledge Map │
                       └────────┬─────────┘
                                │ seeds SRS state
                                ▼
   returning launch  ───▶  ┌─────────┐
                           │  HOME   │◀──────────────┐
                           └────┬────┘                │
            ┌────────────┬──────┼───────┬─────────┐   │
            ▼            ▼      ▼        ▼         ▼   │
        REVIEW       LEARN   PROGRESS  SETTINGS  STREAK│
        SESSION      NEW              │  │        chip │
            │          │              │  ├─ redeem code│
            └────┬─────┘              │  ├─ sync       │
                 ▼                    │  └─ paywall ───┘
          (daily cap?)─yes─▶ FORGIVENESS sheet
                 │ no
                 ▼
           SESSION COMPLETE ─▶ streak +1 ─▶ HOME
```

## 1. First-Launch Onboarding and Diagnostic

Goal: place the user on the right difficulty and produce an endowed-progress "Knowledge Map" that boosts D1 retention. Full item-selection logic is in [ONBOARDING_FLOW_SPEC.md](./ONBOARDING_FLOW_SPEC.md).

Steps:

1. Cold open: brand splash → value framing (one screen, "Master vocabulary without typing"). No account required yet (offline-first).
2. **Self-segmentation screen:** user picks a starting band (e.g. "Just starting," "I get by," "I'm advanced," "Prepping for a test"). This seeds the diagnostic's first item difficulty.
3. **Adaptive Yes/No quiz:** each item asks "Do you know this word?" with a quick check. Correct → harder next item; wrong → easier. ~10–25 items.
4. **Pseudo-word probes:** 2–3 non-words seeded in to catch overclaiming. Claiming to know a pseudo-word down-weights self-reported knowledge.
5. **SE-based early exit:** stop when the standard error of the ability estimate drops below threshold (or item cap reached).
6. **Knowledge Map reveal:** animated segmented bar — "You already know ~X words. Y to learn." (the one allowed motion moment, [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)).
7. Optional account creation for cloud sync (skippable; can be done later in Settings). Land on Home.

```
SPLASH ▶ VALUE ▶ SELF-SEGMENT ▶ ADAPTIVE Y/N (10-25) ▶ SE<threshold? 
                                        │ no ─loop back
                                        ▼ yes
                              KNOWLEDGE MAP REVEAL ▶ (optional account) ▶ HOME
```

Edge cases: user quits mid-diagnostic → resume on next launch from last answered item. All pseudo-words flagged → cap self-claims, fall back to conservative placement.

## 2. Daily Review Session

Goal: clear today's due SRS items with gentle feedback; keep the streak alive.

Steps:

1. Home shows "N words due today" and a primary **Start review** button.
2. Tap → Quiz screen loads due words via the review use case ([SYSTEM_ARCHITECTURE.md](../04-technical-architecture/SYSTEM_ARCHITECTURE.md): `getWordsDueForReview`), capped at the soft daily cap.
3. For each word: present a widget (MultipleChoice or DragDrop at MVP). User taps/drags an answer.
4. Correct → `success` confirmation + soft success haptic; SRS mastery +1, next review date pushed out.
5. Incorrect → gentle correction (caution color + dash icon, no red X, no error haptic); correct answer shown; mastery −1, word re-queued sooner. Encouraging copy.
6. Repeat until the session set is exhausted or the daily cap is hit (→ flow 4).
7. **Session complete:** brief summary (words reviewed, accuracy as encouragement not grade), streak increments if this was the day's first completed session (→ flow 8). Return to Home.

```
HOME ▶ Start review ▶ [ WORD ▶ answer ▶ feedback ] × N ▶ SESSION COMPLETE ▶ streak+1 ▶ HOME
                                  │
                          cap reached? ─▶ FORGIVENESS sheet (flow 4)
```

Edge case: zero words due → Home surfaces "All caught up" and offers **Learn new words** instead (flow 3). No empty/broken quiz.

## 3. Learning New Words

Goal: introduce new vocabulary from the active tier and fold it into the SRS.

Steps:

1. From Home (or after an empty review queue) tap **Learn new words**.
2. App fetches the next batch of new words for the active tier (`getNewWords`, default 10).
3. Each word is presented in a brief **learn card**: word, definition, example sentence, audio (where the tier includes it), optional contextual image. User taps **Got it** to advance — no test pressure on first exposure.
4. After the learn batch, a short tap/drag check confirms initial encoding; results seed each word's starting mastery and first review date.
5. New words now enter the SRS schedule and appear in future review sessions.

```
HOME ▶ Learn new words ▶ [ LEARN CARD ▶ Got it ] × 10 ▶ quick check ▶ seed SRS ▶ HOME
```

Edge case: tier exhausted (no new words) → suggest upgrading the tier or, for free users, the next free tier / a relevant paid tier via the Paywall (flow 5), framed as a natural next step, never a hard wall.

## 4. Hitting the Daily Cap (Forgiveness)

Goal: prevent SRS-backlog-as-punishment, the documented WordUp churn driver ([PRODUCT_REQUIREMENTS_DOCUMENT.md](../02-product-definition/PRODUCT_REQUIREMENTS_DOCUMENT.md)). Cap + soft catch-up + no guilt is a locked decision.

Steps:

1. During a review session, when the user reaches the soft daily cap, present a calm **bottom sheet**: "You've done your reviews for today. Nice work."
2. The day's streak is already secured (showing up = streak maintained). No red badge, no "X words overdue" guilt counter.
3. Offer two gentle options:
   - **Stop here** (recommended, default emphasis) → return to Home in the "done" state.
   - **Keep going** (soft catch-up) → continue reviewing beyond the cap voluntarily, with no penalty either way.
4. If the user stops with items still due, those items roll forward; the backlog is smoothed (soft catch-up redistributes overdue items across upcoming days rather than dumping them all tomorrow).

```
REVIEW ▶ cap reached ▶ FORGIVENESS sheet
                          ├─ Stop here ─▶ HOME (done, streak safe)
                          └─ Keep going ─▶ continue (no penalty) ─▶ Stop anytime
```

Anti-pattern guard: never show overdue counts as a red alarm or home-screen guilt badge ([SRS_FORGIVENESS_MECHANICS.md](../02-product-definition/SRS_FORGIVENESS_MECHANICS.md) anti-patterns).

## 5. Purchasing Premium (Paywall)

Goal: convert at the moment of genuine need (test prep urgency), with clear subscription framing and zero dark patterns. Pricing in [PRODUCT_REQUIREMENTS_DOCUMENT.md](../02-product-definition/PRODUCT_REQUIREMENTS_DOCUMENT.md).

Steps:

1. Trigger points: tier-exhaustion suggestion (flow 3), a locked tier tapped on Progress, or Settings → "Unlock content."
2. **Paywall sheet** presents Premium Pass monthly ($4.99/mo) and annual ($24.99/yr) options, plus the Common 3000 one-time unlock ($1.99) where applicable. Honest framing: cancel anytime, no auto-renew tricks, no ads.
4. User taps **Unlock** → native StoreKit / Google Play Billing purchase sheet opens (IAP adapter). Store returns one of: `cancelled` / `pending` / `error` / receipt token.
5. Receipt token is validated server-side by RevenueCat. On valid receipt: RevenueCat returns verified `CustomerInfo`; app unlocks content in memory; confirmation toast. On Premium Pass, all current and future paid tiers unlock. A pending/deferred receipt (e.g. Apple "Ask to Buy") shows a "We'll unlock as soon as it's approved" state.
6. **Restore purchases** is always available (Settings + Paywall footer) for reinstalls/new devices.

```
trigger ▶ PAYWALL sheet ▶ Unlock ▶ native purchase
   │                          ├─ receipt ─▶ RevenueCat validation ─▶ CustomerInfo cached ─▶ content unlocked
   │                          ├─ pending ─▶ "We'll unlock as soon as it's approved."
   │                          └─ cancel/fail ─▶ back, no nag
```

Edge cases: purchase pending/deferred (family approval) → "We'll unlock as soon as it's approved." Offline at purchase time → block gracefully with "connect to complete purchase."
