# Competitive Analysis - Vocab App Market 2026

---
title: Competitive Analysis - Vocab App Market 2026
category: strategy
status: draft
phase: 0
priority: P0
updated: 2026-05-23
load_order: 10
tags: [competitive, wordup, knowji, duolingo, elsa, memrise, anki, market-sizing, positioning, srs, gamification, onboarding, irt, swot]
---

> Load order: 10 of 14. In progress — Parts 1-11 captured. Load alongside PRODUCT_STRATEGY.md when making positioning or feature decisions. Capture-only mode — do not synthesize until founder says "extract."

## Table of Contents

- [Part 1 - Market Overview and Context](#part-1--market-overview--context)
- [Part 2 - Current Trends and AI Commoditization](#part-2--current-trends-and-the-commoditization-of-ai)
- [Part 3 - User Expectations and Market Gaps](#part-3--user-expectations--underserved-market-gaps)
- [Part 4 - Competitor Profiles and Monetization](#part-4--competitor-profiles--industry-monetization-patterns)
- [Field Notes - Hands-On Evaluations](#field-notes--hands-on-evaluations)
- [Part 5 - Deconstructing WordUp](#part-5--product-positioning-deconstructing-wordup)
- [Part 6 - WordUp Feature Evaluation](#part-6--core-feature-evaluation-the-wordup-product-ecosystem)
- [Part 7 - UX, Psychology, and Retention](#part-7--ux-behavioral-psychology-and-retention-mechanics)
- [Extracted To - Findings Index](#extracted-to--index-of-findings-distributed-to-strategy-docs)
- [Capture Log](#capture-log)
- [Part 8 - WordUp SWOT](#part-8--wordup-swot-analysis)
- [Part 9 - Product Opportunities](#part-9--product-opportunities-architecting-the-next-generation-application)
- [Part 10 - Knowji Teardown](#part-10--knowji-competitive-teardown)
- [Part 11 - Onboarding Diagnostic Design](#part-11--onboarding-diagnostic-design-best-practices-for-vocabulary-apps)

---

**Purpose:** Competitive landscape analysis for the vocabulary learning app market in 2026, with primary focus on WordUp and identification of next-gen product opportunities for LexiTap.

**Source:** External research material shared incrementally in chat. Captured here as Parts 1, 2, 3 … as new sections arrive.

**How to use:** Read alongside Product Strategy Overview when making positioning, pricing, or feature differentiation decisions. The "Implications for LexiTap" synthesis section is to be drafted only after all competitive material is in — do not start re-positioning the product based on partial captures.

**Status:** In progress — Parts 1–6 of N captured 2026-05-22. **First extraction pass completed 2026-05-22** (Session State v1.5).

---

## Part 1 — Market Overview & Context

*Captured 2026-05-22.*

### Strategic Framing

The digital language learning market is undergoing a profound and rapid transformation, driven by the maturation of artificial intelligence, advances in cognitive science, and a deeper, data-driven understanding of behavioral psychology. For product development aiming to capture the next generation of vocabulary learners, a surface-level feature comparison is entirely insufficient. Success in this highly saturated arena requires a nuanced understanding of product positioning, user friction, motivation loops, and pedagogical efficacy. The modern learner expects an experience that seamlessly blends the rigorous science of memory retention with the frictionless, engaging interface of a premium consumer application.

This research provides an exhaustive analysis of the vocabulary learning application market as of 2026, with granular focus on WordUp as a primary competitor — deconstructing its feature set, user experience paradigms, and market positioning. By synthesizing current market trends, analyzing competitor monetization strategies, and deeply evaluating user behavioral patterns, the document is intended to deliver concrete, strategic recommendations for engineering a next-generation vocabulary application that transcends current market limitations.

### Market Sizing (2026)

The language learning application sector has successfully evolved from a niche, supplementary educational tool into a primary, daily-use medium for global language acquisition. The financial metrics underscore this monumental shift.

| **Metric** | **Value** |
| --- | --- |
| Global language learning apps market (2024) | $6.34B |
| Projected market size (2033) | $24.39B |
| CAGR (2024–2033) | 16.15% |
| Digital English learning segment (2026) | $15.98B |
| Digital English learning segment (2031) | $31.62B |
| CAGR for English segment (2026–2031) | 14.62% |

### Geographic Concentration

The Asia-Pacific region represents both the largest and fastest-growing demographic for these technologies, driven by increasing globalization and career opportunities that demand English proficiency.

---

## Part 2 — Current Trends and the Commoditization of AI

*Captured 2026-05-22.*

By 2026, artificial intelligence is no longer a unique differentiator in the educational technology space; it has become a baseline consumer expectation. AI-powered technologies already command **33.5% of the revenue share across all digital language learning products**.

Competitors across the spectrum have integrated generative AI to facilitate conversational practice, provide adaptive feedback, and simulate real-world interactions:

- **Duolingo** — via its Duolingo Max tier
- **ELSA Speak**
- **Enverson AI**
- **TalkPal**

### From "Has AI" to "Implements AI Well"

The market has shifted fundamentally from competing on the mere *presence* of artificial intelligence to competing on the seamless, pedagogically sound *implementation* of that intelligence. The applications currently capturing market share do not simply bolt a generic chatbot onto an existing legacy architecture. Instead, they use AI to:

- Dynamically adjust spaced repetition intervals
- Generate highly personalized contextual examples based on the user's explicit interests
- Drastically reduce the friction of content discovery

Gamification and AI-driven personalization are specifically cited as the **primary engines pushing the continued boom in this sector**.

---

## Part 3 — User Expectations & Underserved Market Gaps

*Captured 2026-05-22.*

### User Expectations and Behavioral Shifts in 2026

Modern consumers bring elevated expectations to educational applications, conditioned by their experiences with elite social media and productivity platforms.

- **Individual learners** account for **36.10%** of the market share.
- **Young adults aged 18–24** demonstrate the highest engagement rates of any demographic at **48%**.

This cohort is highly sensitive to mobile optimization, demanding:

- Aesthetic interfaces
- Comprehensive dark mode support
- Accessibility features
- Robust offline capabilities (learning in transient environments like subway commutes)

Modern learners also expect applications to respect their cognitive bandwidth and time constraints. **Consumer tolerance for the rote memorization of irrelevant vocabulary lists has plummeted.** Users now demand high-impact, context-rich learning environments where every minute spent in the application directly translates to real-world utility and communicative competence.

The rise of **self-paced formats** — which led the market with a **31.74% revenue share in 2025** — underscores the desire for autonomous, highly personalized learning trajectories.

### Underserved Audiences and Gaps in the Market

Despite heavy saturation at the beginner level, several crucial market gaps remain entirely underserved, presenting lucrative opportunities for new entrants.

**1. The Intermediate Plateau (B1/B2 → C1/C2)**

The vast majority of applications, including industry leader Duolingo, cater exceptionally well to beginners but fail to effectively transition users to advanced, nuanced fluency. Learners operating at the B1 or B2 proficiency levels frequently struggle to find digital tools that can push them into C1 or C2 without resorting to dry, academic, text-only flashcards.

**2. Industry-Specific Professional Jargon**

Professionals requiring industry-specific or domain-specific jargon are drastically underserved. While some platforms offer generic "business English" modules, **highly granular, dynamically generated professional corpuses** for fields such as engineering, medicine, law, or specific academic disciplines represent a massive untapped commercial market. A lack of understanding of this specific jargon can lead to severe miscommunication in professional projects, yet general English courses routinely ignore the requirement.

**3. Lexical Chunking and Collocations**

The vast majority of vocabulary applications focus their architecture on isolated, single-word acquisition. However, extensive pedagogical research, particularly frameworks based on the **Lexical Approach**, demonstrates definitively that language is acquired in **multi-word combinations, collocations, and idiomatic chunks**. An application that systematically teaches users *how words combine naturally* rather than just *what isolated vocabulary words mean* addresses a significant educational blind spot that current market leaders have yet to solve.

---

## Part 4 — Competitor Profiles & Industry Monetization Patterns

*Captured 2026-05-22.*

### Industry Monetization Pattern

Understanding the broader competitive environment is essential for positioning a new product effectively. Competitors differentiate themselves through distinct pedagogical philosophies and monetization models, each targeting specific learner segments.

**Across the industry, the freemium model dominates.** Most platforms provide substantial core functionality at no cost, while monetizing through paid tiers that offer:

- Convenience features
- Ad removal
- Offline access
- Advanced AI interactions
- Adaptive learning systems
- Specialized content

### Competitor Profiles

**Duolingo**

- *Positioning:* Linear curriculum + heavy gamification
- *Strength:* Retention via streaks, leaderboards, social accountability
- *Audience:* Casual learners, beginners, K-12
- *Monetization:* Ad-supported freemium; Super tier ~$6.99/mo (removes ads); Max tier (AI roleplay)
- *Scale:* >$1B annual revenue by 2025; **~71% of monthly in-app purchase revenue across language apps**

**Memrise**

- *Positioning:* Video-based contextual learning with native speakers in real-world settings
- *Strength:* Authentic pronunciation and cultural nuance
- *Audience:* Visual learners, intermediate conversational users
- *Monetization:* Freemium; annual subscriptions ~$90; occasional lifetime access offers

**Quizlet**

- *Positioning:* User-generated flashcards + vast shared content library
- *Strength:* Versatile for institutional + test prep use
- *Audience:* Students, teachers, standardized test takers
- *Monetization:* Advanced adaptive modes require paid subscription

**Anki**

- *Positioning:* Utilitarian open-source spaced repetition
- *Strength:* Algorithmic rigor, long-term retention
- *Audience:* Serious learners (medical students, polyglots)
- *Monetization:* Desktop + Android free; **paid iOS app is the primary revenue source**

**ELSA Speak**

- *Positioning:* Pronunciation training via voice-recognition AI
- *Strength:* Granular accent correction, real-time speech analysis
- *Audience:* Non-native professionals, ESL learners
- *Monetization:* ~$13.33/mo, $89-99/yr, lifetime + institutional plans available
- *Note:* User dissatisfaction with auto-renewal practices (perceived as deceptive)

**Magoosh Vocabulary**

- *Positioning:* High-stakes test prep (GRE, SAT, TOEFL) with expert-curated lists
- *Strength:* Expert curation in the test prep niche
- *Audience:* Standardized test takers
- *Monetization:* Free companion app **as lead generator for premium prep courses ($149+)**

**Knowji**

- *Positioning:* AI-driven visual + audio memorization with prebuilt thematic lists; built-in memory coach using imagery to reinforce recall
- *Audience:* Visual learners, standardized test takers
- *Monetization:* Freemium; paid plans starting ~$10/mo

[**Vocabulary.com**](http://Vocabulary.com)

- *Positioning:* Dictionary-based adaptive learning + gamified competitions ("Vocab Jams")
- *Strength:* Deep definitional rigor + competitive elements
- *Audience:* K-12 schools, educators, native speakers expanding vocabulary
- *Monetization:* Learner subscriptions $4.99-$12.99/mo + school/district licensing

### Financial Picture

- **Duolingo's strategy is dominant:** >$1B annual revenue (2025), ~71% of monthly IAP revenue across language apps
- **ELSA Speak relies on higher ARPU** via aggressive annual billing + lifetime memberships — strong cash flow but user-dissatisfaction risk
- **Lifetime subscriptions are increasingly common across the sector** — addresses both immediate cash flow needs and subscription fatigue

---

## Field Notes — Hands-On Evaluations

*Running log of personal hands-on evaluations of competitor products. First-person reactions, gut-feel value calibration, specific feature observations. Not exhaustive teardowns — those become standalone tasks (e.g., Planning Backlog item #42 for Knowji).*

### ELSA Speak — Purchased & Evaluated 2026-05-22

**Purchase context:** Founder bought the full version to verify the feature set described in Part 4 research and form a first-person opinion on actual delivered value vs. price point.

**Verdict (user's words):** *"Honest to god, it is now worth $5."*

In other words: the actual delivered experience does not justify the $89-99/yr or ~$13.33/mo price point in the user's first-person assessment. Estimated true value (per this evaluation) is closer to $5 — a >90% gap between asking price and felt value.

**Implications for LexiTap (data, not decisions — synthesized later):**

- Reinforces the documented auto-renewal-backlash signal in Part 4: premium pricing on ESL-targeted competitors is not necessarily backed by premium-value delivery.
- Concrete data point for the anti-subscription positioning pillar: even the category-recognized leader in ESL pronunciation training has perceived value gaps at its current price.
- If pronunciation features ever come into scope for LexiTap (currently scoped OUT — audio = reference, not training), a structured ELSA teardown becomes a precursor task.

---

## Part 5 — Product Positioning: Deconstructing WordUp

*Captured 2026-05-22.*

WordUp has positioned itself distinctly away from the linear, highly gamified progression of Duolingo and the sheer, brutal utilitarianism of Anki.

### Origin & Context

WordUp was founded by **Geeks Ltd**, a London-based software business established in **2007** by **Jordan Clive**, which grew to over **500 employees** and won the **Queen's Award for Innovation**. Initially an experimental internal project at Geeks Ltd, WordUp was spun out into an independent company driven by philanthropic and impact-focused ambitions to remove global language barriers.

### Target Audience

WordUp targets a highly sophisticated, specific demographic. While it claims to serve all proficiency levels, its core features are engineered for:

- **Intermediate to advanced non-native speakers**
- **Standardized exam candidates** preparing for IELTS, TOEFL, GRE
- **Working professionals** needing domain-specific jargon
- **Native English speakers** seeking to expand their high-level lexicons

It is fundamentally **not** designed to teach a tourist how to ask for directions. It is designed to teach an ambitious professional how to deploy words like *"pragmatic"* or *"ubiquitous"* confidently in a corporate boardroom presentation or an academic thesis.

### Core Problem Solved

The core problem WordUp addresses is the **massive inefficiency inherent in traditional vocabulary acquisition**:

- The English language contains **over 200,000 words**
- Typical fluency requires only a fraction of that volume
- Traditional learners waste hundreds of hours studying words they already know, **OR** words they will never actually use in real life

**WordUp's solution:** a sophisticated **frequency-based algorithm** curating the **25,000 most useful words** extracted from real-world media (including thousands of movies and television shows), prioritized entirely based on the user's specific life goals, field of study, or chosen profession.

### Strategic Differentiation

WordUp differentiates itself through **two primary vectors**:

**1. Proprietary "Knowledge Map"**

- Personalized vocabulary prioritization
- Filters the 25,000-word corpus based on user goals, field, profession

**2. Deep multimedia contextualization**

- Surrounds a single vocabulary word with:
    - Tens of real-world video clips
    - Famous historical quotes
    - Expert analysis
    - AI-generated imagery
- Contrast: traditional test-prep applications (e.g., Magoosh) rely on dry text definitions + single-sentence text examples

**The cognitive bridge it builds:** between **passive recognition** (knowing what a word means when seeing it on an Anki flashcard) and **active application** (understanding the emotional weight, tone, and situational appropriateness of a word).

---

## Part 6 — Core Feature Evaluation: The WordUp Product Ecosystem

*Captured 2026-05-22.*

To architect a superior product, a product manager must meticulously deconstruct the current market leader's core feature set, analyzing the cognitive mechanics, behavioral psychology, and pedagogical efficacy of each, alongside their inherent technological friction points.

### 1. The Knowledge Map

**What it is:** WordUp's primary diagnostic onboarding tool and persistent visual progression system. Users are presented with vocabulary ranges and sort words into **"I know," "Test me," and "Learn"** categories. The application then generates a personalized, color-coded visual map of the user's lexical gaps, charting a highly efficient path through its 25,000 ranked words.

**Why it works (psychology):**

- Leverages the **"endowed progress effect"** — instantly showing users they already know thousands of words massively boosts self-efficacy and motivation to continue
- Practically eliminates redundant learning, optimizing study time for maximum ROI

**Friction points:**

- **Calibration phase is grueling.** Manual sorting at scale is exhausting
- Users report high frustration finding their optimal "sweet spot" when the algorithm fails to quickly adapt to their actual proficiency level
- **Emotional read:** provides deep clarity and structure out of the chaos of language learning, but the manual labor to maintain it can feel like a chore if the UI is not entirely frictionless

### 2. Spaced Repetition System (SRS)

**What it is:** Algorithmic scheduling that presents words at increasing temporal intervals based on the user's recall accuracy, ensuring long-term memory retention.

**Science backing:** Targets the **Ebbinghaus forgetting curve**. Forces active recall at the exact moment a word is about to decay from memory, permanently cementing it into long-term neural pathways. Decades of cognitive-science validation.

**Critical weaknesses:**

- **Review backlog → oppressive feel.** If users accumulate a massive backlog of "due" reviews after missing a few days of practice, the algorithm becomes punishing
- **Review fatigue** transforms the app from a tool of empowerment into a source of psychological guilt — **a primary driver of app abandonment**
- **WordUp's specific SRS implementation is strictly focused on single, isolated words** — fundamentally ignores the pedagogical necessity of practicing collocations and complex sentence structures

**Emotional read:** Users practically view the SRS as the absolute engine of their learning, but emotionally it can feel highly punitive.

### 3. AI Chat and Contextual Learning (Lexi & Fantasy Chat)

**What it is:**

- **Lexi** — AI teaching assistant for real-time feedback on writing and spelling
- **Fantasy Chat** — converse with AI simulations of historical figures and contemporary celebrities

**Why it works:**

- AI conversation **lowers the user's "affective filter"** — the psychological anxiety associated with making linguistic mistakes in front of human native speakers
- Fantasy Chat adds a **potent layer of intrinsic motivation and narrative novelty**, successfully turning mundane grammar practice into an engaging, low-stakes roleplay experience

**Friction points:**

- **Technological instability is the primary issue:** persistent connection dropouts, infinite loading screens within the AI modules, instances where writing feedback fails to process entirely
- If AI feedback remains **purely passive** — merely correcting spelling after the fact rather than actively guiding syntactic structure — long-term pedagogical effectiveness is limited
- **Emotional read:** feels highly modern and cutting-edge when functional; perceived as a frustrating, superficial marketing gimmick when buggy

---

### 4. Videos, Quotes, and Image-Based Learning

**What it is:** Every vocabulary item in WordUp is accompanied by curated media — short movie clips, news excerpts, and images demonstrating the word in authentic contexts.

**Why it works (cognitive science):**

- Directly operationalizes **dual-coding theory**: pairing verbal/linguistic information with rich visual and auditory stimuli creates stronger, redundant neural pathways for recall
- Eliminates "sterile" learning by providing cultural and emotional context — *how* a word is actually deployed by native speakers in real life
- The primary **"wow factor"** of the app; makes learning feel deeply immersive and authentic rather than dryly academic

**Friction points:**

- **Media parsing failures:** Videos fail to load completely; subtitles occasionally spoil the target word during test modes, entirely negating active recall
- **Cognitive flow disruption:** Slow load times create micro-frictions that routinely break the user's flow state
- **Content production cost:** Tens of video clips per word × tens of thousands of words = enormous, ongoing content infrastructure requirement

**Emotional read:** Deeply immersive when functional. A significant source of abandonment frustration when buggy.

---

### 5. Gamification Elements

**What it is:** Nine distinct interactive challenge types, including: "Smart Eyes" (image matching), "Said What" (video gap-fill), "Confuse Me" (definition matching), and "Spell It" (audio-to-text spelling).

**Why it works:**

- Variable rewards break the monotony of standard flashcard review
- Appeals to different cognitive modalities: listening, spelling, reading comprehension

**Friction and weaknesses:**

- "Said What" frequently displays the target word in subtitles before the user can guess — destroys the pedagogical value of the active-recall exercise
- "Spell It" (audio-to-text) and "Said What" (video gap-fill) require typing — high friction on mobile; conflicts with LexiTap's no-typing commitment
- Gamification perceived as a **"pleasant, low-stress diversion"** from rote learning — lacks the psychological urgency needed to drive daily, unyielding retention
- Missing: aggressive leaderboard dynamics and high-stakes streak mechanics (Duolingo's primary retention engine)

**Emotional read:** Fun but forgiving. No compulsive daily pull.

---

### 6. Personalization and Domain-Specific Curation

**What it is:** Content curation based on the user's specific age, English proficiency, professional background, and personal interests — generating vocabulary lists tailored for fields like engineering, medicine, or business.

**Why it works:**

- Relevance = retention driver. A medical student learning anatomical terminology is vastly more motivated than one forced through generic travel vocabulary
- Personalization aligns the app directly with the user's immediate real-world utility, making time in the app feel productive and purposeful

**Friction and weaknesses:**

- Generating accurate, high-quality domain-specific corpora at scale is technically difficult
- An overly rigid algorithm can trap users in a professional niche, preventing exploration of general colloquial fluency

**Emotional read:** Deeply empowering when accurate — feels bespoke-built. Deeply frustrating when the algorithm locks users into an irrelevant niche.

---

## Part 7 — UX, Behavioral Psychology, and Retention Mechanics

*Captured 2026-05-23.*

### The Psychology of Continued Engagement — Hook Model Implementation

Retention in successful edtech is driven by the **Hook Model** (Trigger → Action → Variable Reward → Investment). WordUp operationalizes this through three mechanisms:

- **Micro-learning (low activation energy):** Daily goals from "casual" (5 min) to "Shakespearean" (30 min) minimize the cognitive cost of starting a session. Minimal activation energy = habit formation precondition met.
- **Visible progression (investment / sunk-cost):** As users watch their Knowledge Map fill with "mastered" color codes, pride of ownership and the sunk-cost fallacy drive return visits. Users feel they have something to protect.
- **Immediate real-world relevance (intrinsic reward):** When a user learns a word on their morning commute and hears it on Netflix that evening, the dopamine hit is massive. Contextual, real-world vocabulary learning directly produces this phenomenon.

### Three Vectors of Abandonment and Engagement Fatigue

**1. Technical Friction**

App crashes, infinite loading screens, and sync failures instantly sever the habit loop. When a user allocates their 5-minute commute window and the app freezes, they do not wait — they abandon the session and eventually uninstall. Reliability is not a nice-to-have; it is the retention floor.

**2. The SRS Trap (Cognitive Overload)**

If a spaced repetition algorithm is not aggressively tuned to forgive missed days, users return to hundreds of due reviews. This transforms the app from a tool of empowerment into a source of psychological guilt, driving immediate churn. Documented user verbatim: *“doing everything right for months, yet forgetting words”* = massive frustration and abandonment.

**3. Paywall Hostility**

Sudden removal of core features — e.g., WordUp removing its **"learn now" feature** — or aggressive, non-transparent subscription renewals (ELSA Speak's documented auto-renewal criticism) destroys user trust instantaneously, resulting in negative reviews and mass uninstallations.

### Motivation Loops, Notifications, and Streaks

Duolingo's dominance is largely attributed to its streak mechanic. **The streak is not merely a feature; it is the product.** It converts the abstract, overwhelming goal of "achieving fluency" into the immediate, daily, manageable goal of "keeping the integer alive."

WordUp uses spaced repetition and daily review reminders but lacks the psychological urgency of a highly visible, socially validated streak system. Its daily motivation loops are too passive to compete with top-tier consumer app retention mechanics. WordUp's Knowledge Map onboarding establishes curriculum well, but fails at the daily re-engagement problem.

**Core behavioral principle:** For a learning habit to form, the extrinsic motivator (streak, notification) must hold the user's attention long enough for the intrinsic motivator — the actual joy of understanding a second language — to take root.

## Extracted To — Index of Findings Distributed to Strategy Docs

*First extraction pass: 2026-05-22 (Session State v1.5). This section is the audit trail of which Competitive Analysis findings have been propagated to which strategy / operational docs. Future extraction passes append.*

### Extraction Pass 1 — 2026-05-22

| **Finding** | **Source Part** | **Landed In** |
| --- | --- | --- |
| Audience split (ESL only; no native lexicon expansion) | Parts 3-4 | Session State Decision Log; Product Strategy Overview Executive Summary |
| Competitive Frame (who we compete with, who we don't) | Part 4 | Product Strategy Overview → Competitive Frame |
| WordUp added as closest audience competitor | Parts 5-6 | Product Strategy Overview → Competitive Frame |
| Knowji as closest paper-feature competitor + teardown queued | Part 4 | Planning Backlog #42 |
| WordUp teardown queued | Parts 5-6 | Planning Backlog #44 |
| Audio Scope-Out (reference, not training; vs. ELSA) | Part 4 + Field Notes | Session State Decision Log; Product Strategy Overview → Audio Scope-Out |
| Multimedia Contextualization Scope-Out (vs. WordUp) | Parts 5-6 | Session State Decision Log; Product Strategy Overview → Multimedia Scope-Out; Anti-Patterns |
| SRS Forgiveness Mechanics commitment | Part 6 | Session State Decision Log; Anti-Patterns; Planning Backlog #43 |
| Anti-subscription positioning pillar | Part 4 + Field Notes | Brand Identity Marketing Pillars §1 |
| Zero ads positioning pillar (with Duolingo Super contrast) | Part 4 | Brand Identity Marketing Pillars §2 |
| Best-bang-for-the-buck pricing positioning | Part 4 | Brand Identity Marketing Pillars §3; Product Strategy Overview Pricing |
| Serious non-native focus (positioning sharpener vs. WordUp) | Parts 4-5 | Brand Identity Marketing Pillars §5 |
| Pedagogical Scope acknowledged (passive recognition only) | Part 6 | Product Strategy Overview → Pedagogical Scope |
| AI chat features anti-pattern | Part 6 | Session State Anti-Patterns |
| Content Sourcing Philosophy open decision (CEFR vs. frequency vs. hybrid) | Part 5 | Session State Open Decisions → Phase 0; resolves via Backlog #41 |
| Onboarding Diagnostic open decision (endowed-progress pattern) | Part 6 | Session State Open Decisions → Phase 1; resolves via Backlog #45 |
| ELSA hands-on Field Note value calibration | Field Notes | Cross-referenced in multiple Decision Log entries |
| "Don't compare to Duolingo" brand guideline | Part 4 | Brand Identity → Brand Guidelines (DON'T) |

### Extraction Pass 2 — 2026-05-23

| **Finding** | **Source** | **Landed In** |
| --- | --- | --- |
| Dual-coding theory: WordUp multimedia works because it pairs verbal + visual/auditory stimuli; validates LexiTap’s audio + imagery + example sentences as a lighter-weight implementation of the same mechanism | Part 6 §4 | Product Strategy Overview → Multimedia Scope-Out (strengthened rationale) |
| Technical failure validation: load failures + subtitle spoilers confirm that reliability > richness is the correct trade-off | Part 6 §4 | Product Strategy Overview → Multimedia Scope-Out (strengthened rationale) |
| “Wow factor” gap acknowledged: LexiTap’s multimedia-lite approach lacks WordUp’s immersive hook; positioning must compensate via price, ownership, and UX reliability | Part 6 §4 | Product Strategy Overview → Multimedia Scope-Out (wow-factor gap note) |
| WordUp gamification verdict: “pleasant, low-stress diversion” — lacks psychological urgency; validates LexiTap middle-ground positioning (between Duolingo compulsive and WordUp toothless) | Part 6 §5 | Product Strategy Overview → Competitive Frame (WordUp profile, gamification note) |
| WordUp’s “Spell It” (audio-to-text) and “Said What” (video gap-fill) require typing — confirm LexiTap no-typing rule eliminates these mechanics correctly | Part 6 §5 | No new doc update needed — no-typing anti-pattern already in Session State; filed here as audit confirmation |
| Personalization gap: WordUp does deep dynamic personalization (age, proficiency, profession, interests); LexiTap’s domain-specific paid tiers (TOEFL, IELTS, Business English) are its deliberate coarse-personalization substitute — acknowledged gap, not a new open decision | Part 6 §6 | Product Strategy Overview → Competitive Frame (WordUp profile, personalization gap note) |

### Extraction Pass 3 — 2026-05-23 (Part 7)

| **Finding** | **Source** | **Landed In** |
| --- | --- | --- |
| Hook Model framework (micro-learning + Knowledge Map progression + real-world relevance) — WordUp’s retention architecture | Part 7 | Competitive Analysis (captured); design input reference for Backlog #43 (SRS Forgiveness) and Backlog #24 (Gamification System Design) |
| Technical Friction abandonment vector: reliability = retention floor; 5-minute commute window is the atomic unit of engagement | Part 7 | Validates offline-first stack decision (no new doc update — already locked); filed as audit confirmation |
| SRS Trap: user verbatim “doing everything right for months, yet forgetting words” — cognitive overload → guilt → churn; validates SRS Forgiveness Mechanics | Part 7 | Product Strategy Overview → Competitive Frame (WordUp SRS weakness strengthened with user verbatim) |
| Paywall Hostility: WordUp removed its “learn now” feature; ELSA non-transparent renewals = trust destruction, negative reviews, mass uninstalls | Part 7 | Product Strategy Overview → Competitive Frame (WordUp profile) + Pricing Strategy (one-time model validation) |
| Streak = the product (Duolingo); WordUp daily reminders too passive; extrinsic motivator must hold attention long enough for intrinsic to take root | Part 7 | Product Strategy Overview → Competitive Frame (WordUp gamification note, streak language) |

### Captured But Not Yet Extracted

Research data points present in this doc but **not** yet pushed to strategy docs — either contextual reference only, explicitly deferred by founder, or filed for future trigger.

- **Market sizing data** ($6.34B → $24.39B; 16.15% CAGR) — Part 1, contextual reference only
- **Asia-Pacific concentration** — Part 1; ASO localization explicitly deferred per founder decision (cost-prohibitive at current budget; revisit when >$500/quarter available or organic discovery shows blockage)
- **Gamification engine validation** (Part 2: gamification + AI personalization are primary growth engines) — partially addressed by existing streak counter; deeper design pending Backlog #24 (Gamification System Design)
- **Lifetime subscription industry trend** — Part 4; informally filed; consider for Backlog #17 (Pricing Strategy Evolution) when triggered post-launch
- **Vocab Jams gamification reference ([Vocabulary.com](http://Vocabulary.com))** — Part 4; informational reference for Backlog #24 when triggered
- **Magoosh lead-gen model** — Part 4; informational reference for Backlog #28 (Long-Term Product Roadmap) when triggered

### When To Run The Next Extraction Pass

Trigger an extraction pass when **any** of these are true:

- A new Part of research is added AND it contains material with cross-doc implications
- Hands-on Field Notes (e.g., founder evaluations of competitors) accumulate enough new data points to shift positioning
- The founder explicitly signals "extract" — the preferred trigger

---

## Implications for LexiTap (Synthesis — historical reference)

*Original placeholder section. Superseded by the "Extracted To" audit trail above after extraction pass 1 (2026-05-22). Keep blank — future synthesis efforts that don't fit the extraction model can live here.*

---

## Capture Log

- **2026-05-22** — Part 1 (Market Overview & Context) added. Includes strategic framing, market sizing table, and geographic concentration note. Source: external research dump shared in chat.
- **2026-05-22** — Part 2 (Current Trends & the Commoditization of AI) added. Includes the 33.5% AI revenue share figure, named AI-integrated competitors (Duolingo Max, ELSA Speak, Enverson AI, TalkPal), and the "has AI vs. implements AI well" market-shift framing. Source: external research dump shared in chat.
- **2026-05-22** — Part 3 (User Expectations & Underserved Market Gaps) added. Includes the 18–24 demographic engagement figure (48%), individual-learner market share (36.10%), self-paced format share (31.74% in 2025), mobile/UX expectations list, and the three named market gaps: (1) intermediate plateau B1/B2→C1/C2, (2) industry-specific professional jargon, (3) lexical chunking and collocations / Lexical Approach. Source: external research dump shared in chat.
- **2026-05-22** — Part 4 (Competitor Profiles & Industry Monetization Patterns) added. Includes freemium-dominance framing, 8 competitor profiles (Duolingo, Memrise, Quizlet, Anki, ELSA Speak, Magoosh, Knowji, [Vocabulary.com](http://Vocabulary.com)), and the financial picture (Duolingo >$1B + 71% IAP share; ELSA auto-renewal backlash; rise of lifetime subscriptions). Source: external research dump shared in chat.
- **2026-05-23** — Part 6 §4–6 (Videos/Quotes/Images, Gamification, Personalization) added. Continuation of the Core Feature Evaluation (Part 6) started 2026-05-22. Completes the WordUp feature deconstruction. Extraction Pass 2 completed same session.

## Part 8 — WordUp SWOT Analysis

*Captured 2026-05-23.*

| **Category** | **Strategic Factors** |
| --- | --- |
| **Strengths** | Pedagogical Relevance: 25,000 frequency-ranked words by domain — high ROI on user time. Deep Contextualization: videos, images, historical quotes — unmatched grounding in real usage. Diagnostic Onboarding: Knowledge Map provides immediate personalized curriculum. AI Integration: Lexi + Fantasy Chat provide low-anxiety conversational practice. |
| **Weaknesses** | Technical Instability: crashes, freezing, infinite loading screens damage retention. Cross-Platform Failures: sync issues across devices; buggy Chrome extension. **Pedagogical Blindspot: focuses almost exclusively on single words — ignores multi-word collocations, idioms, and phrasal verbs required for true fluency.** Media Parsing Errors: subtitles spoil answers in test modes. |
| **Opportunities** | B2B/Institutional: university cohorts and corporate training as a major revenue vertical. Lexical Chunking: expanding Knowledge Map to natively include multi-word phrases and collocations. Enhanced Passive Acquisition: frictionless browser extension for native web reading. **Social Accountability: community challenges and leaderboards to boost daily retention — identified gap, not yet built.** |
| **Threats** | AI Commoditization: well-funded competitors (Duolingo Max, Speak) can replicate conversational AI features. **Subscription Fatigue: consumers increasingly prefer ad-supported free or lifetime deals over high-cost recurring subscriptions.** Open-Source Migration: advanced users migrate to Anki (free, customizable). Market Consolidation: Duolingo expanding feature sets to absorb niche use cases. |

### SWOT Implications for LexiTap

**WordUp's Pedagogical Blindspot is LexiTap's direct differentiation:** WordUp explicitly ignores idioms, phrasal verbs, and multi-word collocations — the exact content LexiTap ships as dedicated paid tiers (Idioms & Expressions $9.99, Phrasal Verbs $9.99). This is not an accidental overlap; it is a documented gap in the market leader that LexiTap fills by design.

**Subscription Fatigue is a market-level tailwind, not just a LexiTap preference:** The research identifies consumer resistance to high-cost recurring subscriptions as a documented market threat to WordUp and ELSA. LexiTap's one-time purchase model is a structural response to a category-wide problem.

**Social Accountability gap:** WordUp identifies community challenges and leaderboards as an opportunity it has not yet captured. LexiTap's current gamification (streak + progress visualization) does not include social mechanics — a future lever available via Backlog #24 if retention data warrants it.

## Part 9 — Product Opportunities: Architecting the Next-Generation Application

*Captured 2026-05-23.*

### Baseline Expectations — Table Stakes in 2026

A modern app entering this market cannot market itself on the following; they are standard consumer expectations, not differentiators:

- **Spaced Repetition (SRS):** Basic SM-2 or Leitner algorithms — expected baseline, not a selling point
- **Basic AI Chatbots:** Injecting an LLM API and calling it an "AI Tutor" — insufficient; users demand structured pedagogical feedback
- **Gamified Elements:** Progress bars, basic point systems, digital badges — ubiquitous and expected
- **Dictionary Lookups:** Definitions, synonyms, basic audio pronunciation — absolute MVP floor

**Implication for LexiTap:** None of these are differentiators. LexiTap's differentiation lies in price, ownership, no-typing UX, offline-first reliability, and filling WordUp's pedagogical blindspot (idioms, phrasal verbs). Marketing should not lead with SRS or gamification.

---

### Strategic Imperatives — Where to Beat WordUp

**1. Flawless Technical Architecture**

Zero latency, offline-first, conflict-free cloud sync across platforms. Trust is built on stability. *(Validates LexiTap's existing stack decisions — no new action.)*

**2. Lexical Chunks Over Isolated Words**

WordUp's greatest pedagogical flaw is single-word focus. Teaching "heavy rain" as a unit rather than "heavy" and "rain" separately reflects how fluency is actually acquired. *(Validates LexiTap's Idioms & Phrasal Verbs tiers and Year 2 lexical chunking roadmap. No architecture change needed at MVP — flat multi-word entries already supported.)*

**3. Forgiving and Adaptive SRS**

If a user misses three days, the algorithm should intelligently redistribute the review load — not punish them with a wall of flashcards. *(Already locked as SRS Forgiveness Mechanics — Backlog #43.)*

**4. Frictionless Contextual Capture (Year 2)**

Highlight a word in any digital article → instant translation + context sentence auto-added to SRS queue. WordUp's Chrome extension is clunky and buggy. *(LexiTap is mobile-only at launch; browser/reading integration is Year 2 territory. Filed as Backlog #28 reference.)*

---

### Unmet Needs — Documented Market Gaps

**True Active Production** — Most apps rely on passive recognition (multiple-choice). The next-generation app should prompt users to produce vocabulary in novel sentences with AI feedback on grammar, tone, and style. *(LexiTap has scoped this out — no-typing rule + passive recognition only. Confirmed Year 2 gap, not MVP scope. Document validates the gap exists but does not change the decision.)*

**"Bliss Point" UX** — Haptic feedback, micro-animations, dynamic pacing (time-to-answer as cognitive load signal). The app should feel like a premium digital concierge, not a digitized textbook. *(Design input for Backlog UX work — achievable in React Native. Reference for Phase 1 build.)*

---

### Strategic Recommendations — LexiTap-Relevant Extracts

**UX Design:**

- **IRT-Based Onboarding:** Replace manual word-sorting (WordUp's grueling calibration) with an adaptive diagnostic using Item Response Theory — 15 carefully selected, progressively difficult questions to pinpoint vocabulary size and domain in under 2 minutes. *(Direct design input for Backlog #45 / Open Decision #2 — Onboarding Diagnostic.)*
- **Aesthetic Minimalism + Dark Mode:** Comprehensive dark mode, typography-focused layouts, reduced cognitive load, dyslexia-friendly fonts, high-contrast modes. *(Design input for Phase 1 UX build.)*

**Retention Systems:**

- **Streak Freeze / Flexible Weekly Goals:** Implement streak but add "streak freezes" or flexible weekly targets that accommodate adult life. Goal = durable habit, not punishment for a busy schedule. *(Design input for Backlog #43 + #24 — extends the locked streak decision with a specific forgiveness mechanism at the streak layer.)*
- **Context-Aware Push Notifications:** Replace generic "Time to study!" prompts with SRS-schedule-aware, curiosity-driven triggers — e.g., *"You learned 'mitigate' yesterday. Can you remember what it means before your meeting today?"* *(Design input for Backlog #43 — notification strategy is part of the habit loop architecture.)*
- **Variable Rewards + Content Unlocking:** When a user masters a word set, unlock access to native content (short story, curated video) that uses their newly acquired vocabulary. *(Year 2 — requires content production budget and infrastructure not available at MVP.)*

**AI Features:**

- **Contextual Sentence Generation:** AI generates dynamic example sentences based on user's interests (if user loves Formula 1 and learns "velocity," the example uses racing context). *(Partially in scope — content pipeline already uses LLM-generated example sentences. This is a content generation refinement, not a runtime AI feature at MVP.)*
- **Dynamic Distractor Generation:** AI generates plausible-but-wrong multiple-choice answers that specifically target common errors based on the user's native language interference — dramatically improving the pedagogical value of multiple-choice exercises. *(New idea — not currently in scope. Filed as candidate backlog item.)*
- **Active Production Coaching** (speak/type + AI evaluates tone, style, grammar): *(Explicitly scoped out — no-typing rule + passive recognition only. Year 2.)*

**Learning Science:**

- **FSRS Algorithm (vs. SM-2):** Free Spaced Repetition Scheduler — a modern algorithm that factors in the user's individual memory retention rates and the inherent difficulty of specific language pairs, rather than the outdated SM-2 model that WordUp uses. Research-backed improvement for long-term retention. *(Design input for Backlog #43 — whether LexiTap implements SM-2 or FSRS is a concrete technical decision that needs to be made before Phase 1B scheduler code is written.)*
- **Deep Processing Modalities** (read + hear + type + speak): LexiTap covers read + hear + tap; typing and speaking are scoped out. Acknowledged partial coverage — acceptable for passive recognition scope.

**Monetization:**

- Value-based freemium, transparent billing, B2B institutional: all already locked or filed. *(No new action.)*

**Differentiation — "Pervasive Language Ecosystem":**

Don't position as a better flashcard tool. Position as an intelligent language ecosystem where the entire internet becomes the user's personal interactive textbook. Frictionless contextual capture (iOS Safari + Android browser integration) is the ultimate defensible moat. *(Year 2 vision — validates the direction but out of scope for launch. Filed as Backlog #28 long-term reference.)*

### Extraction Pass 5 — 2026-05-23 (Part 9 — Product Opportunities)

| Finding | Source | Landed In |
| --- | --- | --- |
| Table stakes clarification (SRS, basic AI, badges, dictionary = baseline, not differentiators) | Part 9 | Product Strategy Overview → Competitive Frame (table stakes note added to positioning) |
| FSRS algorithm as superior alternative to SM-2 — factors in individual retention rates + language pair difficulty | Part 9 | Competitive Analysis (captured); Backlog #43 design input — SM-2 vs. FSRS is a concrete technical decision required before Phase 1B scheduler code |
| IRT-based onboarding (15 questions, <2 min, adaptive difficulty) | Part 9 | Competitive Analysis (captured); Backlog #45 design input — resolves Open Decision #2 (Onboarding Diagnostic) with a specific methodology |
| Streak freeze / flexible weekly goals — specific streak forgiveness mechanism | Part 9 | Competitive Analysis (captured); Backlog #43 + #24 design input — extends locked streak decision |
| Context-aware push notifications (SRS-schedule-driven, curiosity-triggered) | Part 9 | Competitive Analysis (captured); Backlog #43 design input — notification strategy is part of habit loop architecture |
| Dynamic Distractor Generation (AI-generated wrong answers targeting native-language interference) | Part 9 | New candidate backlog item — not currently in scope; filed for Planning Backlog triage |
| Frictionless Contextual Capture (browser reading integration → auto-add to SRS) | Part 9 | Backlog #28 (Year 2 long-term roadmap reference); out of scope for mobile-only Phase 0–1 |
| Active Production Coaching (type/speak + AI feedback) | Part 9 | Confirmed Year 2 scope-out — no-typing rule + passive recognition hold; document validates the gap exists |
| Aesthetic minimalism + dark mode + dyslexia-friendly fonts | Part 9 | Design input for Phase 1 UX build; no strategy doc update needed |
| Variable rewards + content unlocking (native content on word-set mastery) | Part 9 | Year 2 — requires content production budget; Backlog reference |
| Social features (Vocab Jams, accountability partners) | Part 9 | Year 2 — requires user base; Backlog reference |
| B2B/Institutional, transparent billing, value-based freemium | Part 9 | Already locked/filed — audit confirmation only |

## Part 10 — Knowji Competitive Teardown

*Captured 2026-05-23. Research-based; first-person hands-on evaluation (Backlog #42) still pending.*

### Product Positioning

Audio-visual memorization tool differentiating from text-heavy competitors via custom cartoon illustrations and story-like example sentences. Targets K-12 (Common Core), ESL/ELL learners, and high-stakes test prep (SAT, GRE, ASVAB, TOEFL). Subscription pricing ~$4.99–$10/mo (~$60–$120/yr).

**Strategic differentiation:** While WordUp differentiates through real-world video clips, Knowji differentiates through custom cartoon characters and narrative example sentences. Pairs this visual approach with a built-in SRS "memory coach."

---

### Core Feature Evaluation

**1. Audio-Visual Learning (Cartoons + Stories)**

Custom cartoon illustration + story-like example sentence for every word.

- Works because: operationalizes dual-coding theory — visual + narrative anchor for abstract concepts; especially effective for visual learners
- Weakness: illustrations are static; users describe them as "quite cheesy and exaggerated" — juvenile aesthetic alienates adult professionals and serious corporate learners
- User perception: effective for quick memorization even if aesthetically goofy; users accept the trade-off

**2. Built-in SRS "Memory Coach"**

Tracks how well the user knows each word; prompts review just before the forgetting threshold.

- Works because: automates review scheduling based on cognitive science; removes the cognitive load of deciding what to study
- Critical weakness: **highly individualized to a single device.** Knowji actively advises against multiple users sharing the "Learn & Remember" feature on the same device — it irreversibly disrupts the SRS schedule. High friction in household and classroom settings.
- LexiTap response: account-based cloud sync solves this completely by architecture

**3. Four Learning Modes + Active Recall**

Forces active production — passive reading, multiple-choice recognition, and physically typing/spelling the target word.

- Works because: spelling (active production) cements words deeper than passive recognition alone
- Weakness: multiple-choice can become a crutch if distractors aren't challenging enough (validates Backlog #48 Dynamic Distractor Generation)
- Note: typing requirement is a mobile friction point LexiTap's no-typing rule explicitly avoids

**4. Pronunciation Recording Tool**

Listen to native speaker → record own voice → manually compare.

- Works because: encourages speaking aloud; aids muscle memory and auditory processing
- Critical weakness: **entirely manual comparison** — no AI grading, no phoneme-specific feedback
- LexiTap status: pronunciation training explicitly scoped out (Audio Scope-Out decision); this gap is not LexiTap's lane

---

### User Experience and Retention

**Retention driver:** "Rapid progress" sensation. Users explicitly report learning words "incredibly fast, faster than I thought I would learn, and faster than just using flashcards." The visual hook + SRS loop is genuinely efficient.

**Abandonment patterns:**

- **Post-test churn:** When a user passes their target test (GRE, TOEFL, etc.), app utility drops sharply. Knowji's single-domain positioning accelerates this churn.
- **Tech errors:** Occasional AI/recognition errors cause severe user frustration — trust destruction on a product where accuracy is the promise.

---

### SWOT

| Category | Strategic Factors |
| --- | --- |
| **Strengths** | Visual pedagogy (cartoons + narrative = dual-coding); exam-aligned lists (SAT, GRE, ASVAB, TOEFL); active recall (typing/spelling) |
| **Weaknesses** | Juvenile aesthetic alienates adult learners; device-bound SRS (single-user only); manual pronunciation (no AI feedback) |
| **Opportunities** | B2B classroom expansion; AI-generated dynamic visuals (replacing static cartoons) |
| **Threats** | Generative AI commoditization (bespoke mnemonic images per user interest makes static cartoons obsolete); gamified giants (Duolingo, Memrise) with superior retention loops |

---

### LexiTap Competitive Implications

**Juvenile aesthetic = LexiTap's primary positioning opening.** The market gap is documented and confirmed in Knowji's own user research. LexiTap's adult-professional, minimalist aesthetic (Notion / Superhuman reference — see Brand Identity UI Aesthetic Direction) directly fills what Knowji's cartoon-heavy design repels.

**Device-bound SRS = free competitive advantage.** LexiTap's account-based cloud sync is an architectural decision already made — it costs nothing extra and eliminates a documented Knowji pain point in household and classroom contexts.

**Post-test churn mitigation.** LexiTap's multi-tier structure (TOEFL → Business English → Idioms → Phrasal Verbs) gives users natural next tiers after passing a test. Knowji's narrower content scope makes churn near-inevitable post-test.

**Price advantage.** Knowji ~$60–120/yr vs. LexiTap Premium Pass $29.99/yr. Price alone isn't the argument, but combined with the aesthetic and architecture advantages, it's decisive.

**What Knowji does better than LexiTap at MVP:** Per-word custom illustration creates a stronger visual memory hook than LexiTap's curated imagery approach. Knowji's "picture for every word" has genuine pedagogical effectiveness — users report measurably faster learning. LexiTap's imagery is functional but not as deeply personalized. This gap is a Year 2 opportunity via AI-generated mnemonic imagery (Backlog #34).

## Part 11 — Onboarding Diagnostic Design: Best Practices for Vocabulary Apps

*Captured 2026-05-23. Source: strategic research on modern diagnostic onboarding methodology.*

### Core Principle

Onboarding diagnostics must balance accuracy with speed. "Bad friction" (clunky UI, excessive form fields) drives abandonment. "Good friction" (a brief, well-designed test) proves the app is personalizing to the user — which boosts long-term retention. The goal: make the user feel seen in under 2 minutes.

### Five Design Layers

**1. Self-Segmentation Before Any Assessment**

Present a brief welcome survey before the adaptive test: goals (test prep, professional English, general fluency), professional background, perceived skill level. Give users a binary choice — "Start from scratch" or "Find my level." Beginners who might be overwhelmed by a test can self-select out; advanced learners self-select into the full diagnostic. Precedent: Duolingo's "I'm new" vs. "I already know some" entry point.

**2. Computerized Adaptive Testing (CAT) via Item Response Theory (IRT)**

Never use a static, fixed-length quiz. In a CAT system, question difficulty adapts in real-time: correct answer → harder next question; wrong answer → easier next question. Pinpoints the user's exact vocabulary size in a fraction of the time a traditional fixed test would take. Question pool must be pre-calibrated by difficulty across the CEFR/tier range.

**3. Yes/No Format + Pseudo-Word Signal Detection**

Use a "Do you know this word?" Yes/No format for speed (no definition recall required at this stage). To counter overconfidence and guessing: intersperse 2–3 pseudo-words (phonetically plausible fake words — e.g., *"flurvent"*) throughout the quiz. Signal Detection Theory tracks "false alarms" (user claims to know a fake word) and automatically corrects the final score. Low implementation cost, high detection value.

**4. Smart Stopping Rules (SE-Based, Not Fixed Question Count)**

Never force a fixed question count. The diagnostic should terminate automatically once the Standard Error (SE) of measurement drops below a confidence threshold. Some users are classified in 10 questions; others take 25. This prevents cognitive fatigue for easy-to-classify users and ensures accuracy for outliers. Users should never see a countdown to a fixed number — the test ends naturally.

**5. "Discovery" Framing (Not "Exam" Framing)**

- Always start with an easy/intermediate word to guarantee early success and prime confidence
- Use copy: "Let's find your starting point" — never "placement test" or "assessment"
- Immediate payoff at diagnostic end: show a personalized Knowledge Map ("You already know ~X words. Here's your custom curriculum.") — this is the endowed-progress effect payoff that drives D1 retention

### Extracted To

Backlog #45 (full design spec added 2026-05-23)

Session State — Open Decision #2 updated: research complete; one fork remains (full IRT vs. simplified adaptive at MVP)