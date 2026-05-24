---
title: App Store and Distribution Strategy
category: financial-legal
status: active
updated: 2026-05-24
priority: P1
tags: [app-store, google-play, aso, store-listing, bulk-licensing, compliance, guidelines, RevenueCat]
---

# App Store and Distribution Strategy

How LexiTap is distributed on the iOS App Store and Google Play, store-native SKU configurations, review-guideline risk management (specifically for B2B institutional seat tokens), and English-only ASO localization decisions.

---

## Contents

- [Accounts and Costs](#accounts-and-costs)
- [Build and Submission Toolchain](#build-and-submission-toolchain)
- [SKU Setup & RevenueCat Configurations](#sku-setup--revenuecat-configurations)
- [Review-Guideline Risks & Mitigations](#review-guideline-risks--mitigations)
- [App Store Optimization (ASO)](#app-store-optimization-aso)
- [English-Only Listing Decision](#english-only-listing-decision)
- [Phased Rollout Playbook](#phased-rollout-playbook)
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
- **RevenueCat Integration:** wired in Phase 3 (`react-native-purchases`). Handles standard individual subscription receipts and entitlement updates. B2B seat token activation is separate institutional-access logic on Supabase and must remain review-safe: no in-app web checkout links, no consumer price steering, and clear review notes.

---

## SKU Setup & RevenueCat Configurations

Standard individual consumer SKU configurations:

| Product | Store Product Type | Price | SKU |
|---------|-------------------|-------|-----|
| Common 3000 Unlock | Non-consumable (One-time) | $1.99 | com.lexitap.common3k |
| Premium Pass (Monthly) | Auto-renewable subscription | $4.99/mo | com.lexitap.premium.monthly |
| Premium Pass (Annual) | Auto-renewable subscription | $24.99/yr | com.lexitap.premium.annual |

*Note: All content tiers (TOEFL, IELTS, Business English, etc.) are bundled into the Premium Pass. There are no individual-tier SKUs in the app store consoles.*

---

## Review-Guideline Risks & Mitigations

Monetizing individual users while selling bulk licenses to institutions off-store requires strict compliance.

| Risk Area | Guideline | Platform | Mitigation |
|-----------|-----------|----------|------------|
| **Digital content sold off-store** | Apple 3.1.1 / 3.1.3(c), Google Play Payments | iOS + Android | **Bulk B2B purchases are strictly web-direct and organization-purchased.** Students unlock seats via passive tokens in Settings. This is an intended institutional-access strategy, but license-key unlocks are review-sensitive unless the enterprise/multi-user exception applies. No web checkout link, price listing, or purchase steering appears in the app. Requires counsel + store-review validation before launch. |
| **Teacher advocate discount steering** | Apple 3.1.1 / Google Play Payments | iOS + Android | Teacher advocate referral codes do not process off-store payments. They strictly unlock a store-approved 14-day free Premium trial in the app. This reduces steer-to-purchase risk, but final copy must still be reviewed for anti-steering compliance. |
| **Missing Apple Login** | Apple 4.8 | iOS | Google Sign-In is offered. **Sign in with Apple is implemented in Phase 3** alongside Google Sign-In — not deferred to Phase 5. See [../02-product-definition/ROADMAP.md](../02-product-definition/ROADMAP.md#phase-3-first-paid-tier-weeks-1112) for rationale. |
| **Subscription Terms omission** | Apple 3.1.2 | iOS | Paywall screen must clearly list the subscription terms, price, annual auto-renewal policy, and direct links to the Terms of Service & Privacy Policy. |

---

## App Store Optimization (ASO)

We optimize for individual B2C organic discovery, leading with TOEFL/IELTS vocabulary, offline study, spaced repetition, and no-typing review rather than generic flashcards.

- **Primary Keyword Target:** *TOEFL vocabulary, IELTS vocabulary, offline English vocabulary, business English vocabulary, vocabulary builder, spaced repetition, no-typing review.*
- **Title Layout:** "LexiTap: TOEFL & IELTS Vocab"
- **Subtitle Layout:** "Offline vocabulary review. No typing."
- **Screenshot Design (6):**
  - **Screen 1:** No-typing recognition quiz ("Tap, drag, match, and classify vocabulary without keyboard friction").
  - **Screen 2:** Spaced Repetition scheduler ("Personalized memory intervals that protect your streak").
  - **Screen 3:** Cloud Sync continuity ("Fully functional offline. Automatically syncs progress when connected").
  - **Screen 4:** TOEFL/IELTS Exam Prep focus.
  - **Screen 5:** "Unified Premium Pass — Cancel anytime. Zero auto-renewal tricks."
  - **Screen 6:** Personal Knowledge Map visualization.

---

## English-Only Listing Decision

The App Store listings will be English-only at launch. Since LexiTap targets intermediate-to-advanced learners who are preparing for TOEFL, IELTS, or business advancement, they read English by definition. Localizing store metadata is unbudgeted for Phase 0/1 and is deferred to Year 2.

---

## Phased Rollout Playbook

1. **TestFlight / Play Internal:** Core team and founder validation (Phase 2 start).
2. **Bulk B2B Pilot (Phase 2):** Deploy seat invitation tokens to pilot cram schools, validating the Supabase token activation path.
3. **Consumer Beta (Phase 2):** Recruit 50 testers via Reddit to evaluate recognition review error rates and D7 retention (>30%).
4. **App Store Connect Submission (Phase 5):** Submit only after recognition UX, subscription gating, B2B token behavior, anti-steering copy, and offline behavior are thoroughly verified.

## Official Source Currentness

Checked on 2026-05-24:
- Apple App Review Guidelines: <https://developer.apple.com/app-store/review/guidelines/>
- Google Play payments policy: <https://support.google.com/googleplay/android-developer/answer/9858738>
