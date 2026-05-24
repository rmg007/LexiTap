---
title: Go-to-Market Strategy
category: strategy
status: active
updated: 2026-05-24
priority: P0
tags: [gtm, teacher-referral, commission, promo-codes, launch-sequence, content-marketing, channels, aso]
---

# Go-to-Market Strategy

> Comprehensive GTM playbook. Operating-layer summary in [../../notion-docs/PRODUCT_STRATEGY.md](../../notion-docs/PRODUCT_STRATEGY.md) (Go-to-Market section). Personas in [TARGET_USER_PERSONAS.md](./TARGET_USER_PERSONAS.md); economics in [BUSINESS_MODEL_CANVAS.md](./BUSINESS_MODEL_CANVAS.md).

## Strategy in One Line

A solo founder with a ~$144 budget cannot buy users. So the primary channel is a teacher referral network where teachers do the marketing in exchange for commission, backed by secondary organic channels (App Store SEO, Reddit, Shorts). The goal: 1,000 users in ~21 weeks.

## Primary Channel — Teacher Referral Network

ESL/cram-school/freelance English teachers each reach dozens of motivated students. One teacher with 50 students is a built-in network effect; the teacher's recommendation carries trust LexiTap cannot buy. Incentives are aligned: teachers want students to succeed, and successful students buy tiers.

### Mechanics

- **Referral codes:** each teacher gets a unique code (e.g. `TEACHER_MARIA`).
- **Student discount:** students who use a teacher code get 20% off paid tiers — the hook that makes the code worth sharing.
- **Tiered commission** on student purchases, escalating with cumulative referrals:

| Tier | Cumulative referrals | Commission |
|------|---------------------|-----------|
| 1 | 1–10 | 20% |
| 2 | 11–50 | 25% |
| 3 | 51–200 | 30% |
| 4 | 201+ | 35% |

- **Worked example:** 50 students each buy TOEFL at $14.99 (less 20% student discount = $11.99 net) → at Tier 2 (25%) the teacher earns ~$150; the founder's own example figure is "$200+" at scale across multiple tiers/purchases.
- **Promo codes (distinct from referral codes):** free full-tier unlocks for goodwill marketing (e.g., gifting a friend, a community contact). These drive zero revenue but seed advocates and reviews.
- **Payout:** tracked via Supabase teacher/referral tables; teachers see referrals and earnings in the lexitap.app/teachers dashboard. (Payout cadence/threshold mechanics are a P1 backlog item — see Open Questions.)

### Why it works for this budget

CAC is effectively the commission, which is paid only on realized revenue — there is no upfront ad spend. The teacher absorbs the marketing labor. This is the only channel that scales user acquisition without cash the founder does not have.

## Secondary Channels (Organic)

- **App Store SEO / ASO:** keyword set — vocabulary, english, TOEFL, IELTS, ESL, test prep, spaced repetition, offline, no typing, tap, flashcards. App name "LexiTap: Vocabulary Without Typing"; subtitle "TOEFL, IELTS & English vocabulary. No keyboard." (APAC-language ASO localization deferred until >$500/quarter or organic blockage shows.)
- **Reddit / forums:** authentic presence in r/TOEFL, r/IELTS, r/ESL, and post-launch r/GRE, r/GMAT — answer questions, share "word of the day," do not spam.
- **TikTok / YouTube Shorts:** "word of the day," "TOEFL words you need to know," "no typing = no frustration" demo, "how spaced repetition works." Cheap, audience-matched to the 18–24 cohort (48% engagement).

## Content Marketing

- Blog/SEO articles on lexitap.app: "Best TOEFL vocabulary," "How to study for IELTS," idiom/phrasal-verb explainers (lean into WordUp's documented blindspot).
- Repurpose each article into Shorts and Reddit-friendly posts.
- Lead with the marketing pillars: own-forever / no auto-renewal, zero ads, best bang for the buck, no-typing/mobile/offline. Never lead with SRS or AI (table stakes). Never compare directly to Duolingo (different audience). Never over-promise fluency.

## The 21-Week Path to 1,000 Users

Aligned to the validation phases in [../../notion-docs/PRODUCT_STRATEGY.md](../../notion-docs/PRODUCT_STRATEGY.md) and the build checklist in [../../notion-docs/PROJECT_OVERVIEW.md](../../notion-docs/PROJECT_OVERVIEW.md):

| Weeks | Phase | GTM action | Outcome |
|-------|-------|-----------|---------|
| 1 | Phase 0 — Validation | Validation research; start sourcing teacher contacts | Thesis confirmed; teacher shortlist |
| 2–6 | Phase 1 — Build free MVP | Begin content marketing early (blog, Shorts); recruit beta teachers | Audience warmed pre-launch |
| 6–9 | Phase 2 — Beta + WTP | 50 beta testers via teachers/Reddit/groups; measure D7; show TOEFL mockups to top 20 | D7 >30%; 5/20 say yes to $14.99 |
| 10–11 | Phase 2 close | Lock TOEFL build decision on WTP signal | Go/no-go on first paid tier |
| 12–15 | Phase 3 — First paid module | Build + launch TOEFL; activate first teacher codes | 10 paying users; 5% conversion |
| 16–18 | Phases 4–5 — Expand + launch | Add IELTS/Business/Common3K + Premium Pass; App Store launch; deploy teacher portal | Public launch live |
| 19–21 | Phase 6 — Growth | Activate full teacher network; ASO; Reddit/Shorts cadence | Scale toward 1,000 users |
| 22+ | Post-launch drops | Monthly content drops: GRE, GMAT, Idioms, Phrasal Verbs (order by conversion data) | Expand WTP surface; mitigate post-test churn |

## Launch Sequence Notes

- Tier launch order: TOEFL first (highest WTP, best teacher-network fit), then IELTS, Business English, Common 3000, Premium Pass.
- Pre-launch: register domain, Apple ($99) + Google ($25) accounts, app icon, website, support@lexitap.app, @lexitap social handles, teacher signup page, privacy policy + ToS.
- Free cloud sync is a launch-day differentiator against Knowji's device-bound SRS and WordUp's sync failures — feature it.

## Open Questions

- Teacher payout cadence, minimum threshold, and payment rails (PayPal? Wise? store credit?) — P1 backlog; needs resolution before teacher network activation in Phase 6.
- Cold-start for the teacher network: how are the first ~10 teachers recruited, and what proof do they need to participate pre-revenue? Likely founder's direct ESL contacts + promo-code goodwill seeding.
- Which secondary channel produces the best organic conversion (Reddit vs. Shorts vs. ASO) — instrument and double down post-launch.
