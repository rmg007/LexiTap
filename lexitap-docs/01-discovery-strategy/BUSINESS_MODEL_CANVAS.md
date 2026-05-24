---
title: Business Model Canvas
category: strategy
status: active
updated: 2026-05-24
priority: P1
tags: [business-model, canvas, revenue, value-proposition, cost-structure, budget, teacher-partners, metrics]
---

# Business Model Canvas

> Full nine-block canvas for LexiTap. Numbers reconcile with [../../notion-docs/PRODUCT_STRATEGY.md](../../notion-docs/PRODUCT_STRATEGY.md) (pricing, revenue) and [../../notion-docs/PROJECT_OVERVIEW.md](../../notion-docs/PROJECT_OVERVIEW.md) (tech stack, projections). Personas referenced from [TARGET_USER_PERSONAS.md](./TARGET_USER_PERSONAS.md).

## 1. Customer Segments

- **Free-tier habit builders** (Linh) — top of funnel; general ESL improvers on Foundation/Advanced.
- **Test-prep converters** (Mei, Rafael, Sunil) — TOEFL, IELTS, and post-launch GRE/GMAT candidates with deadline-driven urgency; highest WTP.
- **ESL professionals** (Aisha) — Business English, idioms, phrasal verbs; steady multi-tier and Premium Pass buyers.
- **Teacher partners** — a two-sided segment: distribution channel AND beneficiaries (commission). Freelance/ESL/cram-school teachers.

Explicitly excluded: American students (SAT/ACT, K-12), native-speaker lexicon expanders. Separate product.

## 2. Value Propositions

**For learners:**

- Own forever, no auto-renewal, no subscription traps (one-time tiers; only Premium Pass recurs, never silently).
- Zero ads, ever — nothing to "upgrade to remove."
- Best bang for the buck — Premium Pass $29.99/yr vs. $84–168/yr peers.
- No typing, mobile-first, offline-first reliability.
- Free cloud sync — never lose progress to a lost or upgraded device.
- Idioms and phrasal verbs — the ESL pain WordUp ignores.
- Adult-professional aesthetic — usable without embarrassment.

**For teachers:** easy to recommend, 20–35% tiered commission, student discount to share, progress/referral dashboard.

## 3. Channels

- **Primary:** teacher referral network (tiered commission + student discount codes). Low CAC, aligned incentives, built-in viral loop.
- **Secondary:** App Store SEO/ASO; Reddit (r/TOEFL, r/IELTS, r/ESL, r/GRE, r/GMAT); TikTok/YouTube Shorts ("word of the day").
- **Owned:** lexitap.app website + teacher portal (Vercel-hosted).
- Detailed mechanics in [GO_TO_MARKET_STRATEGY.md](./GO_TO_MARKET_STRATEGY.md).

## 4. Customer Relationships

- Self-serve, low-touch product (download → free habit → in-app purchase).
- Trust-led relationship: privacy promise (no tracking, no ads, no data selling), transparent one-time pricing, SRS forgiveness (no guilt).
- support@lexitap.app for support; teacher partners act as a human relationship layer for referred students.
- Retention via habit loop (streak + SRS) and free cloud sync continuity.

## 5. Revenue Streams

**One-time purchases (own forever):**

| Product | Price | Wave |
|---------|-------|------|
| Common 3000 | $2.99 | Launch |
| Business English | $9.99 | Launch |
| TOEFL Vocabulary | $14.99 | Launch |
| IELTS Vocabulary | $14.99 | Launch |
| GRE Vocabulary | $14.99 | Post-launch |
| GMAT Vocabulary | $14.99 | Post-launch |
| Idioms & Expressions | $9.99 | Post-launch |
| Phrasal Verbs | $9.99 | Post-launch |

**Recurring (only recurring product):** Premium Pass $29.99/yr — unlocks all paid tiers (~$88 if bought individually; ~66% off). No silent auto-renewal.

**Free (no revenue, the funnel):** Foundation (top 3,000), Advanced (3,001–9,000), free cloud sync.

ARPPU target ~$15–18 on individual purchases; Pass buyers lower ARPPU but lift LTV. No price changes through launch; first repricing review at 100+ payers (Month 3 post-launch).

## 6. Cost Structure (~$144 Year-1 Budget)

| Item | Cost | Notes |
|------|------|-------|
| Apple Developer account | $99/yr | Required for App Store |
| Google Play account | $25 one-time | |
| Domain (lexitap.app) | $20/yr | |
| Supabase backend | $0 | Free tier to 50K users, then $25/mo |
| Vercel website hosting | $0 | Free tier |
| Premium TTS audio (e.g., ElevenLabs) | ~$50 | TOEFL tier enrichment (Phase 3); partly beyond the strict $144 line |
| **Core Year-1 fixed total** | **~$144** | Apple + Google + domain |

Cost philosophy: near-zero variable cost (content pipeline is enrichment of founder-owned corpora; offline-first means low infra). The largest "cost" at scale is **teacher commissions** (a revenue share, not fixed cost): ~25% average, e.g. $22,500 against $90K Year-3 gross, netting ~$67.5K.

## 7. Key Activities

- Content pipeline: enrich founder-owned frequency corpora (definitions, audio, imagery, example sentences) — sourcing is resolved; this is enrichment, not acquisition.
- Mobile app build (React Native/Expo + SQLite, offline-first, no-typing widgets).
- Backend: Supabase auth, cloud sync, teacher/referral/promo-code system.
- Teacher network recruitment and management.
- Content marketing (Reddit, Shorts, ASO).

## 8. Key Resources

- Founder-owned word corpora (top 3,000 / 9,000; 3,000 TOEFL) — the content moat at zero acquisition cost.
- Codebase (clean/hexagonal architecture; domain layer reusable for future Schools app).
- Brand (LexiTap name = the no-typing UX; adult-professional identity).
- Teacher partner network (distribution asset).
- Solo-founder time — the scarcest resource; scope discipline is the constraint.

## 9. Key Partners

- **Teachers** — the central partner: distribution + trust + commission-aligned growth engine.
- **Platform providers** — Apple App Store, Google Play (IAP rails), Supabase, Vercel.
- **TTS provider** — ElevenLabs or comparable for paid-tier audio.

## Key Metrics

- **Acquisition:** total users (1,000 by Week ~21); teacher signups; referral code redemptions.
- **Activation/retention:** D1 >50%, D7 >30%, D30 >15%, avg session >3 min.
- **Monetization:** free→paid conversion (3% conservative → 15% optimistic); ARPPU ($15–18); Premium Pass attach rate; revenue ($3.6K Y1 → $30K Y2 → $90K Y3 gross).
- **Channel health:** teacher commission tier distribution; CAC vs. ~$144 budget; ASO keyword rank.

## Open Questions

- Premium Pass vs. individual-tier mix: Pass lifts LTV but suppresses ARPPU — what mix maximizes net? Needs 100+ payers.
- At what user count does Supabase cross into the $25/mo tier, and does revenue comfortably cover it (projected ~0.4% of revenue at 50K)?
