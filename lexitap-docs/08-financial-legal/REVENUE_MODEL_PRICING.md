---
title: Revenue Model and Pricing Sheet
category: financial-legal
status: active
updated: 2026-05-24
priority: P0
tags: [revenue, pricing, subscription, B2B-licensing, cram-schools, arppu, projections, store-commission, Stripe]
---

# Revenue Model and Pricing Sheet

This is the decision-grade pricing and revenue reference for LexiTap. It expands the product definition in [../02-product-definition/PRODUCT_REQUIREMENTS_DOCUMENT.md](../02-product-definition/PRODUCT_REQUIREMENTS_DOCUMENT.md) and the projections in [../01-discovery-strategy/VISION_PROBLEM_STATEMENT.md](../01-discovery-strategy/VISION_PROBLEM_STATEMENT.md) into a net-revenue model that accounts for the difference between App Store IAP commissions and direct B2B web-payment processing.

LexiTap is a solo-founder ESL vocabulary app. The audience is global ESL test-takers and the schools that train them.

---

## Contents

- [Pricing Sheet (Locked)](#pricing-sheet-locked)
- [Why Subscriptions and B2B Seats](#why-subscriptions-and-b2b-seats)
- [Revenue Models: B2C IAP vs B2B Web Direct](#revenue-models-b2c-iap-vs-b2b-web-direct)
- [Net Revenue Per Transaction](#net-revenue-per-transaction)
- [ARPPU & LTV Modeling](#arppu--ltv-modeling)
- [Revenue Projections (Years 1-3)](#revenue-projections-years-1-3)
- [Repricing Discipline](#repricing-discipline)
- [Open Questions](#open-questions)

---

## Pricing Sheet (Locked)

These prices are locked through launch. Do not change without satisfying the data-driven repricing triggers.

### Individual Consumer Tiers (In-App Purchase)

| SKU | Product | Type | Price | Wave |
|-----|---------|------|-------|------|
| com.lexitap.foundation | Foundation Vocabulary | Free | $0.00 | Launch |
| com.lexitap.advanced | Advanced Vocabulary | Free | $0.00 | Launch |
| com.lexitap.common3k | Common 3000 Unlock | One-time unlock | $1.99 | Launch |
| com.lexitap.premium.monthly | Premium Pass (Monthly) | Monthly recurring | $4.99/mo | Launch |
| com.lexitap.premium.annual | Premium Pass (Annual) | Annual recurring | $24.99/yr | Launch |

*Note: Premium Pass unlocks access to all premium word sets (TOEFL, IELTS, Business English, GRE, GMAT, Phrasal Verbs, and Idioms).*

### B2B Cram School Bulk seat Packs (Web Direct via Stripe)

| SKU | Package Name | Volume | Price | Effective Cost/Seat |
|-----|--------------|--------|-------|---------------------|
| b2b.classroom | Classroom Pack | 20 seats | $199/year | ~$9.95/seat |
| b2b.academy | Academy Pack | 50 seats | $399/year | ~$7.98/seat |
| b2b.campus | Campus Pack | 200 seats | $1,199/year | ~$5.99/seat |

---

## Why Subscriptions and B2B Seats

The strategic pivot to subscriptions and B2B bulk seat sales directly corrects the fatal weaknesses of the legacy "one-time purchase" model:

1. **Curing Post-Test Churn:** Standardized test preparation (TOEFL/IELTS) is a finite user need. Under the old model, users bought a single tier and churned, creating a capped LTV and a perpetual marketing treadmill. Subscriptions align revenue with the high-intensity study window, and annual models accommodate students taking multiple tests over a year.
2. **Predictable B2B Group Cashflow:** Cram schools buy seat bundles on behalf of entire classrooms. This establishes substantial, high-value direct transactions (up to $1,199) and stable annual renewal loops, shifting the business away from micro-conversions.
3. **Eliminating Cash Micro-Payouts:** Replaces PayPal micro-commissions to individual freelance teachers with an in-app reward credit program, wiping out FATCA, Digital Services Tax, and KYC/AML compliance overhead.

---

## Revenue Models: B2C IAP vs B2B Web Direct

Every transaction incurs fee erosion, but the channels perform very differently:

- **B2C IAP (Apple App Store / Google Play):**
  - Commission: **15%** of gross (enrolled in Apple Small Business Program and Google's 15% tier).
  - Managed entirely via RevenueCat.
- **B2B Web Direct (Stripe Checkout):**
  - Commission: **3%** of gross (standard Stripe processing fee).
  - Web payments are **100% compliant** with store guidelines because the bulk licenses are sold to organizations for multi-user distribution off-store (Apple Guideline 3.1.3(c)).

---

## Net Revenue Per Transaction

### B2C Individual Purchases (15% Store Cut)

- **$1.99 Common 3000 Unlock:** Gross $1.99 → Net of Store (15%) = **$1.69**
- **$4.99 Monthly Subscription:** Gross $4.99 → Net of Store (15%) = **$4.24**
- **$24.99 Annual Subscription:** Gross $24.99 → Net of Store (15%) = **$21.24**

### B2B Bulk purchases (3% Stripe Cut)

- **$199 Classroom Pack (20 seats):** Gross $199.00 → Net of Stripe (3%) = **$193.03**
- **$399 Academy Pack (50 seats):** Gross $399.00 → Net of Stripe (3%) = **$387.03**
- **$1,199 Campus Pack (200 seats):** Gross $1,199.00 → Net of Stripe (3%) = **$1,163.03**

*Direct web sales yield a net margin of 97% of gross revenue, compared to 85% for app store subscriptions.*

---

## ARPPU & LTV Modeling

Blended Average Revenue Per Paying User (ARPPU) target: **$12 net per year**.
- Assumes a typical consumer subscriber stays for 2.5 months ($4.99/mo = $12.48 gross) or purchases the annual subscription ($24.99 gross).
- B2B seats average ~$6.00 to ~$9.95 in net revenue depending on the package volume.
- Blended Net ARPPU is highly stable because the lower unit margins of bulk seats are compensated by Stripe's near-zero transaction fee erosion.

---

## Revenue Projections (Years 1-3)

Net revenue subtracts 15% store commission on B2C IAP and 3% card fees on B2B direct transactions.

### Year 1
- **Conservative Scenario (10,000 active users):**
  - 1.5% B2C subscription conversion = 150 subscribers @ $20 LTV = $3,000 gross ($2,550 net).
  - 6 B2B Cram School "Classroom" packages (120 seats) = $1,194 gross ($1,158 net).
  - **Total Net Revenue: ~$3,708** (comfortably covers the $194 Year 1 cost base).
- **Optimistic Scenario (15,000 active users):**
  - 2.5% B2C conversion = 375 subscribers = $7,500 gross ($6,375 net).
  - 12 B2B Classroom + 3 Academy packages (390 seats) = $3,585 gross ($3,477 net).
  - **Total Net Revenue: ~$9,852**

### Year 2
- **Conservative (50,000 active users):**
  - 2.0% B2C conversion = 1,000 subscribers = $20,000 gross ($17,000 net).
  - 50 B2B Classroom + 10 Academy contracts (1,500 seats) = $13,940 gross ($13,520 net).
  - **Total Net Revenue: ~$30,520**
- **Optimistic (70,000 active users):**
  - 3.5% B2C conversion = 2,450 subscribers = $49,000 gross ($41,650 net).
  - 80 Classroom + 30 Academy + 5 Campus contracts (3,900 seats) = $33,910 gross ($32,890 net).
  - **Total Net Revenue: ~$74,540**

### Year 3
- **Conservative / Mature (150,000 active users):**
  - 2.5% B2C conversion = 3,750 subscribers = $75,000 gross ($63,750 net).
  - 100 Classroom + 50 Academy + 10 Campus contracts (6,500 seats) = $51,840 gross ($50,280 net).
  - **Total Net Revenue: ~$114,030**

---

## Repricing Discipline

- **Launch Pricing Freeze:** Subscription prices ($4.99/mo, $24.99/yr) and bulk packages are frozen through launch.
- **Repricing Reviews:** Schedule first review after 100 individual active paying subscribers or 5 paid cram schools are onboarded (whichever occurs first).
- **Repricing Gated by Data:** Changes require documented evidence of either:
  - Consumer churn spikes (triggers trial or price reduction).
  - High B2B contract retention (triggers volume pricing expansion).

---

## Open Questions

- **Regional Pricing Adjustments:** Will we offer custom localized subscription tiers for emerging market individual learners? (Currently deferred to post-launch).
- **Stripe Transaction Minimums:** Do small Classroom Pack transactions incur fixed Stripe card processing minimum penalties? (Stripe's 2.9% + $0.30 fee represents ~$6.00 on a $199 contract, well within our 3% modeling margin).
