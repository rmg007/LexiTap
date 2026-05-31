---
title: Product Requirements Document
category: product
status: active
updated: 2026-05-31
priority: P0
tags: [prd, requirements, mvp, srs, recognition, no-typing, one-time, exam-packs]
---

# Product Requirements Document — LexiTap MVP

This is the authoritative product requirements specification for the LexiTap MVP (Phase 1). It expands the tracking milestones in [../../ROADMAP.md](../../ROADMAP.md) into decision-grade specifications with acceptance criteria. Scope constraints live in [OUT_OF_SCOPE.md](./OUT_OF_SCOPE.md); sequencing in [ROADMAP.md](./ROADMAP.md).

## Table of Contents

- [Product Summary](#product-summary)
- [Goals and Non-Goals](#goals-and-non-goals)
- [Target User](#target-user)
- [MVP Scope at a Glance](#mvp-scope-at-a-glance)
- [Screens](#screens)
- [Assessment Widgets](#assessment-widgets)
- [Spaced Repetition System](#spaced-repetition-system-srs)
- [Onboarding Diagnostic](#onboarding-diagnostic)
- [Gamification](#gamification)
- [Accounts and Entitlement Gating](#accounts-and-entitlement-gating)
- [Content](#content)
- [Success Metrics](#success-metrics)
- [Decision Notes](#decision-notes)

---

## Product Summary

LexiTap is an offline-first, high-efficacy English vocabulary acquisition app for global ESL learners. The free frequency categories (Foundation, Advanced, Most Common 3000, Most Common 9000) build the MVP daily recognition habit through tap, drag, match, and classify interactions — all free, with full word + sentence audio, SRS, streaks, and themes. One-time non-consumable exam packs (TOEFL, IELTS, GRE, GMAT, Business English) at $9.99 each, or an All-Exams bundle at $29.99, unlock the specific high-stakes exam content. B2B cram-school seat packs are deferred out of launch.

The core differentiators are:
1. **One-time exam packs & All-Exams bundle** (no subscriptions, buy once, own forever).
2. **No-typing recognition practice** (fast, mobile-native tap/drag/match/classify reviews).
3. **Offline-first local SQLite authority** (for 5-minute commute windows).
4. **Free cloud sync mirror** (never lose progress; cloud is not the source of truth).

---

## Goals and Non-Goals

### Goals (MVP)
- **G1** — Ship a working iOS + Android app with the free frequency categories, a no-typing recognition quiz loop, and a fixed-interval SRS scheduler.
- **G2** — Deliver an engaging daily habit hook (streak counter) without guilt mechanics.
- **G3** — Implement one-time exam-pack purchase flows allowing learners to unlock exam content immediately.
- **G4** — Build durable vocabulary recognition through tap, drag, match, and classify interactions without quiz text entry.
- **G5** — Validate core retention metrics (D7 > 30%) before final store release.

### Non-Goals (MVP)
- In-app one-time purchase payments and store IAP flows (mocked in Phase 1-2, live in Phase 3).
- B2B cram-school seat packs (deferred entirely out of launch; door left open in the entitlement model).
- ImageMatch and Classification widgets (Phase 4).
- Active production typing/speaking, raw QWERTY keyboard character entry, audio pronunciation analysis, or AI chatbot conversation.

---

## Target User

- **Individual Test-Takers:** Non-native English speakers preparing for TOEFL/IELTS/GRE. Requires fast recognition of definitions, collocations, idioms, and exam-relevant vocabulary under deadline pressure.
- **Cram School Classes (deferred):** Bundles of 20–200 students managed by a course teacher. B2B seat packs are deferred out of launch; the entitlement model leaves the door open but no B2B feature is built for launch.

---

## MVP Scope at a Glance

| Area | MVP Includes | Deferred |
|---|---|---|
| Categories | Free frequency categories (Foundation, Advanced, Most Common 3000/9000) + TOEFL exam pack (locked one-time content) | All other exam packs |
| Screens | Home, Quiz, Progress, Settings, Paywall | B2B school admin portal (web-only, deferred) |
| Widgets | MultipleChoice, DragDrop | ImageMatch, Classification |
| Hooks | useSpacedRepetition, useMastery, useQuizSession, useSync, useEntitlements | — |
| SRS | Fixed 1/3/7/14/30 days, mastery integer scale 0–5 | Dynamic FSRS parameters |
| Onboarding | Simplified adaptive diagnostic | Full IRT modeling |
| Accounts | Email/password + Google Sign-In + Sign in with Apple | — |
| Sync | Free, automatic, background progress mirroring | — |

---

## Screens

### Home
- **Requirement:** Surface the next study action ("Review N words") plus active streak and a progress summary.
- **Acceptance Criteria:**
  - Review CTA triggers quiz session from the local database.
  - Current streak is visible; protected by the streak-freeze forgiveness system.
  - Fully functional offline.

### Quiz
- **Requirement:** Execute recognition assessments using MultipleChoice and DragDrop in MVP, with no quiz `TextInput`.
- **Acceptance Criteria:**
  - MultipleChoice prompts the learner to tap the best answer from 2-4 options.
  - DragDrop prompts the learner to place a word or meaning chip into the correct target.
  - Quiz and assessment paths use no `TextInput`, keyboard entry, or spelling-production controls.
  - Attempts are captured via `useQuizSession` to update SRS schedules.
  - Session terminates on daily caps.

### Progress
- **Requirement:** Display word mastery level counts (0–5) and total estimated known vocabulary.
- **Acceptance Criteria:**
  - Renders Knowledge Map reflecting onboarding placement.
  - Clearly demonstrates recognition mastery, due reviews, and retained vocabulary growth.

### Settings
- **Requirement:** Handle account sync, Google Sign-In, and restore purchases.
- **Acceptance Criteria:**
  - Includes a "Restore Purchases" action that re-reads exam-pack and All-Exams entitlements from RevenueCat.
  - Restoring re-grants owned entitlements (held in RevenueCat `CustomerInfo`, never written to user.db).
  - Features data-deletion path (GDPR).

---

## Assessment Widgets

| Widget | MVP | Description | Acceptance Criteria |
|---|---|---|---|
| **MultipleChoice** | Yes | Tap 1-of-4 definitions for a prompted word. | 1 correct + 3 distractor definitions; logs speed and accuracy. |
| **DragDrop** | Yes | Touch drag a vocabulary word to its target meaning. | Snap physics work reliably on mobile touch targets. |
| **ImageMatch** | No | Tap the image that best represents a prompted word or meaning. | Deferred to Phase 4; no `TextInput`. |
| **Classification** | No | Tap the correct category bucket for a word, idiom, or phrasal verb. | Deferred to Phase 4; no `TextInput`. |

---

## Spaced Repetition System (SRS)

- **Intervals:** Fixed 1, 3, 7, 14, and 30 days.
- **Mastery:** 0–5 integer scale. Correct recognition responses promote mastery according to the fixed scheduler; incorrect answers demote intervals per standard scheduler rules.
- **Forgiveness Layer (REQUIRED):** Daily review caps, soft overdue catch-up distributions, and automatic streak freezes. Zero punitive shame notifications.

---

## Onboarding Diagnostic

- **Adaptive Diagnostic:** Self-segmentation screen → adaptive Yes/No matching test (~15 words) → pseudo-word audit (anti-guessing correction) → estimated Knowledge Map reveal.
- **Acceptance Criteria:** Takes less than 90 seconds. Beginners can bypass directly to the first word lists.

## Gamification

- **Streak Counter:** Tracks daily review participation without punitive overdue counts or shame copy.
- **Timezone Rule:** Streak boundaries are evaluated in the user's IANA timezone, never UTC.
- **Forgiveness:** Daily review caps, soft catch-up, and streak freezes follow [SRS_FORGIVENESS_MECHANICS.md](./SRS_FORGIVENESS_MECHANICS.md).

---

## Accounts and Entitlement Gating

- **Gating Rules:**
  - **Free (no product, ever):** Foundation (A2-B1), Advanced (B2-C1), Most Common 3000, and Most Common 9000 — all free, with word + sentence audio, SRS, streaks, and themes. Words carry many-to-many category tags (a word can be in Foundation AND Most Common 3000 AND an exam pack at once).
  - **Paid (one-time non-consumable only):** Exam packs `com.lexitap.exam.{toefl,ielts,gre,gmat,business}` at $9.99 each (each grants entitlement `exam_{name}`); the **All-Exams bundle** `com.lexitap.bundle.full` at $29.99 (grants `all_exams`, unlocking every exam pack current and future); and upgrade SKUs `com.lexitap.bundle.upgrade1` ($19.99, for owners of 1 pack) and `com.lexitap.bundle.upgrade2` ($9.99, for owners of 2 packs), both granting `all_exams`.
- **Entitlements:** Per-pack plus `all_exams`, held in RevenueCat `CustomerInfo` (memory only) and NEVER written to user.db. Access check: `isFree OR owns(pack) OR owns(all_exams)`.
- **B2B Seat Activation (deferred):** Cram-school seat packs are deferred entirely out of launch — nothing is built. The entitlement model leaves the door open for a future seat-grant mechanism.
- **Audio:** Free and universal on all content (word + sentence), generated via cheap neural TTS (Amazon Polly / Google). Not a paid feature.
- **Authoritative pricing source:** [../08-financial-legal/REVENUE_MODEL_PRICING.md](../08-financial-legal/REVENUE_MODEL_PRICING.md).

## Content

- **MVP:** Free Foundation vocabulary plus the TOEFL exam-pack path for validation.
- **Launch Wave:** Advanced (free), Most Common 3000/9000 (free), IELTS and Business English exam packs.
- **Post-Launch:** GRE, GMAT, idioms, and phrasal verbs ship as additional exam-pack content drops (covered by `all_exams`).
- **Sourcing Rule:** All lists must pass provenance, license, enrichment, and human-review gates before they enter `words.db`.

---

## Success Metrics

| Metric | Target | Phase |
|---|---|---|
| D7 Active Retention | > 30% | Phase 2 |
| Exam-Pack Purchase Conversion | > 5% of active free learners buy a pack or bundle | Phase 3 |
| Recognition Review Accuracy | Avg improvement of 20% over 14 days | Phase 2 |
| All-Exams Bundle Attach Rate | > 30% of paying customers choose the bundle or upgrade | Phase 3 |

## Decision Notes

- Sign in with Apple is required in Phase 3 if Google Sign-In remains in scope, so both auth paths can be tested before store submission.
- Quiz and assessment UX is recognition-only. Active production typing/speaking is out of scope for LexiTap's core loop.
