---
title: Revenue Model and Pricing Sheet
category: financial-legal
status: active
updated: 2026-05-24
priority: P0
tags: [revenue, pricing, one-time-purchase, premium-pass, arppu, projections, teacher-commission, store-commission, anchoring]
---

# Revenue Model and Pricing Sheet

This is the decision-grade pricing and revenue reference for LexiTap. It expands the high-level model in [../../notion-docs/PRODUCT_STRATEGY.md](../../notion-docs/PRODUCT_STRATEGY.md) and the projection figures in [../../notion-docs/PROJECT_OVERVIEW.md](../../notion-docs/PROJECT_OVERVIEW.md) into a full net-revenue model that accounts for the two costs the strategy docs gloss over: the 15-30% Apple/Google store commission and the 20-35% teacher referral commission.

LexiTap is a solo-founder ESL vocabulary app in Phase 0. The audience is global ESL learners (non-native English speakers) only. American-student vocabulary is a separate product.

## Contents

- [Pricing Sheet (Locked)](#pricing-sheet-locked)
- [Why One-Time Purchases](#why-one-time-purchases)
- [Premium Pass: The Only Subscription](#premium-pass-the-only-subscription)
- [Price Anchoring Ladder](#price-anchoring-ladder)
- [Competitor Annual Benchmarks](#competitor-annual-benchmarks)
- [Early-Adopter Intro Pricing](#early-adopter-intro-pricing)
- [The Two Commissions: Store and Teacher](#the-two-commissions-store-and-teacher)
- [Net Revenue Per Transaction](#net-revenue-per-transaction)
- [ARPPU](#arppu)
- [Revenue Projections](#revenue-projections)
- [Repricing Discipline](#repricing-discipline)
- [Open Questions](#open-questions)

## Pricing Sheet (Locked)

These prices are locked through launch. Do not change without satisfying the repricing trigger below.

| Tier | Type | Price | SKU | Wave |
|------|------|-------|-----|------|
| Foundation (top 3,000 words) | Free | $0.00 | — | Launch |
| Advanced (words 3,001-9,000) | Free | $0.00 | — | Launch |
| Common 3000 | One-time | $2.99 | com.lexitap.common3k | Launch |
| Business English | One-time | $9.99 | com.lexitap.business | Launch |
| TOEFL Vocabulary | One-time | $14.99 | com.lexitap.toefl | Launch |
| IELTS Vocabulary | One-time | $14.99 | com.lexitap.ielts | Launch |
| Premium Pass | Annual subscription | $29.99/yr | com.lexitap.premium | Launch |
| GRE Vocabulary | One-time | $14.99 | com.lexitap.gre | Post-launch (Wk 22) |
| GMAT Vocabulary | One-time | $14.99 | com.lexitap.gmat | Post-launch (Wk 26) |
| Idioms & Expressions | One-time | $9.99 | com.lexitap.idioms | Post-launch (Wk 30) |
| Phrasal Verbs | One-time | $9.99 | com.lexitap.phrasal | Post-launch (Wk 34) |

SKUs are sourced from [../../notion-docs/DATABASE_SCHEMA.md](../../notion-docs/DATABASE_SCHEMA.md) (`content_tiers.sku`). Post-launch tiers ship as IAP products with `is_active = 0` until their content drop lands.

Sum of all paid one-time tiers at list price: $2.99 + $9.99 + $14.99 + $14.99 + $14.99 + $14.99 + $9.99 + $9.99 = **$92.92** across 8 tiers. The strategy docs round the buyer-facing pitch to "~$88 value." Both figures are used: $92.92 is the precise individual-purchase total; ~$88 is the conservative marketing anchor (understating value is the safe direction).

## Why One-Time Purchases

One-time ownership is a deliberate trust and ownership moat, not a pricing accident. It is a structural response to three documented market failures:

1. **WordUp paywall hostility** — removed its "learn now" core feature post-launch, a trust-destruction event that drove negative reviews and uninstalls.
2. **ELSA Speak auto-renewal backlash** — non-transparent auto-renewals drove mass uninstalls.
3. **Category subscription fatigue** — market research identifies recurring-subscription resistance as a category-level threat to WordUp and ELSA.

Test prep is a finite need: a student takes TOEFL once, then is done. Charging a recurring fee for a one-time milestone is the exploitation pattern competitors are punished for. "Pay once, own it" converts that resentment into LexiTap's differentiator. Parents and sponsors also approve a one-time $10-15 far more readily than an open-ended subscription.

## Premium Pass: The Only Subscription

Premium Pass ($29.99/yr) is the sole recurring product. It unlocks every paid tier — current and all future post-launch drops — for the subscription year. Premium Pass holders receive each new content drop (GRE, GMAT, Idioms, Phrasal Verbs) free as it ships.

Rationale: a multi-test taker (TOEFL + GRE + Business English, say) has genuinely recurring value, and the annual model fits that. It is also the highest-LTV product and the cleanest way to deliver the post-launch content cadence without re-billing. Premium Pass converters lower blended per-transaction ARPPU but raise lifetime value and de-risk the content-drop roadmap (the content is pre-sold).

## Price Anchoring Ladder

The catalog is engineered as an ascending anchor ladder:

1. **Common 3000 at $2.99** is the entry product. Its job is not revenue — it is to convert a free user into a *paying* user. Crossing the $0 → paid threshold is the hardest conversion; $2.99 makes it nearly frictionless and proves willingness to pay.
2. **$2.99 makes $14.99 test prep feel reasonable.** Once a user owns one tier, the $14.99 TOEFL/IELTS price reads as "5x the small one," not "$15 from zero."
3. **Premium Pass at $29.99 anchors against ~$88-93 of individual value** — roughly a 66-68% discount. Positioned as "best bang for the buck," it captures committed multi-tier learners while individual tiers capture single-goal buyers.

## Competitor Annual Benchmarks

Annualized cost to the learner, for anchoring Premium Pass:

| Competitor | Annual Cost | Note |
|------------|-------------|------|
| Babbel | ~$168/yr | Broad language learning |
| Knowji | ~$120/yr | Closest feature-surface competitor; device-bound SRS |
| Memrise | ~$90/yr | Video-native content moat |
| ELSA Speak | ~$89-99/yr | Pronunciation lane; auto-renewal backlash |
| Duolingo Super | ~$84/yr | Different audience — not a competitive frame |
| **LexiTap Premium Pass** | **$29.99/yr** | Cheapest credible option in category by a wide margin |

LexiTap Premium Pass is roughly 2-4x cheaper than the nearest credible ESL competitors. Marketing must lead with this; SRS and gamification are 2026 table stakes, not differentiators.

## Early-Adopter Intro Pricing

During the first paid-tier push (Phase 3, ~Week 12), TOEFL ships at an **intro price of $11.99** versus the $14.99 list price — a $3.00 / 20% early-adopter discount. Purpose: lower friction for the first 10 paying users when there are zero reviews and zero social proof, and create urgency ("intro pricing ends soon"). The discount is delivered as a temporary list-price reduction on the IAP product, not a code, to keep it inside store rules (see [MONETIZATION_COMPLIANCE.md](./MONETIZATION_COMPLIANCE.md)).

Note: the teacher-referral student discount (~20% off via teacher code) is a separate mechanism and does not stack with intro pricing in the launch model — see the commission section below and the compliance doc for how external discount codes interact with IAP.

## The Two Commissions: Store and Teacher

Every dollar of gross IAP revenue is reduced twice before it reaches the founder.

**Store commission (Apple / Google):**
- Standard rate: **30%** of gross.
- Small Business Program rate: **15%** of gross (Apple App Store Small Business Program and Google Play's 15%-on-first-$1M tier both apply to developers under ~$1M/yr — LexiTap qualifies for the entire projection horizon).
- LexiTap will be at the **15%** rate for Year 1-3. The 30% figure is modeled as a stress case.

**Teacher referral commission:** paid out of LexiTap's net-of-store revenue via PayPal, tiered by referral volume:

| Tier | Referrals | Commission |
|------|-----------|------------|
| Tier 1 | 1-10 | 20% |
| Tier 2 | 11-50 | 25% |
| Tier 3 | 51-200 | 30% |
| Tier 4 | 201+ | 35% |

Blended teacher commission is modeled at **25%** (the strategy docs' assumption). Only teacher-referred sales incur this; direct App Store sales do not. The student also receives ~20% off via the teacher code, which reduces gross on referred sales.

## Net Revenue Per Transaction

Worked example for a single $14.99 TOEFL sale, at the 15% store rate:

| Channel | Gross | After store (15%) | After teacher commission | Founder net |
|---------|-------|-------------------|--------------------------|-------------|
| Direct (App Store) | $14.99 | $12.74 | n/a | **$12.74** |
| Teacher-referred (no student discount) | $14.99 | $12.74 | -25% of $12.74 = -$3.19 | **$9.55** |
| Teacher-referred (student gets 20% off → $11.99 gross) | $11.99 | $10.19 | -25% of $10.19 = -$2.55 | **$7.64** |

Same sale at the 30% stress-case store rate, direct: $14.99 → **$10.49** net.

Takeaway: a direct sale nets ~85% of gross; a teacher-referred discounted sale nets ~51% of gross. The teacher channel trades margin for reach and low CAC — the founder does no marketing on referred sales. The model assumes the teacher channel grows volume enough to outweigh the per-unit margin hit.

## ARPPU

Average revenue per paying user (gross, buyer-facing) target: **$12-15**, consistent across the projection docs.

- Single-tier buyer (TOEFL or IELTS only): $14.99
- Entry buyer (Common 3000 only): $2.99
- Premium Pass buyer: $29.99 (highest gross, highest LTV)
- Blended ARPPU lands at ~$12 conservative / ~$15 optimistic, because Common 3000 entry buyers and single-tier buyers pull the average below the headline $14.99.

Net ARPPU (founder-realized) after a 15% store cut and a 25% blended teacher cut on ~half of sales is approximately **$9-11**. This is the figure that drives the net projections below.

## Revenue Projections

Two scenarios per year. "Gross" is buyer-facing revenue. "Net (~74%)" subtracts a 15% store commission on all sales and a 25% teacher commission on an assumed 50% of sales (referred), then rounds.

Net factor: store leaves 85% of gross; on the referred half, teacher takes another 25%, i.e. effective net = 0.85 × (0.5 × 1.0 + 0.5 × 0.75) = 0.85 × 0.875 ≈ **0.744 of gross**.

### Year 1

| Scenario | Free users | Conv. | Paying | ARPPU | Gross | Net (~74%) |
|----------|-----------|-------|--------|-------|-------|------------|
| Conservative | 10,000 | 3% | 300 | $12 | **$3,600** | ~$2,680 |
| Optimistic | 15,000 | 5% | 750 | $13 | **$9,750** | ~$7,250 |

The $3,600 conservative figure is the official Year 1 target. Against a ~$144 Year 1 cost base, even the conservative case is gross-margin positive in Year 1.

### Year 2

| Scenario | Free users | Conv. | Paying | ARPPU | Gross | Net (~74%) |
|----------|-----------|-------|--------|-------|-------|------------|
| Conservative | 50,000 | 5% | 2,500 | $12 | **$30,000** | ~$22,300 |
| Optimistic | 70,000 | 8% | 5,600 | $14 | **$78,400** | ~$58,300 |

### Year 3

| Scenario | Free users | Conv. | Paying | ARPPU | Gross | Net |
|----------|-----------|-------|--------|-------|-------|-----|
| Conservative (mature) | 150,000 | 5% | 7,500 | $12 | **$90,000** | ~$67,500 |
| Optimistic (TOEFL focus) | 60,000 | 15% | 9,000 | $15 | **$135,000** | ~$101,250 |

The Year 3 net figures match the strategy docs, which subtract only the 25% teacher commission (-$22,500 conservative, -$33,750 optimistic) and fold store commission into ARPPU. Both methods land in the same ~$67.5K / ~$101K range; this doc's ~74% factor is the more conservative read because it makes the store cut explicit.

Official revenue milestones: first 10 paying users by Week 12; $1,000/month by Phase 4; Year 1 $3,600; Year 2 $30,000; Year 3 ~$67,500 net.

## Repricing Discipline

- **No price changes through launch.** Prices are locked.
- **First repricing review: after 100+ paying users** (approximately Month 3 post-launch), when there is real per-tier conversion data.
- Premium Pass price is locked through launch and revisited only after the 100-paying-user threshold.
- Repricing is data-gated, never vibe-gated: a change requires evidence (conversion lift/drop, ARPPU shift, competitor move) documented before the price moves.

## Open Questions

- **Does the student discount stack with TOEFL intro pricing?** Current model: no (mutually exclusive in Phase 3). Confirm before the teacher portal launches.
- **Currency / regional pricing:** Apple/Google price tiers auto-convert. Whether to set custom regional pricing for lower-income ESL markets (a large share of the addressable audience) is undecided — potentially significant for conversion, deferred to post-launch ASO/pricing work.
- **Premium Pass renewal rate** is unknown until Year 2 data exists; LTV modeling assumes a single year until then.
- **Family Sharing impact on one-time-purchase revenue** — see [MONETIZATION_COMPLIANCE.md](./MONETIZATION_COMPLIANCE.md); one purchase shared across a family reduces per-seat revenue and is not yet modeled.
