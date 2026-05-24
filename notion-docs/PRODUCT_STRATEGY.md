# Product Strategy Overview

---
title: Product Strategy Overview
category: strategy
status: active
phase: 0
priority: P0
updated: 2026-05-23
load_order: 7
tags: [strategy, tiers, pricing, gtm, teacher-referral, revenue, competitive-frame, scope-outs, validation, wordup, knowji]
---

> Load order: 7 of 14. Load when making pricing, positioning, or scope decisions. Pairs with COMPETITIVE_ANALYSIS.md.

## Executive Summary

**Product:** Offline-first vocabulary acquisition app with freemium model

**Target:** Global ESL learners (non-native English speakers — test prep, professional English, idioms, phrasal verbs)

**Out of scope:** American-student vocabulary (SAT/ACT, K-12 grade-level) lives in a separate product / separate app.

**Model:** Free Foundation/Advanced vocab → Paid modules (test prep, business, idioms, phrasal verbs) one-time + Premium Pass annual

**Core Thesis:** ESL learners build daily vocab habits on free tier, then convert to paid when high-stakes testing (TOEFL/IELTS/GRE/GMAT) or professional need creates urgency.

---

## Product Tiers

**Tiers are sequenced into a launch wave (live at App Store launch) and a post-launch content-drop cadence.** Word counts are deliberately *not* pre-committed at this stage — content sourcing determines actuals; rigid pre-commitment creates fake constraints.

### Free Tiers (Launch)

**LexiTap Foundation** — FREE

- Top 3,000 most-used English words (frequency-based)
- Thematic grouping (Daily Life, Academic Study, Work & Career)
- All assessment types included
- Full spaced repetition algorithm
- ☁️ Cloud sync included (never lose your progress)

**LexiTap Advanced** — FREE

- Words 3,001–9,000 by real-world frequency
- Academic and professional contexts
- Bridge from everyday vocabulary to test prep
- ☁️ Cloud sync included (automatic backup)

### Paid Tiers — Launch Wave

**TOEFL Vocabulary** — $14.99 one-time

- Audio pronunciations (premium TTS)
- Context from official practice tests
- Critical for US university admission

**IELTS Vocabulary** — $14.99 one-time

- Coverage across all exam sections
- Global English test (UK / Australia / Canada / NZ)

**Business English** — $9.99 one-time

- Workplace vocabulary: email, meetings, presentations
- ESL professionals market

**Common 3000** — $2.99 one-time

- Most frequently used English words
- Entry-level paid tier — proves willingness to pay

**Premium Pass** — $29.99/year

- Unlocks ALL paid tiers (launch + post-launch)
- Future tier additions included automatically
- **Value anchor:** ~$88 if purchased individually — ~66% off via Pass. Price locked through launch; revisit only after 100+ paying users provide conversion data.

### Paid Tiers — Post-Launch Content Drops (Week 22+)

Ship in monthly cadence; order may shift based on conversion data.

**GRE Vocabulary** — $14.99 one-time

- High-WTP audience: ESL grad-school applicants
- Notoriously difficult vocab section

**GMAT Vocabulary** — $14.99 one-time

- Business-school applicants
- ESL focus on verbal/sentence-correction support

**Idioms & Expressions** — $9.99 one-time

- Classic ESL pain point
- Flat multi-word entries in existing schema (no architecture change)

**Phrasal Verbs** — $9.99 one-time

- Classic ESL pain point
- Flat multi-word entries in existing schema (no architecture change)

---

## Pricing Strategy

### Why One-Time Purchases?

- **Psychological alignment:** Students take test once → done
- **Impulse-buyable:** Parents approve $10 easier than monthly subscription
- **No exploitation:** Finite need shouldn’t require infinite payments
- **Trust signal (Part 7):** WordUp removed its "learn now" core feature post-launch; ELSA’s non-transparent auto-renewals drove mass uninstalls and negative reviews. In this environment, "pay once, own it" is a competitive moat — not just a pricing convenience.
- **Subscription Fatigue tailwind (Part 8 — SWOT):** Market research explicitly identifies consumer resistance to high-cost recurring subscriptions as a category-level threat to WordUp and ELSA. LexiTap’s one-time model is a structural response to a documented market shift, not just a founder preference.

**Exception:** Premium Pass is annual for multi-test takers

### Price Anchoring

