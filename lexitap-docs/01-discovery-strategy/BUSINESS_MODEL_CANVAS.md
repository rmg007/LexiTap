---
title: Business Model Canvas
category: strategy
status: active
updated: 2026-05-24
priority: P1
tags: [business-model, canvas, revenue, value-proposition, cost-structure, budget, B2B-licensing, cram-schools]
---

# Business Model Canvas

> Full nine-block canvas for LexiTap. Numbers reconcile with [../02-product-definition/PRODUCT_REQUIREMENTS_DOCUMENT.md](../02-product-definition/PRODUCT_REQUIREMENTS_DOCUMENT.md) (pricing, revenue) and [VISION_PROBLEM_STATEMENT.md](./VISION_PROBLEM_STATEMENT.md) (projections, success metrics). Personas referenced from [TARGET_USER_PERSONAS.md](./TARGET_USER_PERSONAS.md).

## 1. Customer Segments

- **B2B ESL Institutions (Primary)** — Cram schools, private language academies, and test prep centers requiring supplementary vocabulary training tools for their cohorts.
- **Test-Prep Individual Subscribers** — Individual candidates preparing for TOEFL, IELTS, GRE, and GMAT with deadline-driven urgency.
- **Free-tier Habit Builders** — General ESL learners building vocabulary via Foundation/Advanced lists; primary individual top-of-funnel.
- **Teacher Advocates** — Individual educators acting as distribution partners in exchange for in-app credit and free seats for their students.

*Explicitly excluded: American K-12 students (SAT/ACT, grade-level vocabulary).*

---

## 2. Value Propositions

**For Cram Schools:**
- Higher exam pass rates via high-efficacy spelling/active recall training.
- Low-cost bulk licenses (up to 70% cheaper than individual App Store purchases).
- School Admin Dashboard to monitor student progress, review times, and streaks.
- Secure, web-based direct purchasing bypassing App Store overhead.

**For Individual Learners:**
- Low-cost Premium access ($4.99/mo, $24.99/yr) matching their exact, short-term study window.
- Spelling-construction active recall widget that prepares them for actual TOEFL/IELTS writing tests.
- Offline-first reliability for 5-minute commute windows.
- Free cloud sync across multiple devices.
- Notion/Superhuman-style adult dark aesthetic.

**For Teacher Advocates:**
- High-value 14-day free trials to gift to students.
- In-app Premium credit rewards for active referrals, completely bypassing payment friction.

---

## 3. Channels

- **Primary B2B:** Direct cold email/outreach by the founder to cram school directors; self-serve B2B licensing web portal.
- **Teacher Advocate Loop:** Non-cash referral code system built into onboarding.
- **Organic B2C:** App Store Optimization (ASO) focused on "active recall" and "spelling"; Reddit (r/TOEFL, r/IELTS, r/ESL); YouTube Shorts.
- **Owned:** lexitap.app marketing website + B2B seat dashboard.

---

## 4. Customer Relationships

- **Self-Serve Individual:** Automated trial → paywall conversion via RevenueCat.
- **High-Touch B2B:** Guided onboarding for early cram schools; automated self-serve seat administration for mature phases.
- **Trust-led Stance:** Transparent, cancel-anytime subscriptions; zero ads; GDPR-compliant data safety.
- **Advocate Seeding:** Peer-to-peer goodwill via teacher referral codes.

---

## 5. Revenue Streams

**Unified Premium Subscription (Individual):**
- Monthly Premium Pass: **$4.99/month**
- Annual Premium Pass: **$24.99/year**
- *Trial Conversion SKU:* Common 3000 — **$1.99 one-time** (friction-free unlock to prove willingness to pay).

**B2B Bulk Licensing (Web Direct):**
- Classroom Pack (20 seats): **$199/year**
- Academy Pack (50 seats): **$399/year**
- Campus Pack (200 seats): **$1,199/year**

---

## 6. Cost Structure (~$194 Fixed Year-1 All-In)

| Item | Cost | Notes |
|------|------|-------|
| Apple Developer account | $99/yr | Required for App Store. |
| Google Play account | $25 one-time | Google Developer portal. |
| Domain (lexitap.app) | $20/yr | Vercel domain name. |
| Premium TTS audio (ElevenLabs) | ~$50 | TOEFL/IELTS audio enrichment (Phase 3). |
| Supabase Backend | $0 | Free tier up to 50K users. |
| Vercel B2B Portal Hosting | $0 | Free tier hosting. |
| **Year-1 All-In Total** | **~$194** | Minimal variable costs due to offline-first app architecture. |

*Note: By eliminating cash teacher commissions, we cut out transactional fees and the legal/compliance overhead of cross-border micro-payout accounting.*

---

## 7. Key Activities

- **Product Development:** React Native app build, spelling active recall widget programming, web-based B2B bulk license redemption portal.
- **Content Enrichment:** USA/UK audio integration and spelling list formatting.
- **B2B Outreach:** Founder-led direct sales and bulk trials onboarding.
- **Organic Content:** Creating active recall video Shorts, Reddit seeding, and ASO maintenance.

---

## 8. Key Resources

- **Active Recall Tech:** Custom spelling/construction tap UI.
- **Bulk Token System:** Database-driven bulk seat license allocation.
- **Content Assets:** Frequency-ranked ESL corpora with accent-split audio.
- **Founder Time:** Sole constraint; managed via strict scope gating.

---

## 9. Key Partners

- **Language Schools & Cram Directors** — Primary distributors.
- **Apple & Google** — Individual B2C billing rails (15% small business tier).
- **Supabase & RevenueCat** — Backend and subscription infrastructure.
- **TTS Provider (ElevenLabs)** — Paid tier audio resources.

---

## Key Metrics

- **Acquisition:** Direct cram-school pilot sign-ups; bulk seat token redemption rate; organic installs.
- **Activation/Retention:** Onboarding diagnostic completion rate; D1/D7/D30 active retention; spelling widget error rate.
- **Monetization:** Blended monthly churn (target <8%); individual conversion rate (target >1.5%); B2B bulk average contract value.
- **ASO Rank:** Position for "active recall" and "TOEFL spelling" search terms.
