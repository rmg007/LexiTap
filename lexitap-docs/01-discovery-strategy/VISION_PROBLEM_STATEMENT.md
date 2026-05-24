---
title: Vision and Problem Statement
category: strategy
status: active
updated: 2026-05-24
priority: P0
tags: [vision, problem-statement, thesis, esl, freemium, kill-criteria, conversion]
---

# Vision and Problem Statement

> Operating-layer summary lives in [../../notion-docs/PRODUCT_STRATEGY.md](../../notion-docs/PRODUCT_STRATEGY.md) (Executive Summary, Core Thesis). This is the comprehensive version: the full reasoning behind why LexiTap exists, who it serves, and the conditions under which we kill it.

## The Problem

Global ESL learners — non-native English speakers preparing for high-stakes tests, professional advancement, or real-world fluency — are badly served by the 2026 vocabulary-app market. The pain is not a shortage of apps. It is that the existing apps fail this specific audience along four concrete axes:

**1. The intermediate plateau is abandoned.** The market is saturated at the beginner level (Duolingo et al.), but learners at B1/B2 trying to push into C1/C2 fall off a cliff. Industry research documents this gap explicitly: most apps move beginners well and then leave them with dry, text-only flashcards. The learner who already knows 3,000 words and needs the next 6,000 for a TOEFL section has no good frequency-ordered path.

**2. Subscription extraction has broken trust.** ELSA Speak charges $89–99/yr and is the subject of documented auto-renewal backlash; first-hand founder evaluation (2026-05-22) put its felt value at roughly $5 — a >90% gap between asking price and delivered value. WordUp removed its core "learn now" feature post-launch, a documented trust-destruction event. The audience that pays for test prep is the audience most burned by recurring billing on a finite need.

**3. Mobile friction punishes the core use case.** The atomic unit of ESL study is a 5-minute commute window. Typing answers on a phone keyboard, waiting for video clips to load (WordUp's documented media-parsing failures), or losing progress to a device-bound SRS (Knowji warns against multiple users sharing a device — it "irreversibly disrupts" the schedule) all sever the habit loop at exactly the moment it forms.

**4. The pedagogical blindspot.** WordUp — the closest competitor on audience — focuses almost exclusively on single words and, per its own SWOT, ignores multi-word collocations, idioms, and phrasal verbs. These are the classic ESL pain points. The market leader has named the gap and not filled it.

## The Vision

LexiTap is the vocabulary app a serious non-native English speaker can pull out on their commute without embarrassment and without fear of being billed forever. An offline-first, no-typing, tap-based mastery tool that takes a learner from everyday English (top 3,000 words, free) through advanced English (3,001–9,000, free) and into the specific high-stakes content they will pay for once — TOEFL, IELTS, Business English, and post-launch GRE/GMAT/idioms/phrasal verbs — with cloud sync included free so a lost phone never costs months of progress.

We are a **vocabulary mastery** tool, not a fluency tool and not a pronunciation tool (that is ELSA's lane; see [../../notion-docs/PRODUCT_STRATEGY.md](../../notion-docs/PRODUCT_STRATEGY.md) Audio Scope-Out). We exercise passive recognition and recall — exactly what the test-prep sections test.

## Core Thesis

ESL learners build a daily vocabulary habit on the free Foundation and Advanced tiers, then convert to paid the moment a high-stakes deadline creates urgency — a TOEFL/IELTS exam date, a GRE/GMAT application cycle, a job that demands Business English. The free tier is the funnel and the habit; the paid tier is the urgency-priced unlock.

The pricing model itself is the moat. One-time purchases (not subscriptions) for content tiers convert the audience's distrust of recurring billing into a reason to choose us. Premium Pass ($29.99/yr) is the only recurring product, anchored against a category where the cheapest credible competitor (Duolingo Super) is ~$84/yr and the closest feature-competitor (Knowji) is ~$120/yr.

## What Success Looks Like

| Horizon | Free users | Conversion | Paying | Revenue |
|---------|-----------|------------|--------|---------|
| Year 1 (conservative) | 10,000 | 3% | 300 | $3,600 |
| Year 2 (growth) | 50,000 | 5% | 2,500 | $30,000 |
| Year 3 (mature) | 150,000 | 5% | 7,500 | $90,000 gross / ~$67.5K net after teacher commissions |

Near-term gating metrics (from [../../notion-docs/PRODUCT_STRATEGY.md](../../notion-docs/PRODUCT_STRATEGY.md) validation phases):

- Phase 1 (free MVP, 50 beta testers): D1 >50%, D7 >30%, D30 >15%, avg session >3 min.
- Phase 2 (WTP validation, no build): 5 of 20 most-engaged users say yes to $14.99 TOEFL.
- Phase 3 (first paid module): 10 paying users in month one; 5% conversion of active free users.
- Year-1 north star: 1,000 total users via the 21-week path (see [GO_TO_MARKET_STRATEGY.md](./GO_TO_MARKET_STRATEGY.md)).

## Kill Criteria

We stop or pivot — not iterate indefinitely — if any of these fire:

- **Core loop dead:** D7 retention <20% on the free MVP after a fair fix attempt. The habit is the product; without it, nothing downstream works.
- **No willingness to pay:** Fewer than 3 of 20 engaged users say yes to paid TOEFL in Phase 2. Trigger: explore B2B / institutional or a teacher-bundle partnership instead of consumer IAP.
- **Cannot acquire:** Teacher referral network plus organic channels cannot move users at a CAC the ~$144 Year-1 budget supports, and no channel shows organic pull by end of the 21-week path.
- **Pricing model invalidated:** If 100+ paying users show that one-time pricing produces unsustainable LTV vs. a subscription peer set, the model is revisited (first repricing review is Month 3 post-launch / 100 payers — not before).

## Out of Scope (Never Mix In)

American-student vocabulary (SAT/ACT, K-12 grade-level) is a separate future product in a separate app. LexiTap serves global ESL learners only. No AI chatbot at MVP, no pronunciation training, no WordUp-scale video multimedia, no active-production (typing/speaking) testing. See [../../notion-docs/PRODUCT_STRATEGY.md](../../notion-docs/PRODUCT_STRATEGY.md) scope-out sections.

## Open Questions

- Will the conservative 3% Year-1 free-to-paid conversion hold, or will the urgency-driven TOEFL/IELTS audience push closer to the 15% optimistic figure? Resolved only by Phase 3 live data.
- Does the no-typing / passive-recognition ceiling cap perceived value for fluency-seeking users enough to suppress conversion? Watch Phase 2 qualitative feedback.
