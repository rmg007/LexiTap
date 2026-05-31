---
title: Monetization Compliance
category: financial-legal
status: active
updated: 2026-05-31
priority: P0
tags: [iap, apple-guidelines, google-guidelines, one-time, exam-packs, non-consumable, compliance, restore-purchases, RevenueCat, b2b-deferred]
---

# Monetization Compliance

The monetization and store guideline requirements LexiTap must satisfy. The consumer business is **one-time non-consumable in-app purchases** (exam packs + All-Exams bundle) — **no subscriptions**. B2B institutional licensing is **deferred out of the initial launch**. It is not legal advice; confirm the final implementation with counsel and store review before launch. Authoritative pricing model: [REVENUE_MODEL_PRICING.md](./REVENUE_MODEL_PRICING.md).

> **2026-05-31 — model changed.** The prior subscription (Premium Pass) + standalone $1.99 Common 3000 + launch-day B2B model is dead. Subscription-specific compliance (Apple Guideline 3.1.2 auto-renewable terms, cancellation flows) is **N/A** under one-time purchases. B2B compliance (3.1.3(c), seat tokens, Stripe portal) and the teacher-advocate program are retained below **only as deferred** references for when/if B2B is taken off the shelf.

---

## Contents

- [App Store Guideline 3.1.1: Core Digital Content Rule](#app-store-guideline-311-core-digital-content-rule)
- [B2C One-Time Purchase Paywall Compliance](#b2c-one-time-purchase-paywall-compliance)
- [Restore Purchases & Receipt Validation](#restore-purchases--receipt-validation)
- [Refund & Revocation Orchestration](#refund--revocation-orchestration)
- [Deferred: B2B Bulk Licensing & Teacher Referrals](#deferred-b2b-bulk-licensing--teacher-referrals)
- [Compliance Checklist](#compliance-checklist)
- [Official Source Currentness](#official-source-currentness)

---

## App Store Guideline 3.1.1: Core Digital Content Rule

Individual users purchasing paid digital content inside LexiTap (the **one-time exam packs** and the **All-Exams bundle**, including the discounted upgrade SKUs) **MUST** use Apple/Google In-App Purchase. LexiTap may not link to a web billing checkout or prompt individual users to pay off-store inside the consumer mobile UI. Doing so violates Guideline 3.1.1 and triggers store rejection.

All paid products are **non-consumable** (bought once, owned permanently). Free content (Foundation, Advanced, Most Common 3000, Most Common 9000) carries no product and is never gated.

---

## B2C One-Time Purchase Paywall Compliance

Exam packs ($9.99) and the All-Exams bundle ($29.99) are processed in-app via RevenueCat as **one-time non-consumables**. There is **no subscription**, so Apple Guideline 3.1.2 (auto-renewable subscription disclosure) does **not** apply. The paywall must instead:

- Clearly display the **one-time price** and that the purchase is permanent ("one-time — yours forever", **no recurring charge, nothing to cancel**).
- Link to the Apple standard End-User License Agreement (EULA) and the LexiTap Privacy Policy.
- Never use auto-renew framing, countdown timers, fake scarcity, or pre-checked upsells (see [Paywall.md](../03-ux-design/screens/Paywall.md), "Zero dark patterns").
- Show the correct bundle SKU per the buyer's existing entitlements (full $29.99 vs discounted upgrade) so a pack owner is never charged the full bundle on top of a prior purchase.

---

## Restore Purchases & Receipt Validation

Required by Apple Guideline 3.1.1 — and **especially important for non-consumables**, which a user must be able to restore on a new device.

- A prominent **Restore Purchases** button is located in the Settings screen.
- On tap, the client invokes RevenueCat `syncPurchases()` / standard restore rails to validate previous transactions against store servers.
- On valid receipts, RevenueCat validates server-side and returns verified `CustomerInfo`. The app caches this in memory only — entitlements (`exam_*`, `all_exams`) are **never** persisted to `user.db`.
- Entitlement checks are server-verified via RevenueCat's receipt validation; unverified local client state must never unlock paid content.

---

## Refund & Revocation Orchestration

- Refund requests are processed directly by Apple/Google. The founder cannot process IAP refunds directly. One-time purchases are non-refundable except via store policy.
- LexiTap still handles refund/revocation signals:
  - We listen for Server Notifications (App Store Server Notifications v2 and Google Real-time Developer Notifications).
  - On a refund/revocation, RevenueCat updates `CustomerInfo`; the app removes the affected pack/bundle access on next session start.

---

## Deferred: B2B Bulk Licensing & Teacher Referrals

**Not part of the initial launch — build nothing. Retained here as design references for if/when B2B is taken off the shelf.** The entitlement model leaves the door open: a future server-authoritative seat grant would map onto the same `exam_*` / `all_exams` entitlement surface the consumer path already uses.

When B2B is revived, these constraints apply:
- **Apple Guideline 3.1.3(c) (Enterprise / Multi-User)** permits bulk-purchased content access for organizations, but seat-token redemption is a **review-risk area, not a guaranteed exemption** (3.1.1 still favors IAP for feature unlocks). Google Play Billing rules apply similarly — no assumed education exemption.
- **Strict anti-steering:** the consumer UI must never show buy buttons, prices, or links to off-store seat purchases. Any redemption entry stays passive ("Got a Cram School Seat Token? Redeem here.").
- **Teacher advocate referrals** (digital-only, zero-cash rewards) are deferred with B2B; not active at launch. Confirm non-cash reward tax/KYC treatment with counsel before any revival.

---

## Compliance Checklist

| Item | Requirement | Status |
|------|-------------|--------|
| B2C Sales via IAP (one-time non-consumables) | Apple 3.1.1 / Play Payments | Planned via RevenueCat in Phase 3 |
| Restore Purchases Button | Apple 3.1.1 (required for non-consumables) | Required in Settings layout |
| One-Time Purchase Paywall Terms | Apple 3.1.1; price + "no recurring charge" disclosure | Required in paywall design |
| Auto-Renewable Subscription Terms (3.1.2) | — | **N/A — no subscriptions** |
| Standard Apple EULA Linked | Apple Store Policy | Required in-app paywall |
| Privacy Policy Linked | Mandatory Data Safety | Required on website and Settings screen |
| No Off-Store Web Links | Anti-Steering Protection | Required; consumer UI must not steer off-store |
| B2B Seat Tokens via 3.1.3(c) | Institutional access strategy | **Deferred** — revisit with counsel + store review if B2B revived |
| Zero Cash Payouts to Teachers | Tax/KYC risk reduction | **Deferred** with B2B; no program at launch |

## Official Source Currentness

Checked on 2026-05-24:
- Apple App Review Guidelines: <https://developer.apple.com/app-store/review/guidelines/>
- Google Play payments policy: <https://support.google.com/googleplay/android-developer/answer/9858738>
