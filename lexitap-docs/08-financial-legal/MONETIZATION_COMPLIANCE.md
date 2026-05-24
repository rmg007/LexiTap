---
title: Monetization Compliance
category: financial-legal
status: active
updated: 2026-05-24
priority: P0
tags: [iap, apple-guidelines, google-guidelines, restore-purchases, receipt-validation, family-sharing, refunds, promo-codes, teacher-discount, compliance]
---

# Monetization Compliance

The App Store and Play Store monetization rules LexiTap must satisfy, and — most importantly — how the teacher-referral discount and student discount mechanics fit inside those rules without triggering rejection. This is a P0 doc because the teacher referral network is the primary GTM channel, and the naive implementation of "give students a discount code" is exactly the pattern both stores reject.

Pairs with [APP_STORE_DISTRIBUTION_STRATEGY.md](./APP_STORE_DISTRIBUTION_STRATEGY.md) and [REVENUE_MODEL_PRICING.md](./REVENUE_MODEL_PRICING.md). Payment integration is `expo-in-app-purchases` per [../../notion-docs/IMPLEMENTATION_ROADMAP.md](../../notion-docs/IMPLEMENTATION_ROADMAP.md) Phase 3B.

## Contents

- [The Core Rule: Digital Content Must Use IAP](#the-core-rule-digital-content-must-use-iap)
- [Restore Purchases](#restore-purchases)
- [Receipt Validation](#receipt-validation)
- [Family Sharing](#family-sharing)
- [Refund Handling](#refund-handling)
- [Teacher Referral and Student Discount Mechanics](#teacher-referral-and-student-discount-mechanics)
- [Promo Codes](#promo-codes)
- [Subscription Rules (Premium Pass)](#subscription-rules-premium-pass)
- [Compliance Checklist](#compliance-checklist)
- [Open Questions](#open-questions)

## The Core Rule: Digital Content Must Use IAP

LexiTap's paid tiers unlock digital content consumed inside the app. Under Apple Guideline 3.1.1 and Google Play's Payments policy, **digital content consumed within the app MUST be sold through the platform's in-app purchase system.** LexiTap may not:
- Take payment for a tier via an external website, Stripe, PayPal checkout, etc.
- Link to or steer users toward an external purchase flow to avoid commission.
- Unlock a paid tier in exchange for an off-store payment.

This is non-negotiable and shapes everything below, especially the teacher discount design. The 15-30% store commission is the cost of this rule and is modeled in the revenue doc.

## Restore Purchases

Required by Apple Guideline 3.1.1. Because all paid tiers are **non-consumable** (own forever), the app must provide a visible **Restore Purchases** button (already in the Phase 3B build list). On a new device or reinstall, Restore must re-grant every previously purchased tier with no re-charge. LexiTap's entitlements are mirrored to Supabase (`user_entitlements` / `user_entitlements_sync`), so restore can reconcile against both the store receipt and the cloud entitlement record.

## Receipt Validation

- On purchase and on restore, validate the store receipt before writing the entitlement.
- Validate against Apple's verifyReceipt / App Store Server API and Google Play Developer API. Server-side validation (via Supabase Edge Function) is strongly preferred over trusting the client, to resist tampering.
- The schema note in [../../notion-docs/DATABASE_SCHEMA.md](../../notion-docs/DATABASE_SCHEMA.md) calls for validating receipts on launch and deleting invalid entitlements — implement this as the reconciliation path for refunds and revoked purchases.

## Family Sharing

- **Apple Family Sharing:** non-consumables and subscriptions *can* be made Family-Sharing-eligible. This is a toggle per IAP product. If enabled, one purchase is shared across up to six family members — good for users, but it reduces per-seat revenue.
- **Google Play Family Library:** analogous opt-in for eligible purchases.
- **Decision needed (Open Question):** whether to enable Family Sharing on LexiTap tiers. Enabling it is a goodwill/conversion lever consistent with the "trust and ownership" brand, but it dilutes ARPPU and is not currently in the revenue model. Premium Pass family sharing especially needs a deliberate call.

## Refund Handling

- Refunds are processed **by the store, not by LexiTap.** Apple handles refunds via the user's Apple account / Report a Problem; Google via the Play refund flow. The founder cannot directly issue an IAP refund.
- LexiTap must **honor store-initiated refunds** by revoking the entitlement: listen for refund/revocation signals (App Store Server Notifications v2, Google Play Voided Purchases / Real-time Developer Notifications) and delete the entitlement on the server + sync to the device.
- Support policy: direct refund requests to the store's process; do not promise refunds the store controls. A clear in-app/support-page explanation reduces frustration.
- The one-time-ownership model is expected to *lower* refund and chargeback rates versus subscriptions, since there is no surprise auto-renewal to dispute.

## Teacher Referral and Student Discount Mechanics

This is the highest-compliance-risk part of the GTM. The teacher network gives students ~20% off via a teacher code, and teachers earn 20-35% commission paid via PayPal. Done naively (an external discount code + external checkout), this **violates the IAP rule** and gets the app rejected.

Compliant design — the discount must be delivered through a store-native mechanism, and the commission is an internal accounting payout, not a payment rail:

- **Student discount via store-native offers, not external codes:**
  - **Apple:** use **Offer Codes** (for subscriptions like Premium Pass) and **Win-back/Custom offers**; for non-consumables, the practical lever is configuring a discounted price or a promo-code-redeemed entitlement. The cleanest path is store-managed offers redeemed inside the app via the store's redemption sheet — the purchase still flows through IAP at the discounted store price.
  - **Google:** use Play's **promo codes** / discounted offers, redeemed through Play.
  - The teacher's "code" should map to a store-native offer or to a LexiTap-tracked referral attribution — NOT to an external price the user pays off-store.
- **Two viable architectures, pick one (Open Question):**
  1. **Store-discounted price + referral attribution:** student buys at a store-configured discounted price; LexiTap records which teacher's code attributed the sale (via the `referrals` / `promo_codes` tables in the schema) to compute commission. Purchase stays 100% inside IAP. Lowest rejection risk.
  2. **Full-price IAP + post-purchase rebate:** student pays full IAP price; teacher commission and student "discount" are handled as off-store rebates. Higher friction, weaker "discount" UX, and rebating the *student* off-store edges toward the steering rules — less preferred.
- **Teacher commission payouts via PayPal are fine** — they are LexiTap paying a marketing affiliate out of its own net revenue, not a user paying for content. This is bookkeeping, outside the stores' payment scope. Keep records (PayPal payout log + `referrals` table) for tax/1099-style reporting.
- **Hard rule:** the student must never complete the purchase of a digital tier anywhere except the store's IAP sheet.

## Promo Codes

- LexiTap plans a promo-code system for goodwill marketing (free unlocks — e.g. friend/plumber codes), backed by the `promo_codes` table (`free_product_id`).
- **Store-native promo/offer codes** (Apple Offer Codes, Google promo codes) are the compliant way to grant a *free or discounted store purchase*.
- A LexiTap-internal promo code that simply flips an entitlement to "unlocked" for free is acceptable **only if no payment is involved** — granting free access is not a sale and does not implicate IAP rules. The risk is only when money changes hands outside the store.
- Cap and track free unlocks so goodwill marketing does not erode paid conversion.

## Subscription Rules (Premium Pass)

Premium Pass is the only auto-renewable subscription and carries the strictest rules — precisely the area where ELSA earned backlash, so over-comply:
- Disclose price, billing period (annual), and auto-renewal **clearly on the paywall before purchase** (Apple 3.1.2).
- Link to Terms of Use (EULA) and Privacy Policy from the paywall.
- Make cancellation discoverable; explain that the user manages/cancels via their store account.
- Honor the "future tiers included" promise: Premium Pass must auto-grant each post-launch content drop to active subscribers.
- Handle subscription lifecycle signals (renew, expire, refund, grace period) via server notifications and reflect them in entitlements.

## Compliance Checklist

| Item | Requirement | Status |
|------|-------------|--------|
| All paid tiers sold via IAP | Apple 3.1.1 / Play Payments | Required Phase 3B |
| Restore Purchases button | Apple 3.1.1 | In Phase 3B build list |
| Server-side receipt validation | Anti-tamper | Supabase Edge Function — to build |
| Refund/revocation listener | Honor store refunds | To build |
| Student discount via store-native offer | Avoid external-payment rejection | Design decision pending |
| Teacher payout via PayPal (off-store) | Allowed (affiliate payout) | Schema + PayPal ready |
| Promo codes (free unlocks) | No off-store payment | Schema `promo_codes` |
| Subscription disclosures (Premium Pass) | Apple 3.1.2 | Paywall design |
| Privacy policy + ToS/EULA linked | Both stores | Phase 5 |
| Sign in with Apple (if Google login) | Apple 4.8 | See distribution doc |

## Open Questions

- **Which discount architecture** (store-discounted-price + attribution vs full-price + rebate) does the teacher network use? Architecture #1 is recommended; confirm before building the teacher portal and `referrals` flow.
- **Enable Family Sharing** on tiers and/or Premium Pass? Revenue impact is unmodeled — decide before launch.
- **Offer Codes vs promo codes vs discounted price tiers** — confirm the exact store mechanism per tier (non-consumables vs the Premium Pass subscription behave differently).
- **`expo-in-app-purchases` deprecation** affects how receipt validation and offer redemption are implemented; a move to RevenueCat would change parts of this doc (RevenueCat handles validation and entitlements). Flagged in the distribution and dependency docs.
- **Tax/reporting** for teacher payouts (1099 thresholds, international teachers) — out of scope here; flag for the business-setup backlog.
