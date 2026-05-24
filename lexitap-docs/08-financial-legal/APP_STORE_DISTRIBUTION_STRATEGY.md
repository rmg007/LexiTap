---
title: App Store and Distribution Strategy
category: financial-legal
status: active
updated: 2026-05-24
priority: P1
tags: [app-store, google-play, aso, store-listing, screenshots, iap-setup, testflight, phased-rollout, expo, eas]
---

# App Store and Distribution Strategy

How LexiTap gets onto the iOS App Store and Google Play, what each store requires and costs, how the in-app-purchase products are configured, the review-guideline risks to manage, the ASO plan, and the phased rollout. Distribution is mobile-first on both stores; there is no web app at launch. The store listing is English-only at launch; ASO localization is deferred.

This expands the launch tasks in [../../notion-docs/IMPLEMENTATION_ROADMAP.md](../../notion-docs/IMPLEMENTATION_ROADMAP.md) (Phase 5) and pairs with [MONETIZATION_COMPLIANCE.md](./MONETIZATION_COMPLIANCE.md) and [REVENUE_MODEL_PRICING.md](./REVENUE_MODEL_PRICING.md).

## Contents

- [Accounts and Costs](#accounts-and-costs)
- [Build and Submission Toolchain](#build-and-submission-toolchain)
- [Apple App Store Submission Requirements](#apple-app-store-submission-requirements)
- [Google Play Submission Requirements](#google-play-submission-requirements)
- [IAP Product Setup](#iap-product-setup)
- [Review-Guideline Risks](#review-guideline-risks)
- [App Store Optimization](#app-store-optimization)
- [English-Only Listing Decision](#english-only-listing-decision)
- [Phased Rollout](#phased-rollout)
- [Open Questions](#open-questions)

## Accounts and Costs

| Account | Cost | Cadence | Notes |
|---------|------|---------|-------|
| Apple Developer Program | $99 | Per year | Required to ship to App Store and use TestFlight. Individual enrollment is fine for a solo founder. |
| Google Play Developer | $25 | One-time | Single lifetime registration fee. |
| Apple Small Business Program | $0 | Enroll annually | Drops Apple commission 30% → 15%. Enroll immediately. |
| Google Play 15% tier | $0 | Automatic | First $1M/yr earns at 15%. |

These two account fees ($99 + $25 = $124) are the largest single line in the ~$144 Year 1 budget. See [THIRD_PARTY_DEPENDENCY_AUDIT.md](./THIRD_PARTY_DEPENDENCY_AUDIT.md) for the full budget map.

## Build and Submission Toolchain

- **EAS Build** (Expo Application Services) compiles the iOS `.ipa` and Android `.aab` in the cloud — no local Xcode/Android Studio release pipeline required. EAS free tier covers a solo founder's build volume; the queue is slower but the cost is $0.
- **EAS Submit** uploads builds directly to App Store Connect and the Play Console.
- `expo-in-app-purchases` is the IAP integration library (named in the roadmap). Note this library is in maintenance; see Open Questions for the migration flag.

## Apple App Store Submission Requirements

Submission checklist (Phase 5):
- App icon 1024×1024 (no alpha, no rounded corners — Apple rounds them).
- Screenshots for required device sizes: 6.7" iPhone and 6.5" iPhone are the practical minimum; 12.9" iPad if an iPad build is offered. 6 screenshots planned.
- App name (30 char), subtitle (30 char), promotional text, description, keywords field (100 char), support URL, marketing URL.
- **Privacy policy URL** (mandatory) and App Privacy "nutrition label" data-collection disclosure — LexiTap collects account email and progress data for cloud sync; must be declared accurately. No tracking, no ads, no data selling (consistent with the privacy stance in the project docs).
- Age rating questionnaire (LexiTap targets 4+/everyone — educational, no objectionable content).
- Sign in with Apple: if Google Sign-In is offered as a third-party login, **Apple requires Sign in with Apple to also be offered** (Guideline 4.8). This is a hard requirement — see risks.
- Demo account / reviewer notes: provide a test account and explain the free-vs-paid tier structure so the reviewer can exercise the paywall.

## Google Play Submission Requirements

- App icon 512×512, feature graphic 1024×500, phone screenshots (min 2, up to 8 — reuse the 6).
- Short description (80 char) + full description (4000 char).
- **Privacy policy URL** (mandatory).
- Data safety form (Play's equivalent of the privacy label) — declare email + progress sync, no sharing, no selling.
- Content rating questionnaire (IARC) → Everyone.
- Target API level must meet Play's current minimum (Expo SDK handles this; verify at submission).
- Closed/internal testing track required before production for new developer accounts; Play also imposes pre-launch testing requirements for newer personal accounts — verify account status early.

## IAP Product Setup

Create one IAP product per paid tier in both App Store Connect and the Play Console, matching the SKUs in [../../notion-docs/DATABASE_SCHEMA.md](../../notion-docs/DATABASE_SCHEMA.md):

| Product | Store product type | Price | SKU |
|---------|-------------------|-------|-----|
| Common 3000 | Non-consumable | $2.99 | com.lexitap.common3k |
| Business English | Non-consumable | $9.99 | com.lexitap.business |
| TOEFL | Non-consumable | $14.99 | com.lexitap.toefl |
| IELTS | Non-consumable | $14.99 | com.lexitap.ielts |
| Premium Pass | Auto-renewable subscription | $29.99/yr | com.lexitap.premium |
| GRE | Non-consumable | $14.99 | com.lexitap.gre |
| GMAT | Non-consumable | $14.99 | com.lexitap.gmat |
| Idioms | Non-consumable | $9.99 | com.lexitap.idioms |
| Phrasal Verbs | Non-consumable | $9.99 | com.lexitap.phrasal |

Key points:
- Paid tiers are **non-consumable** (own forever), which is what enables the "pay once, own it" promise and the Restore Purchases requirement.
- Premium Pass is the **only auto-renewable subscription**. It needs a subscription group, a localized renewal disclosure, and clear cancellation info to avoid the auto-renewal backlash that hurt ELSA.
- Post-launch SKUs (GRE/GMAT/Idioms/Phrasal) can be created in the stores ahead of time but kept unavailable until their content drop; the DB carries `is_active = 0` for these until ship.
- Entitlements are mirrored to Supabase (`user_entitlements` / `user_entitlements_sync`) so a purchase follows the account across devices.

## Review-Guideline Risks

| Risk | Store | Severity | Mitigation |
|------|-------|----------|------------|
| Digital content sold outside IAP | Both | Rejection | All paid tiers MUST use IAP. See compliance doc. |
| Teacher discount codes as external payment | Both | Rejection | Discounts must run through store mechanisms (Offer Codes / Promo Codes), never an external checkout. See compliance doc. |
| Google Sign-In without Sign in with Apple | Apple 4.8 | Rejection | Add Sign in with Apple before iOS submission. |
| Inaccurate privacy label vs actual data collection | Both | Rejection / removal | Declare email + progress sync exactly. |
| Subscription terms not disclosed in-app | Apple 3.1.2 | Rejection | Premium Pass paywall must show price, period, auto-renew, and link to terms/privacy. |
| Restore Purchases missing | Apple 3.1.1 | Rejection | Implement Restore button (already in roadmap Phase 3B). |
| Thin / minimum-functionality at first submit | Apple 4.2 | Rejection | Submit only after the free tier is a complete, useful app — not a stub. |

## App Store Optimization

English-only at launch. Target the high-intent ESL test-prep searcher.

**Primary keywords:** ESL vocabulary, TOEFL vocabulary, IELTS vocabulary, English vocabulary builder, learn English words, business English, vocabulary flashcards, spaced repetition English.

**Title/subtitle direction:** lead the title with "LexiTap" + a vocabulary descriptor; put the highest-volume keyword (TOEFL/IELTS/ESL vocabulary) in the subtitle. Do not keyword-stuff the title (Apple penalizes it).

**Screenshots (6)** should sell the differentiators, not list features:
1. No-typing tap-based learning (core UX moat).
2. Offline-first reliability ("works without wifi").
3. Free cloud sync ("never lose your progress" — direct shot at WordUp sync failures).
4. TOEFL/IELTS tier preview.
5. "Pay once, own it — no subscription trap" (the trust moat).
6. Streak / progress (table-stakes reassurance).

**Description** leads with price + ownership + no-typing + offline, because SRS and gamification are baseline expectations in 2026, not hooks.

## English-Only Listing Decision

The store listing, screenshots, and description are **English-only at launch**, even though the audience is global ESL learners. Rationale:
- The audience reads English by definition (they are learning English) — an English listing is comprehensible to them.
- Localizing the listing into 5-10 languages is meaningful unbudgeted work (translation + localized screenshots) for a solo founder in Phase 0.
- ASO localization is explicitly deferred; it is a high-ROI post-launch lever once a target-market priority list exists from real install data.

This is a deliberate scope-out, not an oversight. Revisit when install analytics reveal concentrated non-English-speaking markets worth localizing for.

## Phased Rollout

1. **Internal (Phase 2 start):** TestFlight internal testing (iOS) + Play Internal Testing track (Android). Founder + a handful of trusted testers.
2. **Beta (Phase 2, Weeks 7-10):** 50 beta testers recruited via teachers, Reddit, Facebook groups. TestFlight external + Play closed testing. This is the D7-retention gate (>30% to proceed).
3. **Paid validation (Phase 3, Weeks 11-12):** TOEFL IAP live to the beta cohort + r/TOEFL, r/ESL. Gate: 10 paying users.
4. **Production launch (Phase 5, Weeks 17-18):** Full public release on both stores. Consider Play's **staged rollout** (start at 10-20% of users, ramp to 100%) to catch crashes before full exposure; iOS has phased release for automatic updates.

## Open Questions

- **`expo-in-app-purchases` is deprecated/maintenance-mode.** Confirm whether to migrate to RevenueCat or `expo-iap` before building Phase 3B IAP. RevenueCat simplifies receipt validation and entitlements but adds a vendor (free under ~$2.5K MTR). Flagged in the dependency audit.
- **iPad support:** ship iPhone-only at launch or include iPad? Affects screenshot work and review scope. Leaning iPhone-only for launch.
- **Sign in with Apple** adds auth work not currently itemized in the Phase 1 build list — schedule before iOS submission.
- **Apple subscription review** for Premium Pass (auto-renewable) is stricter than non-consumables; budget extra review time in Phase 5.
