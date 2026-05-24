---
title: Product Requirements Document
category: product
status: active
updated: 2026-05-24
priority: P0
tags: [prd, requirements, mvp, srs, spelling, active-recall, subscription, B2B-activation]
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
- [Open Questions](#open-questions)

---

## Product Summary

LexiTap is an offline-first, high-efficacy English vocabulary acquisition app for global ESL learners and cram schools. The free Foundation and Advanced tiers build a daily active recall habit. A unified Premium Subscription ($4.99/mo, $24.99/yr) and bulk B2B Licensing Portal for language schools unlock the specific high-stakes content (TOEFL, IELTS, Business English, etc.). 

The core differentiators are:
1. **Low-cost Subscription & B2B bulk packages** (flexible, institutional-friendly).
2. **Active Recall spelling-assembly pedagogy** (high retention, exam-ready).
3. **Offline-first reliability** (for 5-minute commute windows).
4. **Free cloud sync** (never lose progress).

---

## Goals and Non-Goals

### Goals (MVP)
- **G1** — Ship a working iOS + Android app with the free Foundation tier, a spelling-assembly quiz loop, and a fixed-interval SRS scheduler.
- **G2** — Deliver an engaging daily habit hook (streak counter) without guilt mechanics.
- **G3** — Implement B2B seat token activation allowing cram school students to unlock Premium immediately.
- **G4** — Achieve active recall spelling proficiency without raw mobile keyboard text entry.
- **G5** — Validate core retention metrics (D7 > 30%) and B2B pilot interest before final store release.

### Non-Goals (MVP)
- In-app subscription payments and store IAP flows (mocked in Phase 1-2, live in Phase 3).
- ImageMatch and Classification widgets (Phase 4).
- Raw QWERTY keyboard character entry, audio pronunciation analysis, or AI chatbot conversation.

---

## Target User

- **Individual Test-Takers:** Non-native English speakers preparing for TOEFL/IELTS/GRE. Requires strict active spelling proficiency for exam writing sections.
- **Cram School Classes:** Bundles of 20–200 students managed by a course teacher. Requires group progress tracking and simple seat allocation.

---

## MVP Scope at a Glance

| Area | MVP Includes | Deferred |
|---|---|---|
| Tiers | Foundation (free) + TOEFL (locked premium content) | Advanced full list, all other paid tiers |
| Screens | Home, Quiz, Progress, Settings, Paywall | School admin portal (web-only) |
| Widgets | MultipleChoice, DragDrop, SpellingActiveRecall | ImageMatch, Classification |
| Hooks | useSpacedRepetition, useMastery, useQuizSession, useSync, useSeatLicensing | — |
| SRS | Fixed 1/3/7/14/30 days, mastery integer scale 0–5 | Dynamic FSRS parameters |
| Onboarding | Simplified adaptive diagnostic | Full IRT modeling |
| Accounts | Email/password + Google Sign-In + B2B seat code entry | Apple Sign-In (Phase 5) |
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
- **Requirement:** Execute spelling and recognition assessments using MultipleChoice, DragDrop, and SpellingActiveRecall widgets.
- **Acceptance Criteria:**
  - SpellingActiveRecall displays scrambled letter buttons for assembly; no raw keyboard text inputs.
  - Attempts are captured via `useQuizSession` to update SRS schedules.
  - Session terminates on daily caps.

### Progress
- **Requirement:** Display word mastery level counts (0–5) and total estimated known vocabulary.
- **Acceptance Criteria:**
  - Renders Knowledge Map reflecting onboarding placement.
  - Clearly demonstrates active vs. passive word mastery levels.

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
| **SpellingActiveRecall** | Yes | Scrambled character button assembly layout to spell the word. | Displays letter bank; user taps letters in sequence; handles backspace/clear; no standard QWERTY keyboard used. |

---

## Spaced Repetition System (SRS)

- **Intervals:** Fixed 1, 3, 7, 14, and 30 days.
- **Mastery:** 0–5 integer scale. Active recall spelling correct responses promote mastery; recognition-only correct responses promote to a maximum of level 3. Incorrect answers demote intervals per standard scheduler rules.
- **Forgiveness Layer (REQUIRED):** Daily review caps, soft overdue catch-up distributions, and automatic streak freezes. Zero punitive shame notifications.

---

## Onboarding Diagnostic

- **Adaptive Diagnostic:** Self-segmentation screen → adaptive Yes/No matching test (~15 words) → pseudo-word audit (anti-guessing correction) → estimated Knowledge Map reveal.
- **Acceptance Criteria:** Takes less than 90 seconds. Beginners can bypass directly to the first word lists.

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

---

## Success Metrics

| Metric | Target | Phase |
|---|---|---|
| D7 Active Retention | > 30% | Phase 2 |
| B2B Seat Activation Rate | > 85% of purchased bulk seats | Phase 2 |
| Spelling Widget Accuracy | Avg improvement of 20% in active recall over 14 days | Phase 2 |
| Blended Monthly Churn | < 8% across individual premium subscribers | Phase 3 |