- Common 3K at $2.99 → makes $14.99 test prep reasonable
- Premium Pass at $29.99 → covers 8 paid tiers (vs ~$88 individual) — a ~66% discount that anchors "best bang for the buck" positioning
- **Annual subscription benchmark across ESL/vocab competitors:**
    - Babbel ~$168/yr
    - Knowji ~$120/yr (closest direct competitor on feature surface)
    - Memrise ~$90/yr
    - ELSA Speak ~$89-99/yr (founder hands-on 2026-05-22: felt value closer to $5; documented auto-renewal backlash in market research)
    - Duolingo Super ~$84/yr (different audience — not a direct competitor)
    - **LexiTap Premium Pass $29.99/yr** = cheapest credible option in category by a wide margin
- ARPPU target: ~$15-18 individual purchase; Premium Pass converters skew the ARPPU lower but lift LTV
- **Pricing change discipline:** no price changes through launch. First repricing review = after 100+ paying users (Month 3 post-launch).

---

## Competitive Frame

*Who we compete with, who we don't, and what we deliberately don't try to be.*

**Table Stakes (2026) — Not Differentiators (Part 9):** SRS, basic gamification (badges, progress bars), dictionary lookups, and basic AI chatbots are baseline consumer expectations in 2026 — not marketing hooks. LexiTap’s marketing must lead with its actual differentiators: price + ownership + no-typing UX + offline-first reliability + idioms/phrasal verbs filling WordUp’s documented pedagogical blindspot.

### Direct Competitors (same audience, overlapping value prop)

