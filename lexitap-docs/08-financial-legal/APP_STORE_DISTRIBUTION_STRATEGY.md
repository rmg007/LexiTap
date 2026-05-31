---
title: App Store and Distribution Strategy
category: financial-legal
status: active
updated: 2026-05-31
priority: P1
tags: [app-store, google-play, aso, store-listing, one-time, exam-packs, non-consumable, compliance, guidelines, RevenueCat, b2b-deferred]
---

# App Store and Distribution Strategy

How LexiTap is distributed on the iOS App Store and Google Play, store-native SKU configurations, review-guideline risk management, and English-only ASO localization decisions. The consumer model is **one-time non-consumable IAP** (exam packs + All-Exams bundle); **no subscriptions**. B2B institutional licensing is **deferred out of launch**. Authoritative pricing: [REVENUE_MODEL_PRICING.md](./REVENUE_MODEL_PRICING.md).

> **2026-05-31 — model changed.** Launching pure-B2C with one-time purchases **removes two of the largest review risks**: Guideline 3.1.2 (subscription terms) is N/A, and Guideline 3.1.3(c) (institutional seat-token redemption) is not exercised at launch. The B2B review battle plan below is **retained only as a deferred reference**.

---

## Contents

- [Accounts and Costs](#accounts-and-costs)
- [Build and Submission Toolchain](#build-and-submission-toolchain)
- [SKU Setup & RevenueCat Configurations](#sku-setup--revenuecat-configurations)
- [Review-Guideline Risks & Mitigations](#review-guideline-risks--mitigations)
- [App Store Optimization (ASO)](#app-store-optimization-aso)
- [English-Only Listing Decision](#english-only-listing-decision)
- [Phased Rollout Playbook](#phased-rollout-playbook)
- [Deferred: B2B Review Battle Plan (3.1.3(c))](#deferred-b2b-review-battle-plan-313c)
- [Official Source Currentness](#official-source-currentness)

---

## Accounts and Costs

| Account | Cost | Cadence | Notes |
|---------|------|---------|-------|
| Apple Developer Program | $99 | Per year | Mandatory for TestFlight and iOS App Store distribution. |
| Google Play Developer | $25 | One-time | Lifetime registration fee for Android distribution. |
| Apple Small Business Program | $0 | Enroll annually | Drops Apple commission 30% → 15%. Enroll immediately. |
| Google Play 15% tier | $0 | Automatic | 15% rate applied to first $1M/yr. |

These fixed platform developer fees ($99 + $25 = $124) represent our core fixed cost base.

---

## Build and Submission Toolchain

- **EAS Build & EAS Submit:** Cloud compiling and automated store uploads via Expo Application Services.
- **RevenueCat Integration:** wired in Phase 3 (`react-native-purchases`). Handles **one-time non-consumable** purchase receipts and entitlement updates (`exam_*`, `all_exams`) — no subscription/renewal logic. No in-app web checkout links and no off-store price steering.

---

## SKU Setup & RevenueCat Configurations

All consumer products are **one-time non-consumables**. No subscriptions; no standalone Common 3000 SKU (Most Common 3000/9000 are free).

| Product | Store Product Type | Price | SKU | Grants |
|---------|-------------------|-------|-----|--------|
| TOEFL Pack | Non-consumable | $9.99 | com.lexitap.exam.toefl | `exam_toefl` |
| IELTS Pack | Non-consumable | $9.99 | com.lexitap.exam.ielts | `exam_ielts` |
| GRE Pack | Non-consumable | $9.99 | com.lexitap.exam.gre | `exam_gre` |
| GMAT Pack | Non-consumable | $9.99 | com.lexitap.exam.gmat | `exam_gmat` |
| Business English Pack | Non-consumable | $9.99 | com.lexitap.exam.business | `exam_business` |
| All-Exams Bundle | Non-consumable | $29.99 | com.lexitap.bundle.full | `all_exams` |
| All-Exams Upgrade (own 1 pack) | Non-consumable | $19.99 | com.lexitap.bundle.upgrade1 | `all_exams` |
| All-Exams Upgrade (own 2 packs) | Non-consumable | $9.99 | com.lexitap.bundle.upgrade2 | `all_exams` |

*Note: `all_exams` unlocks every exam pack, current and future. Upgrade SKUs are gated client-side on existing entitlements (price = $29.99 − already-paid). Free content (Foundation, Advanced, Most Common 3000/9000) has no SKU.*

---

## Review-Guideline Risks & Mitigations

The pure-B2C one-time model is low-risk on payment guidelines. Remaining items:

| Risk Area | Guideline | Platform | Mitigation |
|-----------|-----------|----------|------------|
| **Digital content must use IAP** | Apple 3.1.1 / Google Play Payments | iOS + Android | All paid exam packs + bundle use store IAP via RevenueCat. No web checkout link, price listing, or off-store steering in the app. |
| **Restore Purchases (non-consumables)** | Apple 3.1.1 | iOS + Android | Prominent Restore button in Settings; non-consumables must be restorable on a new device. |
| **One-time purchase disclosure** | Apple 3.1.1 | iOS | Paywall lists the one-time price and "no recurring charge", links Terms + Privacy. **No auto-renew copy.** |
| **Subscription Terms (3.1.2)** | Apple 3.1.2 | iOS | **N/A — no subscriptions.** |
| **Missing Apple Login** | Apple 4.8 | iOS | Google Sign-In is offered. **Sign in with Apple is implemented in Phase 3** alongside Google Sign-In. See [../02-product-definition/ROADMAP.md](../02-product-definition/ROADMAP.md). |

---

## App Store Optimization (ASO)

We optimize for individual B2C organic discovery, leading with TOEFL/IELTS vocabulary, offline study, spaced repetition, and no-typing review rather than generic flashcards.

- **Primary Keyword Target:** *TOEFL vocabulary, IELTS vocabulary, offline English vocabulary, business English vocabulary, vocabulary builder, spaced repetition, no-typing review.*
- **Title Layout:** "LexiTap: TOEFL & IELTS Vocab"
- **Subtitle Layout:** "Offline vocabulary review. No typing."
- **Screenshot Design (6):**
  - **Screen 1:** No-typing recognition quiz ("Tap, drag, match, and classify vocabulary without keyboard friction").
  - **Screen 2:** Spaced Repetition scheduler ("Personalized memory intervals that protect your streak").
  - **Screen 3:** Offline-first continuity ("Fully functional offline. Optional encrypted backup when connected").
  - **Screen 4:** TOEFL/IELTS Exam Prep focus.
  - **Screen 5:** "Exam packs — buy once, yours forever. No subscription, no auto-renewal."
  - **Screen 6:** Personal Knowledge Map visualization.

---

## English-Only Listing Decision

The App Store listings will be English-only at launch. Since LexiTap targets intermediate-to-advanced learners preparing for TOEFL, IELTS, or business advancement, they read English by definition. Localizing store metadata is unbudgeted for Phase 0/1 and is deferred to Year 2.

---

## Phased Rollout Playbook

1. **TestFlight / Play Internal:** Core team and founder validation (Phase 2 start).
2. **Consumer Beta (Phase 2):** Recruit 50 testers via Reddit to evaluate recognition review error rates and D7 retention (>30%).
3. **App Store Connect Submission (Phase 5):** Submit only after recognition UX, one-time purchase gating, restore-purchases, anti-steering copy, and offline behavior are thoroughly verified.

*(The Phase 2 B2B seat-token pilot is removed — B2B deferred.)*

---

## Deferred: B2B Review Battle Plan (3.1.3(c))

**Not exercised at launch — B2B is deferred. Retained as a reference for if/when institutional licensing is revived.** When that happens, Guideline 3.1.3(c) lets institutional users access bulk-purchased content, but Apple Review scrutinizes in-app code redemptions heavily. The mitigation playbook would be:

1. **Zero steering in UI** — no purchase links, prices, B2B advertising, or checkout terminology in the app; any redemption field stays passive ("Have an activation code from your teacher or school? Enter it below.").
2. **Pre-provisioned review notes & demo tokens** — supply active demo seat tokens + step-by-step unlock instructions + a private video showing offline seat activation with no on-device web payment.
3. **Cite 3.1.3(c) verbatim** in Reviewer Comments, framing institutional seats as bulk-purchased-by-the-organization with no off-store steering.
4. **Website safeguards** — `lexitap.app` shows no single-user B2C checkout; institutional sales are a contact form only ("For institutional bulk licensing, contact sales@lexitap.app. Minimum 10 seats.").

## Official Source Currentness

Checked on 2026-05-24:
- Apple App Review Guidelines: <https://developer.apple.com/app-store/review/guidelines/>
- Google Play payments policy: <https://support.google.com/googleplay/android-developer/answer/9858738>
