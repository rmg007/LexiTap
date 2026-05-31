---
title: User Stories and Job Stories
category: product
status: active
updated: 2026-05-31
priority: P1
tags: [user-stories, epics, onboarding, srs, sync, gamification, teacher-advocate]
---

# User Stories — LexiTap

User stories grouped by epic, each with acceptance criteria. Requirements detail lives in [PRODUCT_REQUIREMENTS_DOCUMENT.md](./PRODUCT_REQUIREMENTS_DOCUMENT.md); prioritization in [FEATURE_BACKLOG.md](./FEATURE_BACKLOG.md). Personas: **Learner** (ESL user, the primary persona), **Test-Prep Learner** (TOEFL/IELTS candidate, high urgency), **Professional** (Business English), **Teacher Advocate** (referral partner).

## Table of Contents

- [Epic: Onboarding](#epic-onboarding)
- [Epic: Daily Review](#epic-daily-review)
- [Epic: Learning New Words](#epic-learning-new-words)
- [Epic: Progress Tracking](#epic-progress-tracking)
- [Epic: Purchasing Exam Packs](#epic-purchasing-exam-packs)
- [Epic: Streak and Gamification](#epic-streak-and-gamification)
- [Epic: Cloud Sync Across Devices](#epic-cloud-sync-across-devices)
- [Epic: Teacher Advocate Redemption](#epic-teacher-advocate-redemption)

## Epic: Onboarding

**US-O1 — Self-segment my level.**
As a Learner, I want to declare my goals and rough level in a few taps so that the app starts me at the right place without a stressful test.
- Single screen, ≤3 taps, no typing.
- Beginners can skip the diagnostic and land directly in Foundation.

**US-O2 — Discover what I already know.**
As a Learner, I want an adaptive diagnostic that adjusts to my answers so that it pinpoints my level quickly without boring or overwhelming me.
- Adaptive Yes/No items (correct → harder, wrong → easier).
- Terminates on confidence (SE-based), ~10–25 items, no fixed-count progress bar.
- Pseudo-words detect overclaiming and correct the estimate.

**US-O3 — Feel a win immediately.**
As a Learner, I want to see "you already know ~X words" at the end of onboarding so that I feel motivated to continue.
- Knowledge Map reveal within ~90 seconds total.
- Discovery framing — no "test" or "placement" language.

## Epic: Daily Review

**US-D1 — Do today's review fast.**
As a Learner, I want a clear "review N words today" action on Home so that I can start my daily session in one tap.
- CTA above the fold; respects the daily review cap.

**US-D2 — Review without typing.**
As a Learner, I want to answer by tapping and dragging so that I can study comfortably on a phone, including one-handed.
- MultipleChoice + DragDrop only; no `TextInput` in the flow.

**US-D3 — Come back after a gap without punishment.**
As a Learner, I want a gentle catch-up when I miss days so that returning doesn't feel like a wall of overdue cards.
- Soft catch-up re-anchors overdue reviews across days.
- Welcome-back state on first re-open after >3 days; no shame copy.

## Epic: Learning New Words

**US-L1 — See a word in context.**
As a Learner, I want each word to show a definition, example sentences, and an image so that I understand real usage, not just a dictionary gloss.
- Conversational definition, POS, 2–3 example sentences, image.

**US-L2 — Hear correct pronunciation in both accents.**
As a Test-Prep Learner, I want to tap US or GB flags to hear the word so that I learn to recognize both major accents.
- Both accents shown simultaneously; tap either to play.

**US-L3 — Have new words scheduled for me.**
As a Learner, I want the app to decide when to re-show a word so that I don't have to manage my own study schedule.
- Fixed 1/3/7/14/30 intervals driven by mastery 0–5.

## Epic: Progress Tracking

**US-P1 — See my mastery.**
As a Learner, I want a view of how many words I've mastered so that I feel my progress is real.
- Mastery distribution (0–5) + total known estimate.

**US-P2 — See what's ahead.**
As a Test-Prep Learner, I want to see my curriculum and remaining words so that I can gauge how close I am to my goal.
- Knowledge Map shows known vs remaining; no leaderboard framing.

## Epic: Purchasing Exam Packs

*(Phase 3+ — not in MVP, captured for sequencing.)*

**US-B1 — Buy a single exam pack for test-prep content.**
As a Test-Prep Learner, I want to buy just the exam pack I need so that I only pay for the TOEFL/IELTS content my deadline requires.
- One-time non-consumable IAP at $9.99 per pack (`com.lexitap.exam.{toefl,ielts,gre,gmat,business}`); restores across devices via account.

**US-B2 — Get every exam pack for one price.**
As a Professional, I want an All-Exams bundle that unlocks every exam pack including future drops so that I get the best value.
- `com.lexitap.bundle.full` at $29.99 grants `all_exams`, unlocking every exam pack current and future. Owners of 1 or 2 packs can upgrade for the difference ($19.99 / $9.99).

**US-B3 — Restore my purchases.**
As a Learner, I want to restore purchases on a new device so that I don't pay twice.
- Restore button; entitlements held in RevenueCat `CustomerInfo` (never written to user.db).

## Epic: Streak and Gamification

**US-G1 — Keep my streak alive.**
As a Learner, I want a daily streak counter so that I have a reason to come back every day.
- Streak increments on a qualifying daily session.

**US-G2 — Not lose my streak to one bad day.**
As a Learner, I want a streak freeze so that a single missed day doesn't erase my progress.
- Banked freeze auto-consumed on a missed day; no red-badge guilt.

## Epic: Cloud Sync Across Devices

**US-S1 — Never lose my progress.**
As a Learner, I want my progress backed up automatically so that losing or upgrading my phone doesn't wipe months of study.
- Free, automatic, background sync of mastery/review dates/streak/history.

**US-S2 — Continue on another device.**
As a Learner, I want to sign in on a new device and pick up where I left off so that I can study across my phone and tablet.
- Sign-in restores full progress (Phase 2 device-switch test).

**US-S3 — Study offline.**
As a Learner, I want the app to work without a connection so that I can study on a commute.
- Fully usable offline; results queue and sync later, never blocking the UI.

## Epic: Teacher Advocate Redemption

*(Phase 3+ — referral system ships with the paid exam packs.)*

**US-T1 — Use my teacher's code.**
As a Learner, I want to enter my teacher's referral code so that I get an exam pack granted to me.
- Referral code grants the entitled exam pack; code validated via Supabase; no off-store discount steering.

**US-T2 — Earn non-cash rewards as a teacher.**
As a Teacher, I want active student referrals attributed to my code so that I can earn exam-pack grants or credits to gift.
- Active referrals attribute to teacher; rewards are digital-only and require legal/tax review before launch.

**US-T3 — Redeem a promo code.**
As a Learner, I want to redeem a goodwill promo code so that I can unlock an exam pack for free when given one.
- Promo code grants the entitled exam pack; tracked in Supabase.
