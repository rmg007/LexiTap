---
title: Product Requirements Document
category: product
status: active
updated: 2026-05-24
priority: P0
tags: [prd, requirements, mvp, srs, recognition, no-typing, subscription, B2B-activation]
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
- [Accounts and Subscription Gating](#accounts-and-subscription-gating)
- [Content](#content)
- [Success Metrics](#success-metrics)
- [Decision Notes](#decision-notes)

---

## Product Summary

LexiTap is an offline-first, high-efficacy English vocabulary acquisition app for global ESL learners and cram schools. The free Foundation tier builds the MVP daily recognition habit through tap, drag, match, and classify interactions; Advanced remains a free tier as the launch-wave content matures. A unified Premium Subscription ($4.99/mo, $24.99/yr) and bulk B2B Licensing Portal for language schools unlock the specific high-stakes content (TOEFL, IELTS, Business English, etc.).

The core differentiators are:
1. **Low-cost Subscription & B2B bulk packages** (flexible, institutional-friendly).
2. **No-typing recognition practice** (fast, mobile-native tap/drag/match/classify reviews).
3. **Offline-first local SQLite authority** (for 5-minute commute windows).
4. **Free cloud sync mirror** (never lose progress; cloud is not the source of truth).

---

## Goals and Non-Goals

### Goals (MVP)
- **G1** — Ship a working iOS + Android app with the free Foundation tier, a no-typing recognition quiz loop, and a fixed-interval SRS scheduler.
- **G2** — Deliver an engaging daily habit hook (streak counter) without guilt mechanics.
- **G3** — Implement B2B seat token activation allowing cram school students to unlock Premium immediately.
- **G4** — Build durable vocabulary recognition through tap, drag, match, and classify interactions without quiz text entry.
- **G5** — Validate core retention metrics (D7 > 30%) and B2B pilot interest before final store release.

### Non-Goals (MVP)
- In-app subscription payments and store IAP flows (mocked in Phase 1-2, live in Phase 3).
- ImageMatch and Classification widgets (Phase 4).
- Active production typing/speaking, raw QWERTY keyboard character entry, audio pronunciation analysis, or AI chatbot conversation.

---

## Target User

- **Individual Test-Takers:** Non-native English speakers preparing for TOEFL/IELTS/GRE. Requires fast recognition of definitions, collocations, idioms, and exam-relevant vocabulary under deadline pressure.
- **Cram School Classes:** Bundles of 20–200 students managed by a course teacher. Requires group progress tracking and simple seat allocation.

---

## MVP Scope at a Glance

| Area | MVP Includes | Deferred |
|---|---|---|
| Tiers | Foundation (free) + TOEFL (locked premium content) | Advanced full list, all other paid tiers |
| Screens | Home, Quiz, Progress, Settings, Paywall | School admin portal (web-only) |
| Widgets | MultipleChoice, DragDrop | ImageMatch, Classification |
| Hooks | useSpacedRepetition, useMastery, useQuizSession, useSync, useSeatLicensing | — |
| SRS | Fixed 1/3/7/14/30 days, mastery integer scale 0–5 | Dynamic FSRS parameters |
| Onboarding | Simplified adaptive diagnostic | Full IRT modeling |
| Accounts | Email/password + Google Sign-In + Sign in with Apple + B2B seat code entry | — |
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
- **Requirement:** Handle account sync, Google Sign-In, and B2B school license activation.
- **Acceptance Criteria:**
  - Includes a text field: "Enter Cram School Seat Token."
  - Redeeming a valid token updates local and Supabase accounts to "Premium Subscription" status.
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

## Accounts and Subscription Gating

- **Gating Rules:**
  - **Free Tier:** Access to Foundation (top 3,000 words) and Advanced (3,001–9,000 words).
  - **Premium Tier:** Access to TOEFL, IELTS, Business English, GRE, GMAT, and post-launch content packs.
- **B2B Seat Activation:**
  - Students enter an 8-character token (e.g., `CP-A7K2D`) in Settings.
  - App calls Supabase RPC `activate_seat_license(token)`.
  - On validation, the token is bound to the user's UUID, mapping their account to active Premium.
  - B2B licenses can be revoked by the administrator, returning the client to the free tier on next sync.

## Content

- **MVP:** Foundation vocabulary plus TOEFL premium-content path for validation.
- **Launch Wave:** Advanced free tier, IELTS, Business English, and Common 3000 one-time unlock.
- **Post-Launch:** GRE, GMAT, idioms, and phrasal verbs ship as Premium Pass content drops.
- **Sourcing Rule:** All lists must pass provenance, license, enrichment, and human-review gates before they enter `words.db`.

---

## Success Metrics

| Metric | Target | Phase |
|---|---|---|
| D7 Active Retention | > 30% | Phase 2 |
| B2B Seat Activation Rate | > 85% of purchased bulk seats | Phase 2 |
| Recognition Review Accuracy | Avg improvement of 20% over 14 days | Phase 2 |
| Blended Monthly Churn | < 8% across individual premium subscribers | Phase 3 |

## Decision Notes

- Sign in with Apple is required in Phase 3 if Google Sign-In remains in scope, so both auth paths can be tested before store submission.
- Quiz and assessment UX is recognition-only. Active production typing/speaking is out of scope for LexiTap's core loop.
