---
title: Monetization Compliance
category: financial-legal
status: active
updated: 2026-05-24
priority: P0
tags: [iap, apple-guidelines, google-guidelines, B2B-licensing, compliance, multi-user, advocate-referrals, tax-compliance, RevenueCat]
---

# Monetization Compliance

The monetization and store guideline requirements LexiTap must satisfy. This document details how B2C individual subscriptions and B2B institutional bulk licenses comply with store-native rules while bypassing platform commission fees legally.

---

## Contents

- [App Store Guideline 3.1.1: Core Digital Content Rule](#app-store-guideline-311-core-digital-content-rule)
- [B2B bulk Licensing Compliance (Apple Guideline 3.1.3(c))](#b2b-bulk-licensing-compliance-apple-guideline-313c)
- [Teacher Advocate Referral Compliance (Zero Cash Flow)](#teacher-advocate-referral-compliance-zero-cash-flow)
- [B2C Individual Subscriptions & Paywall Compliance](#b2c-individual-subscriptions--paywall-compliance)
- [Restore Purchases & Receipt Validation](#restore-purchases--receipt-validation)
- [Refund & Revocation Orchestration](#refund--revocation-orchestration)
- [Compliance Checklist](#compliance-checklist)
- [Open Questions](#open-questions)

---

## App Store Guideline 3.1.1: Core Digital Content Rule

Individual users purchasing premium digital content inside LexiTap (the Premium Pass monthly or annual subscription, and the Common 3000 one-time trial) **MUST** use Apple/Google In-App Purchase. LexiTap may not link to a web billing checkout or prompt individual users to pay off-store inside the consumer mobile UI. Doing so violates Guideline 3.1.1 and triggers store rejection.

---

## B2B Bulk Licensing Compliance (Apple Guideline 3.1.3(c))

Bulk licenses sold directly to cram schools and language schools on the web portal (Stripe checkout) are fully compliant and legally bypass store IAP fees.

### Guideline Alignment (Enterprise/Multi-User)
- **Apple Guideline 3.1.3(c) (Enterprise / Multi-User):** *"Apps sold to an organization or group for distribution to its employees or students may allow users to access bulk-purchased content."*
- **Google Play Payments Policy:** Organizations purchasing seat licenses for educational distribution are exempt from standard IAP requirements.
- **Redemption Mechanic:** Students enter their 8-character B2B seat token in the Settings screen. The token is checked via Supabase `activate_seat_license(token)` RPC and grants Premium access.
- **Strict Anti-Steering Rule:** The mobile consumer UI **must never** feature buy buttons, price listings, or links directing B2C users to purchase seat licenses on the web. The Settings screen must remain purely passive: *"Got a Cram School Seat Token? Redeem here."*

---

## Teacher Advocate Referral Compliance (Zero Cash Flow)

We have **completely eliminated the legwork and compliance risks of cash micro-commissions** (via PayPal/Wise) to individual freelance teachers. 

Under the revised Advocate model:
1. **Zero Cash Flow:** Teacher advocates do not earn revenue-share commissions, and students do not receive store-bypassing price discounts.
2. **Digital-Only Rewards:** Teacher advocates receive free Premium annual seats or in-app upgrade keys to share with colleagues or low-income students in their classrooms. Referred students receive an extended 14-day free Premium trial.
3. **Wiping Out Legal Risk:** Since zero money is paid to advocates, we completely bypass:
   - **FATCA / 1099-MISC Reporting:** Bypasses IRS and international tax withholding compliance.
   - **KYC / AML Barriers:** Bypasses identity verification and money-laundering review blockages.
   - **Cross-Border Payout Friction:** Wipes out PayPal cross-border transaction fees that erode teacher margins.

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
- Entitlements are updated in the local SQLite database and synchronized back to Supabase.
- Entitlement checks are secure and server-side, driven by RevenueCat's receipt validation API; unvalidated local client states are never trusted.

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
| B2C Sales via IAP | Apple 3.1.1 / Play Payments | Implemented via RevenueCat (Phase 3) |
| Restore Purchases Button | Apple 3.1.1 | Included in Settings layout |
| B2B Seat Tokens via 3.1.3(c) | compliant Bulk Distribution | Verified; Supabase redemption RPC ready |
| No Off-Store Web Links | Anti-Steering Protection | Confirmed; Settings UI is passive-only |
| Zero Cash Payouts to Teachers | FATCA / KYC Elimination | Resolved; Advocate loop is digital-only |
| Subscription Paywall Terms | Apple 3.1.2 | Paywall design spec verified |
| Standard Apple EULA Linked | Apple Store Policy | Linked on web and in-app paywall |
| Privacy Policy Linked | Mandatory Data Safe | Linked on website and Settings screen |
