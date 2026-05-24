---
title: Vision and Problem Statement
category: strategy
status: active
updated: 2026-05-24
priority: P0
tags: [vision, problem-statement, thesis, esl, subscription, B2B, recognition, no-typing, kill-criteria, conversion]
---

# Vision and Problem Statement

> A condensed summary lives in [../02-product-definition/PRODUCT_REQUIREMENTS_DOCUMENT.md](../02-product-definition/PRODUCT_REQUIREMENTS_DOCUMENT.md) (Executive Summary, Core Thesis). This is the comprehensive version: the full reasoning behind why LexiTap exists, who it serves, and the conditions under which we kill it.

## The Problem

Global ESL learners — non-native English speakers preparing for high-stakes tests, professional advancement, or real-world fluency — are badly served by the 2026 vocabulary-app market. The pain is not a shortage of apps. It is that the existing apps fail this specific audience along four concrete axes:

**1. The intermediate plateau is abandoned.** The market is saturated at the beginner level (Duolingo et al.), but learners at B1/B2 trying to push into C1/C2 fall off a cliff. Industry research documents this gap explicitly: most apps move beginners well and then leave them with dry, text-only flashcards. The learner who already knows 3,000 words and needs the next 6,000 for a TOEFL section has no frequency-ordered path that actually leads to recall.

**2. Predatory and high-cost subscription models.** ELSA Speak charges $89–99/yr, generating documented auto-renewal backlash; first-hand evaluation (2026-05-22) shows a felt value of roughly $5. WordUp removed its core "learn now" feature post-launch, destroying consumer trust. High-stakes test-prep students are repeatedly burned by recurring consumer subscriptions that fail to match their actual, intensive study windows.

**3. Mobile friction and shallow review loops.** The atomic unit of ESL study is a 5-minute commute window. Most vocab apps either ask for tedious typing on a mobile keyboard or fall back to passive flashcards that learners can skim without committing. The student needs a high-efficacy, friction-free recognition system that uses tap, drag, match, and classify interactions instead of typing.

**4. The pedagogical blindspot.** Closest competitors like WordUp focus almost exclusively on isolated single words, ignoring multi-word collocations, idioms, and phrasal verbs. These are the primary ESL pain points on high-stakes standardized tests.

## The Vision

LexiTap is the ultimate vocabulary mastery app for global ESL learners and the institutions that teach them. It is an offline-first, high-efficacy recognition tool that takes a learner from everyday English (top 3,000 words, free) through advanced English (3,001–9,000, free) and into specific high-stakes content (TOEFL, IELTS, Business English, GRE, GMAT, idioms, phrasal verbs).

We combine an accessible free tier with a low-cost, unified Premium Subscription ($4.99/mo, $24.99/yr) for individual test-takers and a bulk B2B Licensing Portal for language cram schools.

We are a **vocabulary mastery** tool, not a fluency tool and not a pronunciation tool. We exercise deliberate recognition through no-typing mobile interactions, matching the real usage pattern of commute-window study while leaving active production to writing and speaking tools.

## Core Thesis

ESL learners build a daily vocabulary habit on the free Foundation and Advanced tiers. They convert to the unified Premium Subscription the moment a high-stakes deadline creates urgency (an upcoming TOEFL/IELTS exam date or a job hunt). 

Concurrently, language academies and cram schools purchase bulk Premium seat licenses on the web to onboard entire student cohorts, using the LexiTap dashboard to assign licenses and monitor progress. This B2B model is an intended store-compliance strategy, not a substitute for legal/App Review validation.

The pricing model itself is the strategic differentiator:
1. **Low-friction individual pricing:** A monthly subscription ($4.99/mo) matches the temporary, high-intensity window of test-takers, avoiding high upfront costs.
2. **Institutional B2B licensing:** Cram schools reduce consumer-store friction via direct web-purchased seat packs where store rules permit, providing steady, predictable revenue.
3. **Efficacy-led pedagogy:** Structured recognition practice ensures that learners are not just swiping flashcards, but making repeated meaning decisions that feed the SRS scheduler.

## What Success Looks Like

| Horizon | Active Users | Conversion (Subscribers + B2B Seats) | Blended Net ARPPU | Annualized Net Revenue |
|---------|--------------|--------------------------------------|-------------------|------------------------|
| Year 1 (conservative) | 10,000 | 1.5% Consumer + 150 B2B seats | ~$12 (blended) | ~$3,600 net |
| Year 2 (growth) | 50,000 | 2.5% Consumer + 1,250 B2B seats | ~$12 (blended) | ~$30,000 net |
| Year 3 (mature) | 150,000 | 3.0% Consumer + 4,500 B2B seats | ~$12 (blended) | ~$90,000 gross / ~$67.5K net |

*Note: B2B direct web purchases are modeled as lower-fee transactions where Apple/Google rules permit institutional access to previously purchased seats. This requires legal/App Review validation before launch.*

Near-term gating metrics:
- **Phase 1 (Weeks 2–6, build):** App runs on iOS and Android with MultipleChoice and DragDrop recognition widgets implemented.
- **Phase 2 (Weeks 7–10, user validation):** D1 >50%, D7 >30%, D30 >15%; onboard 2 local cram schools for a free bulk trial.
- **Phase 3 (Weeks 11–12, bulk monetization):** 10 paying individual subscribers + 2 paid cram-school contracts.
- **Phase 6 (Week 19+):** 1,000 total active users (individual + B2B seats) by Week 21.

## Kill Criteria

We stop or pivot if any of these criteria fire:

- **Core loop dead:** D7 retention <20% on the free MVP after a fair fix attempt. The habit is the product; without it, nothing downstream converts.
- **B2B value rejected:** Fewer than 3 of 5 pitched cram schools agree to participate in the Phase 2 bulk trials, or zero convert to paid in Phase 3. Trigger: Pivot away from institutional GTM and re-examine pure consumer ad-supported freemium.
- **Efficacy gap:** Beta feedback reveals the no-typing recognition loop is too difficult, too shallow, or fails to improve vocabulary retention. Trigger: redesign assessment mechanics while preserving the no-typing boundary.
- **Pricing model invalidated:** Blended individual subscriber churn exceeds 25% month-over-month, suggesting students abandon the app immediately, meaning LTV fails to cover CAC.

## Out of Scope (Never Mix In)

American-student vocabulary (SAT/ACT, K-12 grade-level) is a separate product. LexiTap serves global ESL test-takers and institutions only. No AI chatbot at MVP, no pronunciation training, no high-bandwidth multimedia video streams.

## Open Questions

- Will B2B cram schools convert at the projected $199/yr contract size, or will they demand deeper customization? Watch Phase 2 pilot feedback.
- Does the no-typing recognition loop feel challenging enough for test-prep learners without suppressing D1/D7 retention? Watch onboarding diagnostic drop-off and review-session completion rates.
