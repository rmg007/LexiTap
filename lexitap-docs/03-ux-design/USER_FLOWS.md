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
- [6. Redeeming a Teacher Referral Code](#6-redeeming-a-teacher-referral-code)
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
3. If a teacher advocate code is active (flow 6), the extended trial is shown without steering users to off-store discounts.
4. User taps **Unlock** → native StoreKit / Google Play Billing purchase sheet opens (IAP adapter). Store returns one of: `cancelled` / `pending` / `error` / receipt token.
5. Receipt token is validated server-side by RevenueCat / `validate_receipt` Supabase Edge Function. On valid receipt: Edge Function writes entitlement to `user_entitlements_sync` (service role); `UnlockTierUseCase` mirrors the verified entitlement to local `user.db`; tier content unlocks; confirmation toast. On Premium Pass, all current and future paid tiers unlock. A pending/deferred receipt (e.g. Apple "Ask to Buy") shows a "We'll unlock as soon as it's approved" state — no local entitlement is written until validation succeeds.
6. **Restore purchases** is always available (Settings + Paywall footer) for reinstalls/new devices.

```
trigger ▶ PAYWALL sheet ▶ Unlock ▶ native purchase
   │                          ├─ receipt ─▶ server validation ─▶ entitlement persisted ─▶ content unlocked
   │                          ├─ pending ─▶ "We'll unlock as soon as it's approved." (no local entitlement yet)
   │                          └─ cancel/fail ─▶ back, no nag
   └─ teacher code active ─▶ extended trial shown
```

Edge cases: purchase pending/deferred (family approval) → "We'll unlock as soon as it's approved." Offline at purchase time → block gracefully with "connect to complete purchase," never lose entitlement once granted.

## 6. Redeeming a Teacher Referral Code

Goal: apply a teacher's code for an extended Premium trial and attribute the referral for non-cash advocate rewards ([PRODUCT_REQUIREMENTS_DOCUMENT.md](../02-product-definition/PRODUCT_REQUIREMENTS_DOCUMENT.md) teacher network).

Steps:

1. Entry: Settings → "Have a teacher code?" or a deep-link from the teacher's shared message (e.g. code `TEACHER_MARIA`).
2. User selects the code from a list (or it is prefilled from the deep link) — selection-based, no free typing where avoidable; if manual entry is unavoidable it uses a constrained code picker, not a free-text quiz input (the no-typing rule governs quiz flows specifically).
3. App validates the code (online check; cached for offline reuse once validated).
4. Valid → extended trial attaches to the account and is reflected at the Paywall (flow 5). A confirmation shows the trial and the teacher attribution.
5. Invalid/expired → gentle inline message, no penalty, option to try another.

```
Settings/deep-link ▶ select code ▶ validate
                                     ├─ valid ─▶ trial attached ▶ shown at Paywall
                                     └─ invalid ─▶ gentle retry
```

Edge case: code applied before any account exists → store provisionally on device, bind to account on creation/sign-in so attribution survives sync.

## 7. Switching Devices (Sync)

Goal: cloud sync is free and reliable — a direct differentiator against Knowji's device-bound SRS and WordUp's sync failures ([PRODUCT_REQUIREMENTS_DOCUMENT.md](../02-product-definition/PRODUCT_REQUIREMENTS_DOCUMENT.md)). Offline-first: SQLite is source of truth, cloud (Supabase) is the sync layer.

Steps:

1. On the new device, install and launch → choose **Sign in** (instead of starting fresh) on the first-run account screen.
2. Authenticate → app pulls the cloud snapshot: SRS state, progress, entitlements, streak, settings.
3. Local SQLite is hydrated from the snapshot; conflict resolution favors the most recent per-record update (append-only SRS history is never retroactively rewritten, per [SYSTEM_ARCHITECTURE.md](../04-technical-architecture/SYSTEM_ARCHITECTURE.md) invariants).
4. User lands on Home with full continuity — same due words, same streak, same unlocked tiers (entitlements restored without re-purchase; Restore Purchases as backstop).
5. Ongoing: changes on any device sync in the background when online; fully usable offline between syncs.

```
NEW DEVICE ▶ Sign in ▶ pull cloud snapshot ▶ hydrate SQLite ▶ HOME (full continuity)
old device edits ─▶ cloud ─▶ background sync ─▶ new device (and vice versa)
```

Edge cases: offline at sign-in → allow read-only/cached start, complete hydration when online. Two devices edit concurrently → last-write-wins per record; SRS review events merge (append-only), they do not overwrite.

## 8. Maintaining and Recovering a Streak

Goal: the streak answers "did you show up today?" — the non-negotiable gamification mechanic, between Duolingo's compulsion and WordUp's toothlessness, with no guilt ([SRS_FORGIVENESS_MECHANICS.md](../02-product-definition/SRS_FORGIVENESS_MECHANICS.md)).

Steps:

1. Completing the day's first review session (or learn check) increments the streak by 1. Streak chip on Home updates with a single medium haptic. Showing up = maintained; there is no time-on-task or word-count target.
2. **At-risk state:** if the user opens the app and today's session is not yet done, the streak chip shows the at-risk treatment (flame outline + caution ring) as a gentle nudge — not a countdown of doom.
3. **Streak freeze (recovery):** a missed day consumes an available streak-freeze automatically (earned/granted per the freeze design in Backlog #43), preserving the streak silently. The user is informed warmly afterward ("A freeze kept your streak — welcome back"), never shamed.
4. If no freeze is available and a day is missed, the streak resets to 0 with a soft, encouraging re-start message — no red, no guilt badge, no shrinking-heart drama.
5. Notifications (optional, opt-in) are a single gentle daily reminder, not aggressive re-engagement spam.

```
day complete ─▶ streak +1
app open, not done ─▶ AT-RISK chip (gentle)
missed day ─┬─ freeze available ─▶ auto-consume ─▶ streak preserved (warm note)
            └─ no freeze ─▶ reset to 0 ─▶ encouraging restart
```

## Open Questions

- **Referral code entry vs no-typing rule:** the no-typing rule is scoped to quiz flows; a constrained code entry/picker for referral codes is proposed. Confirm whether manual code typing is acceptable in Settings, or whether deep-link/scan-only is required.
- **Streak freeze accrual:** exact earn/grant cadence for freezes is owned by Backlog #43 (SRS Forgiveness design) and is referenced here, not decided.
- **Account-optional onboarding:** confirm whether cloud sync requires account at first run or can be deferred (this doc assumes deferred/skippable).
