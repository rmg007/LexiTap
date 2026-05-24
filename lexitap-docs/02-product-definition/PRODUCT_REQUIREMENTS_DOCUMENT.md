---
title: Product Requirements Document
category: product
status: active
updated: 2026-05-24
priority: P0
tags: [prd, requirements, mvp, srs, onboarding, assessment, sync, gamification]
---

# Product Requirements Document — LexiTap MVP

This is the authoritative product requirements specification for the LexiTap MVP (Phase 1). It expands the agent-handoff summaries in [../../notion-docs/IMPLEMENTATION_ROADMAP.md](../../notion-docs/IMPLEMENTATION_ROADMAP.md) and [../../notion-docs/PRODUCT_STRATEGY.md](../../notion-docs/PRODUCT_STRATEGY.md) into decision-grade requirements with acceptance criteria. Scope constraints live in [OUT_OF_SCOPE.md](./OUT_OF_SCOPE.md); sequencing in [ROADMAP.md](./ROADMAP.md).

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
- [Accounts and Cloud Sync](#accounts-and-cloud-sync)
- [Content](#content)
- [Success Metrics](#success-metrics)
- [Open Questions](#open-questions)

## Product Summary

LexiTap is an offline-first, tap-based vocabulary acquisition app for global ESL learners. The free Foundation and Advanced tiers build a daily recognition habit; paid one-time tiers (TOEFL, IELTS, Business English, Common 3000) and an annual Premium Pass monetize high-stakes test prep and professional need. The core differentiators are price + ownership (one-time purchases) + a no-typing recognition-only UX + offline-first reliability + free cloud sync.

## Goals and Non-Goals

### Goals (MVP)

- G1 — Ship a working iOS + Android app with the free Foundation tier, a passive-recognition quiz loop, and a fixed-interval SRS scheduler.
- G2 — Deliver a daily habit hook (streak counter) without guilt mechanics.
- G3 — Provide free, automatic cloud sync so device loss never destroys progress.
- G4 — Reach the "aha — I already know X words" moment within the first session via a low-friction adaptive diagnostic.
- G5 — Validate the core loop against retention gates (D7 > 30%) before building any paid tier.

### Non-Goals (MVP)

- Paid tiers, paywall, and IAP (Phase 3+).
- ImageMatch and Classification widgets (Phase 4).
- Active production (typing/speaking), pronunciation training, AI chatbot, multimedia per-word video. See [OUT_OF_SCOPE.md](./OUT_OF_SCOPE.md).

## Target User

Non-native English speakers only (test-prep candidates, professionals, fluency-seekers). American-student / K-12 / SAT-ACT vocabulary is a separate product and explicitly out of scope. Users span CEFR A2–C1 and self-segment at onboarding.

## MVP Scope at a Glance

| Area | MVP includes | Deferred |
| --- | --- | --- |
| Tiers | Foundation (free) | Advanced full list, all paid tiers |
| Screens | Home, Quiz, Progress, Settings | Paywall, playlist |
| Widgets | MultipleChoice, DragDrop | ImageMatch, Classification |
| Hooks | useSpacedRepetition, useMastery, useQuizSession, useSync | — |
| SRS | Fixed 1/3/7/14/30, mastery 0–5, forgiveness layer | FSRS evaluation |
| Onboarding | Simplified adaptive diagnostic | Full IRT |
| Gamification | Streak counter + progress viz | Achievements, leaderboards |
| Accounts | Email/password + Google Sign-In | Apple Sign-In (revisit) |
| Sync | Free, automatic, background | — |

## Screens

### Home

- **Requirement:** Surface the single most important next action — start today's review session — plus streak and a compact progress glance.
- **Acceptance criteria:**
  - Primary CTA ("Review N words today") visible above the fold; tapping launches a quiz session.
  - Current streak count displayed; no red badge or shame state when behind.
  - Daily review count respects the SRS daily cap (see [SRS](#spaced-repetition-system-srs)).
  - Renders fully offline from the bundled DB.

### Quiz

- **Requirement:** Run a recognition-only assessment session using MultipleChoice and DragDrop widgets; record attempts to drive SRS/mastery.
- **Acceptance criteria:**
  - No `TextInput` anywhere in the quiz flow (passive recognition only — locked decision).
  - Each item logs result via `useQuizSession`; correct/incorrect feeds `useSpacedRepetition` and `useMastery`.
  - Session ends at the daily cap or when the queue empties, returning to a positive completion state.
  - Works offline; results queue for `useSync` on next connectivity.

### Progress

- **Requirement:** Visualize mastery distribution and the Knowledge Map ("words you already know" + curriculum ahead).
- **Acceptance criteria:**
  - Shows count of words at each mastery level (0–5) and total "known" estimate.
  - Reflects the diagnostic's endowed-progress reveal on first run.
  - No competitive/leaderboard framing.

### Settings

- **Requirement:** Account management and sync controls.
- **Acceptance criteria:**
  - Create account / sign in (email/password + Google); sign out; manual sync trigger.
  - Account creation is required for sync but the app is usable offline before/without it (progress stored locally, syncs on signup).
  - Surfaces data-deletion request path (GDPR alignment, backlog #2).

## Assessment Widgets

| Widget | MVP | Description | Acceptance criteria |
| --- | --- | --- | --- |
| MultipleChoice | Yes | Word/definition prompt; user taps one of N options. | 1 correct + 3 distractors; tap registers result; no typing. |
| DragDrop | Yes | User drags a word/definition to match a target. | Touch drag works on iOS + Android; snap + result logged. |
| ImageMatch | Phase 4 | Match word to image. | Deferred. |
| Classification | Phase 4 | Sort words into category buckets. | Deferred. |

All widgets test recognition/recall only — never active production. Distractor quality at MVP uses curated/generic pools; L1-targeted distractors are post-launch (backlog #48).

## Spaced Repetition System (SRS)

- **Intervals (locked):** fixed 1, 3, 7, 14, 30 days. No dynamic interval growth at MVP.
- **Mastery (locked):** integer scale 0–5. Correct answers advance mastery/interval; incorrect demotes per the scheduler rules (exact demotion curve is an implementation detail of `useSpacedRepetition`).
- **Forgiveness layer (REQUIRED before Phase 1 ships):** the naive scheduler must not become a backlog-as-punishment engine. Required, non-negotiable properties:
  - A daily review cap so a returning user is never dumped a giant backlog.
  - A soft catch-up that re-anchors overdue `next_review_date`s across days rather than all at once.
  - A streak freeze (or equivalent) so a single missed day does not destroy the streak.
  - No red-badge guilt, no "you missed N days" shame copy, max one daily reminder.
- **Acceptance criteria:** Phase 1 cannot ship without a forgiveness layer satisfying the four properties above. The detailed algorithm (cap value, catch-up curve, FSRS-vs-SM-2 choice, streak-freeze count) is an Open Question — see backlog #43; do not hardcode a final algorithm until that design lands.

## Onboarding Diagnostic

Locked approach (backlog #45): a **simplified adaptive diagnostic** at MVP, not full IRT.

- **Flow:** self-segmentation screen (goals + perceived level + background, ≤3 taps, no typing) → adaptive Yes/No quiz (correct → harder, wrong → easier, ~10–25 items) → 2–3 pseudo-words for overclaim detection → SE-based early exit (terminates when confidence reached, not a fixed count) → Knowledge Map reveal.
- **Acceptance criteria:**
  - Beginners can skip the diagnostic and start at Foundation.
  - No "test"/"placement" language — discovery framing only; starts on an easy item to prime success.
  - Reaches the "you already know ~X words" reveal in under ~90 seconds for a typical user.
  - Pseudo-word false alarms correct the final estimate downward.
- Full IRT with pre-calibrated difficulty parameters is deferred post-launch.

## Gamification

- **Required (locked):** streak counter + progress visualization. The streak is treated as core, not decoration.
- **Explicitly excluded:** Duolingo-style hearts/lives, leagues, aggressive loss-aversion mechanics, and any AI chatbot. Tone target: purposeful daily urgency without guilt — between Duolingo (compulsive) and WordUp (toothless).
- **Acceptance criteria:** streak increments on a qualifying daily session; protected by the streak-freeze forgiveness mechanic; never rendered as a punitive red state.

## Accounts and Cloud Sync

- **Accounts:** email/password + Google Sign-In at MVP.
- **Sync (free for all users — locked):** automatic, background, non-blocking, on app open/close, via Supabase. Syncs progress data (mastery, review dates, streak, quiz history) — the data that export cannot capture.
- **Acceptance criteria:**
  - App fully usable offline; sync never blocks the UI.
  - Installing on a second device and signing in restores progress (verified in Phase 2 device-switch test).
  - No tracking, no ads, no data selling.

## Content

MVP ships Foundation (top 3,000 most-used words; can launch with the first reviewed subset). Content is enrichment-only (definition, POS, 2–3 example sentences, audio, image) via the Track A CLI — sourcing is resolved (backlog #41). Audio uses both US + GB accents per word (listening-skills feature). Enrichment priority: TOEFL → Foundation → Advanced.

## Success Metrics

| Metric | Target | Phase |
| --- | --- | --- |
| D1 retention | > 50% | 2 |
| D7 retention | > 30% (kill if < 20% at Week 10) | 2 |
| D30 retention | > 15% | 2 |
| Avg session length | > 3 min | 2 |
| Cloud sync device-switch | Progress transfers correctly | 2 |
| WTP validation | 5 / 20 say yes to $14.99 TOEFL | 3 |
| First paying users | 10 (rethink if < 5 at Week 12) | 3 |

## Open Questions

- SRS forgiveness algorithm specifics + FSRS vs SM-2 fork (backlog #43) — must resolve before Phase 1B scheduler code.
- Diagnostic depth / stopping-rule tuning (backlog #45).
- Apple Sign-In at MVP vs post-launch (Apple App Store guideline 4.8 may require it once Google Sign-In ships — confirm).
- Foundation MVP word-count subset threshold (how many reviewed words constitute a shippable Foundation tier).