**WordUp** — closest direct competitor on **audience overlap**. Targets intermediate-to-advanced non-native speakers + IELTS/TOEFL/GRE candidates + working professionals (caveat: WordUp also serves native-speaker lexicon expansion, which LexiTap explicitly does NOT per the audience-split decision). Their moat: (1) **Knowledge Map** — diagnostic onboarding with "I know / Test me / Learn" sorting that leverages the *endowed-progress effect* (show users how many words they already know to boost self-efficacy); (2) **deep multimedia contextualization** — video clips + historical quotes + expert analysis + AI-generated imagery surrounding each word. Content philosophy: frequency-based curation of 25,000 useful words from real-world media (movies, TV), aligning with LexiTap’s own frequency-based approach. Documented weaknesses (per research; first-person hands-on pending as item #44): calibration phase is grueling, SRS backlog feels punitive, AI Chat features (Lexi + Fantasy Chat) suffer from technological instability.

**WordUp gamification verdict (Part 6 §5):** Nine challenge types including Smart Eyes (image matching), Said What (video gap-fill), Confuse Me (definition matching), and Spell It (audio-to-text spelling). Gamification is perceived as a "pleasant, low-stress diversion" — fun but no psychological urgency; lacks the compulsive daily pull of Duolingo's streak mechanics. Two of the nine challenge types (Said What, Spell It) require typing — off the table for LexiTap per the no-typing rule. **The streak is not merely a feature — it is the product (Part 7):** Duolingo converts the abstract goal of "achieving fluency" into the daily goal of "keeping the integer alive." WordUp's daily review reminders are too passive to achieve this. For habit formation, the extrinsic motivator (streak, notification) must hold attention long enough for intrinsic motivation (the joy of language) to take root. **LexiTap's gamification target:** between Duolingo (aggressive, compulsive) and WordUp (pleasant, toothless) — purposeful daily urgency without guilt.

**WordUp personalization gap (Part 6 §6):** WordUp does deep dynamic personalization by age, proficiency, profession, and interests — generating custom corpora per user. LexiTap does not match this at MVP. LexiTap's domain-specific paid tiers (TOEFL, IELTS, Business English, GRE, GMAT) are its deliberate coarse-personalization substitute. This is a known gap, not an open decision — the tier structure is the answer.

**WordUp SRS weakness (Part 7):** SRS backlog without forgiveness is explicitly documented as a primary churn driver. User verbatim: *“doing everything right for months, yet forgetting words”* = massive frustration. LexiTap's SRS Forgiveness Mechanics (daily cap + soft catch-up + no guilt) are a direct competitive answer to this failure mode.

**WordUp paywall hostility (Part 7):** WordUp removed its "learn now" core feature post-launch — a documented trust-destruction event generating negative reviews and uninstalls. Combined with ELSA's non-transparent auto-renewal backlash, this validates LexiTap's one-time purchase model as a trust-building differentiator, not just a pricing convenience.

**WordUp Pedagogical Blindspot (Part 8 — SWOT):** WordUp focuses almost exclusively on single words and explicitly ignores multi-word collocations, idioms, and phrasal verbs — its own SWOT identifies this as a documented weakness. LexiTap’s Idioms & Expressions ($9.99) and Phrasal Verbs ($9.99) tiers directly fill it. First-mover position on a gap the market leader has named and not addressed.

**WordUp cross-platform sync failures (Part 8 — SWOT):** Egregious device sync issues are a documented user complaint. LexiTap’s cloud sync included free in both Foundation and Advanced tiers is a direct reliability differentiator.

**Knowji** — closest direct competitor on paper (Backlog #42 research complete; first-person hands-on evaluation still pending). Subscription pricing ~$4.99–10/mo (~$60–120/yr) vs. LexiTap Premium Pass at $29.99/yr.

**What Knowji is:** Audio-visual memorization tool pairing custom cartoon illustrations and story-like example sentences with a built-in SRS “memory coach.” Targets K-12, ESL/ELL learners, and test-prep students (SAT, GRE, ASVAB, TOEFL). Their moat: custom illustration per word (cartoon + narrative anchor) operationalizing dual-coding theory. Users explicitly report learning words *“faster than I thought I would learn, and faster than just using flash cards.”* The visual + SRS loop is genuinely efficient.

**Knowji documented weaknesses (Part 10):**

- **Juvenile aesthetic:** “Cheesy and exaggerated” cartoon illustrations explicitly alienate adult professionals and serious corporate learners. This is LexiTap’s primary positioning opening: adult-professional, minimalist aesthetic is a direct contrast (see Brand Identity — UI Aesthetic Direction).
- **Device-bound SRS:** Knowji’s algorithm is tied to a single device profile. The company actively warns against multiple users sharing a device — it “irreversibl￿y disrupts the customized drill schedule.” LexiTap’s account-based cloud sync solves this completely by design.
- **Post-test churn:** Utility drops sharply after a user passes their target test. LexiTap’s multi-tier model mitigates this — a user who finishes TOEFL prep has Business English, Idioms, and Phrasal Verbs as natural next tiers.
- **Manual pronunciation recording:** No AI grading — user manually compares their recording to the native model. LexiTap has explicitly scoped pronunciation out; this gap exists but is not LexiTap’s lane.

**Knowji’s own AI threat (their SWOT):** Generative AI can create bespoke mnemonic images tailored to individual user interests — making Knowji’s static pre-drawn cartoons potentially obsolete. LexiTap does not ship per-word AI imagery at MVP (content pipeline uses curated imagery), but this is a Year 2 differentiator via Backlog #34.

**LexiTap advantages over Knowji:** Price (~2–4× cheaper); adult-professional aesthetic vs. juvenile cartoon; account-based cloud sync vs. device-bound SRS; explicit adult ESL focus vs. wide K-12 + ESL spread that dilutes positioning for both audiences.

**Anki (iOS)** — closest precedent for *one-time pricing for serious learners*. Their paid iOS app is their primary revenue source. Validates LexiTap's one-time tier model for committed audiences.

**Memrise** — partial overlap on contextual learning + intermediate audience. Video-based native-speaker content is their moat; not LexiTap's.

**ELSA Speak** — partial overlap on ESL audience only. Their lane is pronunciation training; LexiTap explicitly does not enter that lane (see Audio Scope-Out below).

### Not Direct Competitors (different audience or different product)

**Duolingo** — casual learners + K-12 + general language acquisition. >$1B revenue and 71% of language-app IAP share, but a different product serving a different audience. **LexiTap should not benchmark positioning, pricing, or feature scope against Duolingo.** Duolingo is a retention-engineering reference (streaks work), not a competitive frame.

**Quizlet** — student/educator general flashcards. K-12 + American test prep. Different audience per the 2026-05-22 audience-split decision.

[**Vocabulary.com**](http://Vocabulary.com) — K-12 + native speakers expanding vocabulary. American-student audience. Their "Vocab Jams" gamification model is a reference for *time-bounded competitive events* but the product itself is in the separate American-student app's category, not LexiTap's.

**Magoosh Vocabulary** — free app as lead generator for $149+ premium prep courses. Different business model entirely (vocab is not their product, courses are). Worth filing the lead-gen pattern as a Year 2 monetization concept (Planning Backlog #28).

### Audio Scope-Out (Explicit Decision)

**LexiTap audio = pronunciation reference paired with the word.** Hear the word said correctly; pair with imagery for memorization. Audio is part of premium tiers where pronunciation is a buyer concern (launch: TOEFL; post-launch: re-evaluate per tier ROI).

**LexiTap audio ≠ pronunciation training.** No voice-recognition AI. No accent correction. No real-time speech analysis. No "speak the word and we'll grade your pronunciation." That's ELSA Speak's lane and LexiTap explicitly does not enter it.

**Why:** Pronunciation training is a separate product category with separate audience expectations, separate technical infrastructure (voice recognition is expensive at scale), and a dominant incumbent. Entering it would dilute LexiTap's vocab-mastery positioning and stretch the scope without a clear win.

**Cross-reference:** Session State Decision Log entry 2026-05-22 (Audio Scope-Out).

### Multimedia Contextualization Scope-Out (Explicit Decision)

**LexiTap contextualization = audio (where applicable) + imagery + curated example sentences.** Each word ships with the context needed to understand its meaning, usage, and emotional register — within a contained content production budget.

**LexiTap contextualization ≠ multimedia depth at WordUp's scale.** No video clips per word. No historical-quote library. No expert analysis. No per-word AI-generated imagery. That's WordUp's moat and LexiTap explicitly does not try to match it at MVP.

**Why:** WordUp's multimedia layer is an enormous content production undertaking (tens of video clips per word × 25,000 words). Replicating it would (a) blow the launch budget several times over, (b) push launch out by quarters, (c) compete on a vector where WordUp has years of head start. LexiTap competes on *price + ownership + no-typing UX + offline-first*, not multimedia depth.

**Why the lighter approach still works pedagogically:** WordUp's multimedia is effective because it operationalizes **dual-coding theory** — pairing verbal/linguistic information with visual and auditory stimuli to create stronger neural recall pathways. LexiTap's audio + imagery + curated example sentences is a lighter-weight implementation of the same mechanism. It doesn't match WordUp's immersive depth, but it captures the core dual-coding benefit without the video infrastructure cost or the load-time and subtitle-spoiler failure modes documented in WordUp's own UX (confirmed in Competitive Analysis Part 6 §4).

**Known positioning gap:** WordUp's multimedia is the app's primary "wow factor" — it makes learning feel deeply immersive and authentic. LexiTap's approach is more reliable and significantly cheaper to produce, but it will feel less visually spectacular at first launch. Positioning must compensate by leaning into reliability, price, and ownership rather than trying to compete on immersiveness.

**Revisit when:** post-launch revenue covers content production budget for video, OR a clear conversion lift is demonstrated from richer contextualization in beta data. Year 2 territory at earliest.

**Cross-reference:** Session State Decision Log entry 2026-05-22 (Multimedia Contextualization Scope-Out).

### Pedagogical Scope (Acknowledged Limitation)

**What LexiTap exercises:** passive recognition + recall — tap, drag, match, classify. The tap-based widget suite (MultipleChoice, DragDrop, ImageMatch, Classification) tests whether the user can recognize, match, or arrange the right answer when presented with options.

**What LexiTap does NOT exercise:** active production — generating the word from scratch in writing or speech. This is a deliberate trade-off of the no-typing UX commitment: production testing requires typing or speaking, both of which conflict with the core differentiator.

**Implication:** users may master "recognize the word" without fully reaching "produce the word in their own speech/writing." For the test-prep audience (TOEFL/IELTS/GRE/GMAT vocab sections), recognition is what's tested — the gap is acceptable. For users seeking conversational fluency, recognition without production is a real ceiling.

**Honest framing in marketing:** position LexiTap as a *vocabulary mastery* tool, not a *fluency* tool. Pair with separate active-production tools (conversation practice, writing apps) for the production half. Do not over-promise fluency outcomes.

---

## Market Validation Phases

### Phase 0: Pre-Build Research (Week 1)

**Goal:** Validate assumptions before coding

**Tasks:**

- [ ]  Interview 10 parents of middle schoolers
- [ ]  Interview 5 high school juniors
- [ ]  Survey 20 TOEFL test-takers
- [ ]  Competitive analysis (top 5 vocab apps)

**Success Criteria:**

- 7/10 parents say "yes" to free download
- 3/5 juniors say "maybe/yes" to $10 SAT vocab
- 10/20 TOEFL takers express frustration with current tools

**If failure:** Re-examine product thesis

### Phase 1: Free Tier MVP (Weeks 2-9)

**Build:** Foundation tier only (2 assessment types)

**Distribution:**

- 50 beta testers via teachers, Reddit, homeschool groups

**Metrics:**

- D1 retention >50%
- D7 retention >30%
- D30 retention >15%
- Avg session length >3min

**Success:** D7 >30% + qualitative "would recommend"

**Failure (<20% D7):** Fix core loop before proceeding

### Phase 2: Paid Tier Validation (Week 10-11)

**Don't build yet - validate WTP first**

- Email 20 most engaged users
- Show mockups of TOEFL module
- Ask: "Would you pay $14.99?"

**Success:** 5/20 say "yes"

**Pivot trigger:** <3 say yes → explore B2B or partnership

### Phase 3: First Paid Module (Weeks 12-15)

**Build:** TOEFL only

**Goal:** 10 paying users in first month

**Conversion target:** 5% of active free users

---

## Go-to-Market Strategy

### Primary: Teacher Referral Network (ESL Focus)

**Model:**

- Freelance English teachers promote app
- Students get 20% discount with teacher code
- Teachers earn tiered commission on purchases

**Commission Tiers:**

- Tier 1 (1-10 referrals): 20% commission
- Tier 2 (11-50 referrals): 25% commission
- Tier 3 (51-200 referrals): 30% commission
- Tier 4 (201+ referrals): 35% commission

**Why this works:**

- Aligned incentives (teacher wants students to succeed)
- Viral loop (50 students per teacher = network effect)
- Low CAC (teacher does marketing for us)

### Secondary: Direct (App Store)

- SEO content: "Best TOEFL vocabulary," "How to study for IELTS"
- Reddit/forum presence (r/TOEFL, r/ESL)
- TikTok/YouTube Shorts ("word of the day" content)

---

## Revenue Model

### Conservative (Year 3)

- Free users: 150,000
- Conversion: 5%
- Paying users: 7,500
- ARPPU: $12
- **Revenue: $90,000/year**

### Optimistic - TOEFL Focus (Year 3)

- Free users: 60,000
- Conversion: 15% (desperate, motivated audience)
- Paying users: 9,000
- ARPPU: $15
- **Revenue: $135,000/year**

### Teacher Commission Impact

- Gross revenue: $135,000
- Teacher payouts (avg 25%): -$33,750
- **Net revenue: $101,250**

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| Low retention on free tier | High | Fatal | Phase 1 validation; kill if D7 <20% |
| No one pays for test prep | Medium | Fatal | Phase 2 validation; pivot to B2B |
| Can't acquire users at scale | High | High | Start content marketing in Phase 1 |
| Competitor launches similar | Medium | Medium | Speed to market; offline-first differentiation |
| Word list copyright issues | Low | High | Use public domain; legal review before TOEFL |

---

## Decision Points

### Immediate Decisions Needed:

1. **GTM path:** Teacher network (primary) + App Store (secondary)
2. **Phase 1 scope:** Minimal MVP (Foundation only, 2 assessments)
3. **Priority tier order:** Launch wave = TOEFL first (highest WTP, teacher network fits), then IELTS, Business English, Common 3K, Premium Pass. Post-launch content drops = GRE, GMAT, Idioms, Phrasal Verbs (order driven by conversion data).
4. **Content sourcing:** ✅ Resolved 2026-05-23 — Frequency-based. Founder has existing corpora: top 3,000 most-used words (Foundation), top 9,000 most-used words (Advanced), 3,000 TOEFL words (TOEFL tier). Content pipeline work = enrichment only (definitions, audio, imagery, example sentences). Tracked as P0 backlog item #41.
5. **Audio strategy:** Premium TTS (ElevenLabs or comparable) for paid tiers with pronunciation value (TOEFL has highest priority; IELTS/GRE follow).

### Success Metrics by Phase

- **Phase 0:** Validation interviews complete
- **Phase 1:** D7 retention >30%
- **Phase 2:** 5/20 users willing to pay
- **Phase 3:** 10 paying users
- **Phase 4:** $10K/month revenue
- **Phase 5:** App Store launch

---

## Next Steps

1. **This week:** Phase 0 validation research
2. **Week 2-3:** Build content pipeline tool
3. **Week 4-7:** Build mobile app MVP
4. **Week 8-9:** Beta testing (50 users)
5. **Week 10:** Validate paid tier
6. **Week 11+:** Build & launch TOEFL module