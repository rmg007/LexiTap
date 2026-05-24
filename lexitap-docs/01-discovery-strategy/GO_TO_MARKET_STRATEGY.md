---
title: Go-to-Market Strategy
category: strategy
status: active
updated: 2026-05-24
priority: P0
tags: [gtm, cram-schools, B2B-sales, bulk-licenses, non-cash-referrals, launch-sequence, channels, aso]
---

# Go-to-Market Strategy

> Comprehensive GTM playbook. A condensed summary lives in [../02-product-definition/PRODUCT_REQUIREMENTS_DOCUMENT.md](../02-product-definition/PRODUCT_REQUIREMENTS_DOCUMENT.md) (Go-to-Market section). Personas in [TARGET_USER_PERSONAS.md](./TARGET_USER_PERSONAS.md); economics in [BUSINESS_MODEL_CANVAS.md](./BUSINESS_MODEL_CANVAS.md).

## Strategy in One Line

A solo founder with a ~$194 budget scales user acquisition via bulk B2B cram-school licensing trials, backed by a non-cash, compliant teacher-advocate referral loop and organic ASO/Reddit channels.

---

## Primary Channel — B2B Cram-School Licensing

ESL academies, cram schools, and private prep agencies (predominantly in the Asia-Pacific region) have large, aggregated groups of high-stakes test prep students. 

These schools already charge substantial fees for exam-prep courses and constantly search for high-efficacy supplementary tools to boost student outcomes. 

Pivoting from high-friction consumer ad spending to B2B sales allows LexiTap to secure bulk seat contracts that reduce consumer-store friction where institutional web-purchased access is permitted by store rules. This is a compliance-sensitive strategy, not a blanket exemption.

### Mechanics

- **Cram School Seat Packs:** Schools buy seats in fixed bulk sizes directly via the web-based B2B portal:
  - **Classroom Pack:** 20 seats — $199/year (~$9.95/seat)
  - **Academy Pack:** 50 seats — $399/year (~$7.98/seat)
  - **Campus Pack:** 200 seats — $1,199/year (~$5.99/seat)
- **Student Activation:** On purchase, the school administrator receives a unique B2B invitation link and seat tokens. Students redeem these tokens in-app during onboarding to unlock the Premium tier immediately.
- **Admin Dashboard:** The portal (hosted on the web) allows the school director or class teacher to monitor student progress, review times, average mastery level, and streak status, proving the pedagogical ROI of the app.

### Why it works for this budget

Bulk B2B sales are driven by direct founder outreach (email, LinkedIn, Zoom demos) to school directors. This channel requires zero upfront ad spend, generating immediate cash flow to fund operational costs, and onboard hundreds of highly active students in single transactions.

---

## Secondary Channel — Non-Cash Teacher Advocate Loop

We avoid the compliance and accounting overhead of cash payouts (via PayPal/Wise) to individual freelance teachers.

Instead, individual teachers are positioned as "Advocates," and we incentivize them using high-value, digital-only referral hooks.

### Mechanics

- **Referral Codes:** Each teacher advocate gets a unique referral code (e.g. `TEACHER_MARIA`).
- **Student Benefit:** Students who enter `TEACHER_MARIA` at onboarding receive a 14-day free trial of the Premium Subscription (normally 3 days) to build habit loops before gating.
- **Teacher Incentive:** For every 3 students who remain active past their trial period, the teacher advocate receives a free Premium year pass or credit that they can gift to a colleague, use themselves, or pass to a low-income student.
- **Compliance Alignment:** Because zero cash changes hands off-store between LexiTap and teacher advocates, the model reduces tax, KYC/AML, and micro-payment complexity. Non-cash rewards still require legal/tax review before launch.

---

## Organic Channels & ASO

- **App Store Optimization (ASO):** Focus heavily on high-efficacy keyword search terms:
  - Keywords: *TOEFL vocabulary, IELTS vocabulary, offline English vocabulary, business English vocabulary, vocabulary builder, spaced repetition, no-typing review.*
  - App Name: "LexiTap: TOEFL & IELTS Vocab"
  - Subtitle: "Offline vocabulary review. No typing."
- **Reddit / communities:** Establish authentic presence in r/TOEFL, r/IELTS, r/ESL, and r/languagelearning. Share study tactics for high-frequency vocabulary retention, commute-window review, and no-typing practice.
- **YouTube Shorts & TikTok:** Create rapid "pick the meaning" and "match the phrase" video quizzes matching the recognition UI. Audience-matched to the 18–24 demographic, emphasizing fast offline study sessions.

---

## The 21-Week Path to 1,000 Active Users

Aligned to the canonical phases in [../02-product-definition/ROADMAP.md](../02-product-definition/ROADMAP.md) and the gating metrics in [VISION_PROBLEM_STATEMENT.md](./VISION_PROBLEM_STATEMENT.md):

| Weeks | Phase | GTM action | Outcome / Gate |
|-------|-------|-----------|----------------|
| 1 | Phase 0 — Validation | Initial cram school cold outreach; pitch bulk beta trials | 3 cram schools commit to free bulk pilots |
| 2–6 | Phase 1 — Build MVP | Build web portal stubs; seed recognition-practice video Shorts | Core MVP running; recognition widgets verified |
| 7–10 | Phase 2 — Validation | Deploy 50-user consumer beta; launch bulk pilots with the 3 cram schools | D7 retention >30%; qualitative school validation |
| 11–12 | Phase 3 — Subscription / Paid Beta | Launch individual subscriptions + bulk portal stubs; convert beta schools | 10 subscribers + 2 paid cram-school contracts |
| 12–16 | Phase 4 — Launch Wave Tiers | IELTS / Business tiers live; launch B2B self-serve web portal | $1,000/month recurring revenue |
| 17–18 | Phase 5 — Launch prep | Complete App Store metadata (recognition screenshots); EULA, domain setup | Live on both stores |
| 19–21 | Phase 6 — Growth | Scale cram school sales; deploy advocate credits; ASO | 1,000 total active users |
| 22+ | Post-launch drops | Launch GRE/GMAT content updates to active Premium base | Lock in annual subscription renewals |

---

## Open Questions

- **B2B Contract Signing Rails:** Do we need structured enterprise contracts for larger schools, or will self-serve terms of service suffice? Revisit at 10+ cram school sign-ups.
- **Localization of B2B landing pages:** Should the B2B licensing portal landing page be localized into Korean, Japanese, and Mandarin immediately, or is English sufficient? English for Phase 3; localize in Year 2.
