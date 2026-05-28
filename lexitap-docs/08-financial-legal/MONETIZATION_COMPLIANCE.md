---
title: Monetization Compliance
category: financial-legal
status: active
updated: 2026-05-24
priority: P0
tags: [iap, apple-guidelines, google-guidelines, B2B-licensing, compliance, multi-user, advocate-referrals, tax-compliance, RevenueCat]
---

# Monetization Compliance

The monetization and store guideline requirements LexiTap must satisfy. This document describes the intended compliance posture for B2C individual subscriptions and B2B institutional bulk licenses. It is not legal advice; confirm the final implementation with counsel and store review before launch.

---

## Contents

- [App Store Guideline 3.1.1: Core Digital Content Rule](#app-store-guideline-311-core-digital-content-rule)
- [B2B bulk Licensing Compliance (Apple Guideline 3.1.3(c))](#b2b-bulk-licensing-compliance-apple-guideline-313c)
- [Teacher Advocate Referral Compliance (Zero Cash Flow)](#teacher-advocate-referral-compliance-zero-cash-flow)
- [B2C Individual Subscriptions & Paywall Compliance](#b2c-individual-subscriptions--paywall-compliance)
- [Restore Purchases & Receipt Validation](#restore-purchases--receipt-validation)
- [Refund & Revocation Orchestration](#refund--revocation-orchestration)
- [Compliance Checklist](#compliance-checklist)
- [Official Source Currentness](#official-source-currentness)

---

## App Store Guideline 3.1.1: Core Digital Content Rule

Individual users purchasing premium digital content inside LexiTap (the Premium Pass monthly or annual subscription, and the Common 3000 one-time trial) **MUST** use Apple/Google In-App Purchase. LexiTap may not link to a web billing checkout or prompt individual users to pay off-store inside the consumer mobile UI. Doing so violates Guideline 3.1.1 and triggers store rejection.

---

## B2B Bulk Licensing Compliance (Apple Guideline 3.1.3(c))

Bulk licenses sold directly to cram schools and language schools on the web portal (Stripe checkout) are an intended institutional distribution strategy. They may reduce store-fee exposure when the implementation qualifies under Apple/Google rules, but this is review-sensitive and must be validated before launch.

### Guideline Alignment (Enterprise/Multi-User)
- **Apple Guideline 3.1.3(c) (Enterprise / Multi-User):** *"Apps sold to an organization or group for distribution to its employees or students may allow users to access bulk-purchased content."*
- **Apple Guideline 3.1.1 Risk:** Apple also says digital feature/content unlocks generally must use IAP and may not use license-key style mechanisms unless an exception applies. Treat seat-token redemption as a review-risk area, not a guaranteed exemption.
- **Google Play Payments Policy:** Play-distributed apps accepting payment for in-app features or digital content generally must use Google Play Billing unless a specified exception or enrolled alternative-billing program applies. Do not assume a broad education exemption.
- **Redemption Mechanic:** Students enter their 8-character B2B seat token in the Settings screen. The token is checked via Supabase `activate_seat_license(token)` RPC and grants Premium access only for organization-purchased seats.
- **Strict Anti-Steering Rule:** The mobile consumer UI **must never** feature buy buttons, price listings, or links directing B2C users to purchase seat licenses on the web. The Settings screen must remain purely passive: *"Got a Cram School Seat Token? Redeem here."*
- **Review Requirement:** Provide App Review / Play review notes explaining the institutional seat workflow, test credentials, and why the app also supports store-native B2C IAP.

---

## Teacher Advocate Referral Compliance (Zero Cash Flow)

We avoid the legwork and compliance risk of cash micro-commissions (via PayPal/Wise) to individual freelance teachers.

Under the revised Advocate model:
1. **Zero Cash Flow:** Teacher advocates do not earn revenue-share commissions, and students do not receive off-store price discounts.
2. **Digital-Only Rewards:** Teacher advocates receive free Premium annual seats or in-app upgrade keys to share with colleagues or low-income students in their classrooms. Referred students receive an extended 14-day free Premium trial.
3. **Reducing Operational Risk:** Since zero cash is paid to advocates, the model reduces:
   - **FATCA / 1099-MISC Reporting:** Lower risk than cash commissions, but confirm treatment of non-cash rewards with counsel.
   - **KYC / AML Barriers:** No payout rail means fewer identity-verification and money-laundering review obligations.
   - **Cross-Border Payout Friction:** No PayPal/Wise transfer fees erode teacher margins.

---

## B2C Individual Subscriptions & Paywall Compliance

Premium monthly ($4.99) and annual ($24.99) subscriptions are processed in-app using RevenueCat, enforcing Apple Guideline 3.1.2:
- Paywall UI must clearly display the recurring billing price, interval (monthly/annual), and cancel-anytime policy.
- Link directly to the Apple standard End-User License Agreement (EULA) and LexiTap Privacy Policy from the paywall.
- Subscriptions are auto-renewable; cancellation must be managed by the user via standard App Store/Google Play settings.

---

## Restore Purchases & Receipt Validation

Required by Apple Guideline 3.1.1. 
- A prominent **Restore Purchases** button is located in the Settings screen.
- On tap, the client invokes RevenueCat `syncPurchases()` or standard restore rails to validate previous receipt transactions against store servers.
- On valid receipts, RevenueCat / the `validate_receipt` Edge Function writes the verified entitlement to `user_entitlements_sync` server-side (service role). `UnlockTierUseCase` then mirrors the verified entitlement to local SQLite. Entitlements are **not** written locally first and synchronized to Supabase; the write direction is server → local mirror only.
- Entitlement checks are server-verified, driven by RevenueCat's receipt validation API; unverified local client state must never unlock paid content.

---

## Refund & Revocation Orchestration

- Refund requests are processed directly by Apple/Google platform systems. The founder does not have direct access to process IAP refunds.
- LexiTap must handle refund and revocation signals:
  - We listen for Server Notifications (App Store Server Notifications v2 and Google Real-time Developer Notifications).
  - On notification, we call a Supabase edge function to update the user's entitlement state, removing Premium access and logging the change.

---

## Compliance Checklist

| Item | Requirement | Status |
|------|-------------|--------|
| B2C Sales via IAP | Apple 3.1.1 / Play Payments | Planned via RevenueCat in Phase 3 |
| Restore Purchases Button | Apple 3.1.1 | Required in Settings layout |
| B2B Seat Tokens via 3.1.3(c) | Institutional access strategy | Needs counsel + store-review validation before launch |
| No Off-Store Web Links | Anti-Steering Protection | Required; Settings UI must remain passive-only |
| Zero Cash Payouts to Teachers | Tax/KYC risk reduction | Advocate loop is digital-only; confirm non-cash rewards treatment |
| Subscription Paywall Terms | Apple 3.1.2 | Required in paywall design |
| Standard Apple EULA Linked | Apple Store Policy | Required on web and in-app paywall |
| Privacy Policy Linked | Mandatory Data Safety | Required on website and Settings screen |

## Official Source Currentness

Checked on 2026-05-24:
- Apple App Review Guidelines: <https://developer.apple.com/app-store/review/guidelines/>
- Google Play payments policy: <https://support.google.com/googleplay/android-developer/answer/9858738>
