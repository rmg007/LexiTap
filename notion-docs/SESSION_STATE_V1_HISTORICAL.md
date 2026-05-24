# [ARCHIVED - DO NOT LOAD] Session State v1 - LexiTap (2026-05-22)

---
title: Session State v1 - LexiTap (Archived 2026-05-22)
category: strategy
status: archived
phase: 0
priority: P0
updated: 2026-05-22
load_order: 14
tags: [session-state, archived, historical, decisions, v1]
---

> ARCHIVED — DO NOT LOAD in normal sessions. Full decision history from the 2026-05-22 planning session. Superseded by SESSION_STATE.md. Load only when specifically researching historical decisions.

**Purpose:** Snapshot of all decisions, planning status, and context after the initial planning sessions. Read this first when starting a new conversation to restore full project context.

**Last updated:** 2026-05-22

**Phase:** Phase 0 — Validation (pre-build)

**Next phase trigger:** Week 1 validation interviews + word list sourcing

---

## How to Use This Document

When starting a new Claude conversation about LexiTap:

1. Share this document URL or paste its contents at the start
2. State your current task or question
3. Claude will have full project context without re-deriving everything

This document is the equivalent of `/compact` for cross-session project memory.

**Update cadence:** After every major decision or planning session. Add a new "Decision Log" entry with the date and what changed.

---

## Quick Reference

| Item | Value |
| --- | --- |
| **Product name** | LexiTap |
| **Domain** | [lexitap.app](http://lexitap.app) (.app TLD, ~$20/year) |
| **Tagline** | "Master vocabulary without typing" |
| **Primary market** | Global ESL learners (test prep, professional English, idioms, phrasal verbs) |
| **Secondary** | None for LexiTap — American-student vocab is a separate product (different chat, different app) |
| **Total timeline** | 21 weeks to 1,000 users |
| **Tech stack** | React Native (Expo) + TypeScript + SQLite + Supabase |
| **Backend** | Supabase (Postgres + Auth + Edge Functions) |
| **Year 1 cost** | $144 total ($99 Apple, $25 Google, $20 domain) |
| **Year 3 cost at scale** | $419 (adds $300 Supabase Pro at 150K users) |

---

## Core Product Decisions

### 1. Positioning: ESL-First, Not Schools

Decision: Focus on global ESL learners initially, not US K-12 schools.

Why: ~1.5B addressable market vs ~50M. Higher willingness to pay among TOEFL/IELTS takers. Less regulatory complexity (no FERPA/COPPA-by-default).

### 2. Pricing: Freemium + One-Time Purchases

Decision: Free Foundation + Advanced tiers, paid test prep modules as one-time purchases.

Why: One-time aligns psychologically with "take test once, done." Subscriptions feel exploitative for finite need.

**Tiers (launch + post-launch waves):**

*Free, launch:*

- LexiTap Foundation (CEFR A2-B1) — FREE
- LexiTap Advanced (CEFR B2-C1) — FREE

*Paid, launch wave:*

- TOEFL Vocabulary — $14.99 (with audio)
- IELTS Vocabulary — $14.99
- Business English — $9.99
- Common 3,000 — $2.99 (entry-level paid)
- Premium Pass — $29.99/year (unlocks all paid tiers; price locked through launch)

*Paid, post-launch content drops (Week 22+):*

- GRE Vocabulary — $14.99
- GMAT Vocabulary — $14.99
- Idioms & Expressions — $9.99
- Phrasal Verbs — $9.99

**Word counts deliberately not committed at this stage.** Content sourcing determines actuals; pre-committing to specific counts creates fake constraints.

### 3. GTM: Teacher Referral Network Primary

Decision: Tiered teacher commissions as primary acquisition channel.

Why: Aligned incentives (teacher wants student success), viral loop (50 students per teacher), low CAC.

**Commission tiers:**

- Tier 1 (0-10 referrals): 20%
- Tier 2 (11-50 referrals): 25%
- Tier 3 (51-200 referrals): 30%
- Tier 4 (201+ referrals): 35%

Students get 20% discount with teacher code.

### 4. TOEFL First Paid Module

Decision: Build TOEFL pack first (Phase 3, Week 11).

Why: Highest WTP ($14.99 accepted by international students with $200+ test fee). Desperate audience. Audio is table stakes (you have it; competitors don't).

### 5. Cloud Sync: FREE for All Users

Decision: Cloud sync included free, not a paid feature.

Why: Export gives word lists ONLY, not progress (mastery/streak/quiz history). Losing device = losing months of work = churn. Market standard (Duolingo, Quizlet, Anki all free). Cost is negligible ($25/mo at 150K users = 0.4% revenue).

### 6. UX: No-Typing in All Assessments

Decision: All quizzes use tap/drag/match. No TextInput in quiz flows (enforced in [AGENTS.md](http://AGENTS.md)).

Why: Core differentiation. Communicated in product name ("LexiTap"). Removes mobile keyboard friction.

**Assessment types:**

- MultipleChoice
- DragDrop
- ImageMatch
- Classification

### 7. Architecture: Clean / Hexagonal / DDD

Decision: Three-layer separation (domain, application, infrastructure, presentation).

Why: Enables future Schools app reuse (copy domain/application layers, rewrite presentation). Pure TypeScript domain logic has no framework dependencies.

### 8. Promo Codes for Goodwill Marketing

Decision: Personal free codes (e.g., PLUMBER2025) for relationship-based marketing.

Why: Cheap way to build goodwill (e.g., plumber fixes sink, gets free TOEFL code). Trackable via Supabase.

---

## Memory Architecture Decision

**Decision:** Markdown files as canonical store + SQLite as rebuildable index. Designed for 20-year longevity, agent-runtime independent.

**Why:**

- Markdown survives any tooling change (universal format)
- SQLite rebuildable from markdown (insurance)
- Retrieval behind an interface (swap backends freely)
- No vendor lock-in (Notion explicitly rejected as canonical store)
- Same data layer works for Claude Code today AND custom local agent in Year 2

**Three access modes:**

- **full** — Native tool calls (Year 2+, after local agent built)
- **scripts** — CLI scripts (Year 1, current Claude Code reality)
- **manual** — Fallback only (agent must ask user)

**Layered defense (Claude Code era):**

1. [CLAUDE.md](http://CLAUDE.md) guidance with self-check patterns
2. Path-of-least-resistance tooling (npm run memory:*)
3. Git pre-commit hooks
4. Continuous validation script
5. Quarterly rebuild test

**Migration to local agent:** ~12 months. Triggers: >20% drift detected, hand-off needed, multiple concurrent agents.

**Note:** This conversation revealed that Claude Code's built-in tools (Write, Edit, Bash) cannot be replaced — only guided via [CLAUDE.md](http://CLAUDE.md). True enforcement requires custom agent runtime with sandboxed tools, which is the Year 2 target.

---

## Tech Stack (Locked In)

### Mobile App

- React Native 0.73+ via Expo SDK 50 (managed workflow)
- TypeScript 5.x (strict mode)
- SQLite (expo-sqlite) — offline-first, primary storage
- Supabase — auth + sync + teacher system
- TanStack Query v5 (data) + Zustand (global state)
- expo-router (navigation)
- Jest + Testing Library
- React Native Reanimated v3 (animations)
- expo-haptics (subtle only)

### Content Tool (CLI)

- Node.js 20 LTS
- TypeScript
- SQLite
- commander.js (CLI)

### Backend

- Supabase (Postgres + Auth + Edge Functions)
- Tables: user_accounts, user_progress_sync, user_entitlements_sync, user_stats_sync, teachers, referrals, promo_codes
- Cost: $0/mo until 50K users, then $25/mo

### Website

- Static HTML + Tailwind CSS
- Vercel (free hosting)
- Domain: [lexitap.app](http://lexitap.app)

---

## Notion Documentation Inventory (13 Docs)

All docs live in: [LexiTap Documentation Hub](../Lexicon%20ESL%20Documentation%20Hub%209bbc4230030c4052a43d34a0d4d74975.md) ("LexiTap Documentation Hub")

### Strategy

1. **📋 Product Strategy Overview** — tiers, pricing, GTM, validation phases
2. **📅 Implementation Roadmap** — 21-week timeline, phases 0-6
3. **🏗️ PROJECT OVERVIEW — Start Here** — master doc with all decisions
4. **📋 Planning Backlog — 40 Items** — everything not yet planned, with triggers
5. **🔎 Competitive Analysis — Vocab App Market 2026** — market sizing, WordUp deep-dive, opportunity gaps (building incrementally from external research)

### Technical

1. **📊 Database Schema (Multi-Tier + Paywall)** — SQLite + Supabase tables
2. **⚙️ Content Pipeline Architecture** — CLI tool spec

### Marketing

1. **🌐 Website + Teacher Referral System** — [lexitap.app](http://lexitap.app) + Supabase backend
2. **🎉 Brand Identity — LexiTap** — logo, colors, messaging, App Store copy

### Agent Documentation

1. **🤖 [AGENTS.md](http://AGENTS.md) — Mobile App Conventions** — stack, banned practices, file structure
2. **🏛️ Architecture — Clean & Domain-Driven** — hexagonal, DDD, reusable domain layer
3. **🧠 Memory & Documentation Architecture** — markdown canonical + SQLite index, 20-year design

### Session State

1. **📁 Session State — LexiTap Planning Phase** — THIS DOCUMENT

---

## Planning Backlog Summary (40 Items)

The planning backlog identified 40 items requiring planning beyond what's already documented. Distribution:

- 🔴 **P0 (10 items)** — Must plan before launch: privacy policy, IP licensing, secrets, monitoring, support, CI/CD, onboarding, ASO, age verification, data protection
- 🟠 **P1 (11 items)** — First 3 months post-launch: security, backups, analytics, deployment, business entity, teacher payouts, pricing evolution, financial framework, content QA, notifications, pre-launch marketing
- 🟡 **P2 (9 items)** — First year: threat model, content refresh, gamification, re-engagement, content marketing, student viral, Year 2 roadmap, vendor lock-in audit, legal scenarios
- 🟢 **P3 (6 items)** — When triggered: localization, accessibility, platform expansion, AI/ML, open source, community
- 🔵 **P4 (4 items)** — Strategic reflection: competitor response, bus factor, reputation, annual review

**Critical insight:** Product is well-planned. Business infrastructure around the product is NOT. Backlog closes that gap incrementally as triggers fire.

**First triggers fire in Week 2** (IP licensing + secrets management).

---

## Implementation Roadmap Summary

### Phase 0: Validation (Week 1) — CURRENT PHASE

- Interview 10 parents, 5 high schoolers, 20 TOEFL test-takers
- Source Foundation word list (800 words)
- Source TOEFL word list (600 words)
- Competitive analysis (5 apps)

**Success:** 7/10 parents say yes to free download, 3/5 juniors say maybe/yes to paid

**Failure:** Pivot or kill

### Phase 1: Build (Weeks 2-6) — 6 weeks total

- **Content tool (Weeks 2-3):** import, validate, export commands
- **Mobile app + cloud sync (Weeks 2-6):**
    - Expo + TypeScript setup
    - Supabase setup (auth + database)
    - Account creation flow (email/password + Google Sign-In)
    - Cloud sync logic (background upload/download)
    - Screens: Home, Quiz, Progress, Settings
    - Assessment widgets: MultipleChoice, DragDrop
    - Streak counter

### Phase 2: Beta Test (Weeks 7-10)

- TestFlight + Google Play Internal Testing
- 50 beta testers via teachers/Reddit/Facebook
- Measure D7 retention (target >30%)
- Test cloud sync across devices

### Phase 3: Paid Tiers (Weeks 11-12)

- Source TOEFL audio (ElevenLabs ~$50)
- Build paywall
- Apple/Google IAP integration
- Teacher referral validation
- Promo code system
- Target: 10 paying users

### Phase 4: Expansion — Launch Wave (Weeks 13-17)

- Add IELTS, Business English, Common 3K (launch-wave paid tiers)
- Premium Pass logic
- ImageMatch, Classification widgets
- UX polish
- GRE, GMAT, Idioms, Phrasal Verbs **deferred to Phase 6 content-drop cadence**

### Phase 5: Launch (Weeks 18-19)

- App Store assets
- Privacy policy + ToS
- Apple submission ($99/year) + Google ($25 one-time)
- Website launch
- Teacher portal deployment

### Phase 6: Growth + Content Drops (Week 20+)

- Activate teacher network
- Content marketing
- ASO
- Monitor retention/conversion/revenue
- **Monthly content drops:** GRE (~Week 22), GMAT (~Week 26), Idioms & Expressions (~Week 30), Phrasal Verbs (~Week 34). Order may shift based on conversion data; cadence is a target, not a commitment.

**Total: 21 weeks to App Store launch, 1,000 users by Week 22+**

---

## Revenue Projections

### Year 1 (Conservative)

- Free users: 10,000
- Conversion: 3%
- Paying users: 300
- ARPPU: $12
- **Gross revenue: $3,600**

### Year 2 (Growth)

- Free users: 50,000
- Conversion: 5%
- Paying users: 2,500
- ARPPU: $12
- **Gross revenue: $30,000**

### Year 3 Conservative (Mature)

- Free users: 150,000
- Conversion: 5%
- Paying users: 7,500
- ARPPU: $12
- Gross: $90,000
- Teacher commissions (25% avg): -$22,500
- **Net: $67,500**

### Year 3 Optimistic (TOEFL Focus)

- Free users: 60,000
- Conversion: 15% (desperate audience)
- Paying users: 9,000
- ARPPU: $15
- Gross: $135,000
- Teacher commissions (25% avg): -$33,750
- **Net: $101,250**

---

## Open Questions / Pending Decisions

### Phase 0 (This Week)

- [ ]  Confirm word list sources (Foundation, TOEFL specifically)
- [ ]  Decide audio provider: ElevenLabs ($50 estimate) vs. alternative
- [ ]  Validation interview script (parents, students, test-takers)
- [ ]  **Content Sourcing Philosophy** (open decision triggered by WordUp competitive analysis):
    - Option A: CEFR-tiered only (current plan) — sequence words by level (A2→B1→B2→C1) within each tier
    - Option B: Frequency-based only (WordUp model) — sequence by real-world frequency from corpora (movies/TV/news)
    - Option C: Hybrid — CEFR tiers as gating + frequency ranking *within* tier
    - **Trade-off:** Option A is current. Option B is what WordUp uses (25K-word corpus). Option C captures benefits of both at higher sourcing cost. Resolves via #41 Content Sourcing Strategy work.

### Phase 1 (Weeks 2-6)

- [ ]  Database migration tool selection (raw SQL vs. ORM)
- [ ]  Supabase project naming convention
- [ ]  Test coverage tooling (Jest config decisions)
- [ ]  **Onboarding Diagnostic with Endowed-Progress Pattern** (open decision triggered by WordUp Knowledge Map analysis):
    - WordUp's "I know / Test me / Learn" diagnostic onboarding boosts D1 retention via the *endowed progress effect* (showing users they already know thousands of words).
    - **Question:** Adopt this pattern (in some form) for LexiTap onboarding, OR keep the simpler CEFR self-assessment currently planned?
    - **Trade-off:** more powerful retention mechanic vs. heavier calibration friction (WordUp users complain the manual sort is grueling). Resolves via #45 design exercise.

### Phase 5 (Launch)

- [ ]  Privacy policy: template service vs. custom (P0 backlog item #1)
- [ ]  Analytics tool: PostHog vs. Plausible vs. App Store/Play Console only (P1 backlog #13)
- [ ]  Error tracking: Sentry vs. self-hosted (P0 backlog #6)

### Year 2

- [ ]  Local agent build vs. continue with Claude Code
- [ ]  Schools app: separate codebase vs. shared monorepo
- [ ]  Open source content tool: yes/no

---

## Anti-Patterns / Things to NOT Do

Decided against during planning. Don't revisit without strong reason.

- **Web app as a paid feature** — competitive suicide (Duolingo/Quizlet free)
- **Charging for cloud sync** — market standard is free, charging drives churn
- **Multi-tenant architecture** (one codebase, multiple apps) — creates conditional logic hell. Use clean architecture instead.
- **Subscription pricing for test prep** — misaligned with finite need ("take test once, done")
- **Pure markdown for agent memory** — doesn't scale, no structured search (Gemini/ChatGPT default failure mode)
- **Pure database for agent memory** — vendor lock-in, hard to inspect, fails 20-year horizon
- **Notion as canonical store** — vendor lock-in, proprietary format
- **Vector embeddings now** — premature; BM25 sufficient at current scale
- **TextInput in quiz flows** — banned by [AGENTS.md](http://AGENTS.md) (defeats no-typing UX)
- **Hard-coded secrets in repo** — use .env, then EAS secrets in production
- **Building web app to launch** — mobile-first only, skip web entirely until demand proven
- **Productive/family lexical chunking architecture** — deferred to Year 2. Shipping idioms and phrasal verbs as **flat multi-word entries** in the `words` table is fine; building word-family graphs, productive-pattern models, or collocation-strength scoring is not in scope until data demands it.
- **Mixing ESL learners with American-student vocab in one app** — audience split locked 2026-05-22 (see Decision Log). LexiTap is ESL-only.
- **AI chat / chatbot / conversational AI features at MVP** — WordUp's AI Chat (Lexi + Fantasy Chat) is documented as buggy and unstable; AI features turn into perceived gimmicks when they don't work. Validates LexiTap's no-AI-chatbot stance. Revisit only if a clear retention/conversion lever appears post-launch.
- **Multimedia video contextualization (WordUp-style)** — video clips, historical quotes, expert analysis per word are out of scope for MVP and Year 1. Scaling content production cost super-linearly with vocabulary count blows the budget and competes on WordUp's strongest vector. Year 2 revisit at earliest.
- **SRS without forgiveness mechanics** — a fixed scheduler that dumps a 200-review backlog on a returning user is a churn engine. Phase 1 UX must cap daily reviews + offer soft catch-up + never red-badge guilt the user. Decision locked 2026-05-22 (see Decision Log).

---

## Critical Constraints (Don't Forget)

### Technical

- All quiz interactions must be tap/drag/match (no typing)
- App must work 100% offline (cloud sync is enhancement, not requirement)
- SQLite is source of truth on device
- Supabase is source of truth in cloud (synced from device)
- Spaced repetition intervals: 1, 3, 7, 14, 30 days (don't change without reason)

### Legal/Compliance

- Cannot launch without privacy policy (App Store requirement)
- Cloud sync = processing personal data = GDPR applies for EU users
- Cannot use TOEFL® trademark in misleading way (ETS owns it)
- Audio from ElevenLabs has commercial use license terms

### Business

- Year 1 budget: $144 + ElevenLabs ~$50 + dev tools
- Manual teacher payouts until 20+ active teachers (then automate)
- Minimum revenue triggers for full-time decision: NOT YET DEFINED (backlog #18)

### Architecture

- Domain layer must have ZERO framework dependencies (pure TypeScript)
- Retrieval interface must remain swappable (no SQL leaking into application layer)
- Markdown is canonical memory store — SQLite index is derived/rebuildable

---

## Decision Log

Chronological record of major decisions made during planning. New decisions append here.

### 2026-05-22 — Initial Planning Session

**Decisions made:**

1. ESL-first positioning (not Schools)
2. Freemium with one-time purchase paid tiers
3. Teacher referral network as primary GTM with tiered commissions
4. TOEFL as first paid module
5. Clean/hexagonal architecture for future Schools reusability
6. Supabase as backend (auth + database + edge functions)
7. Promo codes for relationship-based marketing

**Documents created:** 10 initial Notion docs

### 2026-05-22 — Cloud Sync Decision

**Decision:** Cloud sync is FREE for all users (not a paid feature).

**Reasoning:** User raised concern about charging for sync. Validated against market (Duolingo, Quizlet, Anki all free). Critical insight: user export gives word lists ONLY, not progress data. Without sync, device loss = total progress loss = catastrophic churn. Cost ($25/mo at scale) is negligible vs. retention impact.

**Impact:** Phase 1 timeline +1 week (now 6 weeks instead of 5). Supabase tables added (user_accounts, user_progress_sync, user_entitlements_sync, user_stats_sync).

### 2026-05-22 — Name Selection: LexiTap

**Options considered:** LexiCore, LexiTap, TouchLingo

**Decision:** LexiTap with .app domain.

**Reasoning:**

- "Tap" communicates core UX (no typing)
- Easy to pronounce globally ("Lek-see-tap")
- Unique in vocab app space (no major competitor uses "Tap")
- Domain available ([lexitap.app](http://lexitap.app))
- TouchLingo: too generic in saturated "Lingo" space (Duolingo, etc.)
- LexiCore: too cold/technical, doesn't communicate differentiation

**Domain choice:** .app over .com because mobile-first audience accepts it, HTTPS enforced (Google owns .app), and the name + extension align ("[LexiTap.app](http://LexiTap.app)" literally describes what it is).

### 2026-05-22 — Memory Architecture Decision

**Decision:** Markdown files as canonical store + SQLite as rebuildable index. 20-year longevity design with agent-runtime independence.

**Reasoning:** User wants project alive for 20 years. Need: portable formats (markdown survives anything), swappable backends (interfaces), and resilience to agent runtime changes.

**Reality check:** Discussed during this conversation that Claude Code cannot truly sandbox tools — only guide via [CLAUDE.md](http://CLAUDE.md). Accepted soft enforcement now, with migration path to hard enforcement (custom local agent) in ~Year 2.

**Architecture pieces:**

- Markdown files (canonical)
- SQLite + FTS5 (BM25 search, rebuildable)
- Pluggable MemoryRetriever interface
- Capability-based access modes (full/scripts/manual)
- 5-layer defense: [CLAUDE.md](http://CLAUDE.md) + scripts + git hooks + validation + rebuild test

### 2026-05-22 — Planning Backlog Created (40 Items)

**Decision:** Capture all unplanned areas as backlog with explicit triggers. Don't plan everything now (paralysis), don't forget items (drift).

**Reasoning:** Audit revealed product was well-planned but business infrastructure around it was not. 40 items identified across: legal/compliance, security, operations, financial, content, UX, growth, long-term vision, risk/resilience.

**Approach:** Each item has trigger condition. Plan deeply only when trigger fires. First triggers fire Week 2 (IP licensing + secrets management).

### 2026-05-22 — Database Schema v2: Adopted 5 Patterns from External Reference

**Context:** Reviewed a TOEFL-app reference schema from a prior conversation. Most of it was over-scoped for LexiTap (FSRS optimizer, full TOEFL Reading exam tables, morphological word families, synonym-strength graph), but 5 patterns were worth adopting.

**Decisions made:**

1. **Clarified `user_progress` (hot state) vs `quiz_attempts` (immutable log) split.** Added `pre_mastery_level`, `scheduled_review_date`, `scheduler_version` to `quiz_attempts` so future scheduler migration can replay history.
2. **Added `scheduler_version` column to `user_progress`.** Cheap forward-compat tag; default `'v1-fixed'`.
3. **Added local `event_log` table.** Append-only audit / replay log. **Deliberately rejected the async worker pattern** — stats still written synchronously on each event. Right-sized for 1,000-user target; log keeps future migration to async clean.
4. **Added `timezone` column to `user_accounts` (Supabase) + AsyncStorage source-of-truth on device.** Streak boundary logic uses user's IANA tz, not UTC or device-current. Decided: no retroactive re-anchoring on travel (use whatever tz is set at evaluation time).
5. **Added `deleted_at` soft-delete to `words`.** Hard-deletion would break historical `quiz_attempts` rows. Established query convention: active-word queries filter `deleted_at IS NULL`; history queries don't.

**What was explicitly rejected:**

- FSRS scheduler (premature; `scheduler_version` tag makes future swap possible)
- Morphological word families schema (over-modeled for word counts at this scale)
- Synonym-strength junction table (overkill for tap / drag / match distractors)
- TOEFL Reading passage + 9 question-type exam tables (out of vocab-app scope)
- Async worker for `event_log → summary` aggregation (premature at 1,000-user scale)

**Sync surface:** unchanged. `quiz_attempts` and `event_log` are local-only by design — saves bandwidth, no Supabase changes needed beyond `user_accounts.timezone`.

**Documents updated:** Database Schema (Multi-Tier + Paywall) bumped to v2 with full Changelog section.

**Pending follow-up:** [AGENTS.md](http://AGENTS.md) needs query-convention note (`WHERE deleted_at IS NULL` on active-word queries) and the never-mutate rule for `quiz_attempts` / `event_log`.

### 2026-05-22 — Audience Split: LexiTap = ESL-Only, American-Student Vocab = Separate App

**Context:** Strategic-competitive-analysis research (see Competitive Analysis doc, Parts 1-3) surfaced underserved markets and prompted clarification of LexiTap's audience boundary.

**Decision:** LexiTap is exclusively for **non-native English speakers** (global ESL learners). American-student vocabulary (SAT/ACT, K-12 ESL, school-grade vocab) is a **separate product handled in a different conversation** — not a future expansion of LexiTap, not a Year 2 secondary market for this codebase.

**What stays in LexiTap (one codebase, one App Store listing):**

- Foundation + Advanced (free)
- TOEFL, IELTS, Business English, Common 3K, Premium Pass (launch-wave paid)
- GRE, GMAT, Idioms & Expressions, Phrasal Verbs (post-launch content drops — GRE/GMAT both used heavily by ESL grad-school applicants)

**Why this segmentation:** non-native vs. native English speakers are *structurally* different audiences — different language acquisition stage, different content shape (ESL needs everyday usage + audio + accent guidance; American students need rare/etymological vocab and standardized-test mechanics), different motivation, different App Store funnels. Mixing them in one app dilutes both. Splitting *test prep from general ESL* was the wrong cut (rejected: TOEFL/IELTS audience IS general ESL); splitting *non-native from native* is the right cut.

**Deliberately *not* in LexiTap:** SAT, ACT, K-12 grade-level vocab, middle/high-school academic vocabulary. These belong in the separate American-student product.

**Pricing posture — "best bang for the buck":** Premium Pass at $29.99/year covering 8 paid tiers (vs ~$88 individual) is the marketing anchor. Lean into the value, don't raise price through launch. Revisit pricing after 100+ paying users provide conversion data.

**Tier word counts deliberately *not committed*** at this stage. Content sourcing determines actuals; rigid pre-commitment to (e.g.) "TOEFL = 600 words" creates fake constraints. Each tier ships when content is ready and quality-checked, not when an arbitrary count is hit.

**Content sourcing becomes the launch-blocker bottleneck, not code.** New Planning Backlog item #41 added: Content Sourcing Strategy (P0).

**Cross-references:**

- Competitive Analysis doc: 🔎 Competitive Analysis — Vocab App Market 2026
- Tier list: see Quick Reference + Core Product Decisions §2
- Roadmap impact: Phase 4 launch wave + Phase 6 content-drop cadence
- Schema impact: idioms and phrasal verbs use flat multi-word entries in `words` table (no schema change)

### 2026-05-22 — Audio Scope-Out: LexiTap Audio = Reference, NOT Pronunciation Training

**Context:** Competitive Analysis Part 4 (ELSA Speak profile, documented auto-renewal backlash) + ELSA Speak hands-on field note 2026-05-22 (founder bought and evaluated full version; first-person verdict: actual delivered value ~$5 vs. $89-99/yr asking). ELSA Speak owns the pronunciation-training category for ESL learners.

**Decision:** LexiTap audio = **pronunciation reference** — hear the word said correctly, paired with imagery for memorization. Audio attaches to premium tiers where pronunciation is a buyer concern (launch wave: TOEFL; post-launch tiers: re-evaluate per tier ROI).

**Explicitly NOT in scope:**

- Voice recognition for user speech
- Accent correction or grading
- Real-time speech analysis
- "Speak the word and we'll score your pronunciation"
- Any pronunciation-training functionality

**Why:** Pronunciation training is a separate product category with separate audience expectations, separate (expensive) infrastructure (voice recognition at scale), and a dominant incumbent. Entering it would dilute LexiTap's vocab-mastery positioning and stretch scope without a clear win.

**What this means in practice:**

- `audio_path` field in `words` table = recorded pronunciation reference only
- No speech-to-text or speech-analysis libraries in the mobile app
- No microphone permission required
- Audio is play-only on the user side

**If users ask for pronunciation training:** route them to ELSA Speak or similar. Do not build it. Revisit only if data demands it (e.g., >20% of churn cites missing pronunciation training).

**Cross-references:**

- Competitive Analysis Part 4 (ELSA Speak profile)
- Competitive Analysis Field Notes (founder ELSA evaluation 2026-05-22)
- Product Strategy Overview → Competitive Frame → Audio Scope-Out
- Brand Identity → Marketing Pillars (anti-subscription, no-ads)

### 2026-05-22 — Multimedia Contextualization Scope-Out: LexiTap ≠ WordUp on Content Depth

**Context:** Competitive Analysis Part 5 (WordUp positioning) + Part 6 (WordUp feature deep-dive). WordUp's differentiation moat is **deep multimedia contextualization** — surrounding each word with tens of video clips, historical quotes, expert analysis, and AI-generated imagery. This is a years-long content production undertaking at WordUp's 25,000-word scale.

**Decision:** LexiTap MVP and Year 1 contextualization layer = **audio (where applicable) + imagery + curated example sentences**. Each word ships with the context needed to understand meaning, usage, and emotional register — within a contained content production budget.

**Explicitly NOT in scope (Year 1):**

- Video clips per word
- Historical-quote library
- Expert analysis content
- Per-word AI-generated imagery beyond what ImageMatch widget needs
- Anything that scales content production cost super-linearly with vocabulary count

**Why:** Replicating WordUp's multimedia depth would (a) blow the launch budget several times over (against a $144/yr base), (b) push launch out by quarters, (c) compete on a vector where WordUp has years of head start. LexiTap competes on **price + ownership + no-typing UX + offline-first** — not multimedia depth.

**Revisit when:** post-launch revenue covers content production budget for video, OR a clear conversion lift is demonstrated from richer contextualization in beta data. Year 2 territory at earliest.

**Cross-references:**

- Competitive Analysis Part 5 (WordUp strategic differentiation §2)
- Competitive Analysis Part 6 (WordUp feature evaluation — Knowledge Map, SRS, AI Chat)
- Product Strategy Overview → Competitive Frame → Multimedia Contextualization Scope-Out

### 2026-05-22 — SRS Forgiveness Mechanics: Phase 1 UX Must Include

**Context:** Competitive Analysis Part 6 explicitly names **SRS-backlog-as-punishment** as a primary driver of app abandonment. WordUp's fixed scheduler creates an oppressive feel when users return after missed days. LexiTap's fixed 1/3/7/14/30 scheduler will exhibit the **same failure mode** unless the UX explicitly addresses it.

**Decision:** Phase 1 mobile-app build must include SRS forgiveness mechanics. Specific mechanics to be designed (see Planning Backlog #43), but the commitment is locked at the architectural/UX level now.

**Required UX behaviors:**

- **Daily review cap.** Hard ceiling on reviews surfaced per day, even when the algorithm "owes" the user more. Prevents the "200 cards waiting" panic on return.
- **Catch-up mode after missed days.** Re-anchor next-review dates softly rather than dumping the entire backlog at once.
- **No red-badge guilt.** No accumulating notification badge of overdue reviews. No "you've missed N days" shame messaging.
- **Tone:** *"Welcome back. Let's pick up where we left off"* — not *"You have 87 overdue reviews."*

**Why:** A learning app that punishes users for life happening is a learning app that gets uninstalled. The SRS algorithm's mathematical "optimum" is not the user-experience optimum. Cap, soften, and never shame.

**Implementation surface:**

- `quiz_attempts` / `user_progress` schema already supports this (no DDL change needed; logic lives in the scheduler layer + presentation layer)
- [AGENTS.md](http://AGENTS.md) needs a "no red-badge guilt" UX rule alongside the existing no-typing rule

**Cross-references:**

- Competitive Analysis Part 6 §2 (WordUp SRS critique)
- Planning Backlog #43 (SRS Forgiveness Mechanics design)
- [AGENTS.md](http://AGENTS.md) (pending follow-up update)

---

## Immediate Next Actions

### This Week (Week 1, Phase 0)

1. Conduct validation interviews (35 total)
2. Source Foundation word list (800 words)
3. Source TOEFL word list (600 words)
4. Competitive analysis of top 5 vocab apps
5. Review all Notion documentation

### Next Week (Week 2, Phase 1A start)

1. Build content tool (CLI: import, validate, export)
2. **TRIGGER FIRES:** IP licensing review (backlog #4)
3. **TRIGGER FIRES:** Secrets management setup (backlog #5)
4. Set up Supabase project
5. Generate first words.db with Foundation tier

### Week 3

1. Continue content tool
2. Begin mobile app scaffolding
3. **TRIGGER FIRES:** CI/CD pipeline planning (backlog #8)

### Week 4

1. Mobile app screens (Home, Quiz, Progress)
2. **TRIGGER FIRES:** Onboarding flow design (backlog #9)

---

## Context for New Conversations

When starting a fresh Claude conversation:

**Minimum context to share:**

- This Session State document URL or full content
- Current week/phase you're in
- Specific task or question

**Optional but helpful:**

- Link to relevant Notion doc (e.g., "deep dive on Database Schema doc")
- Recent decisions made since this document was last updated

**Conversational style established with user:**

- Direct, honest pushback when ideas are weak
- Validation framework: user need, WTP, build complexity, competitive analysis, strategic fit
- Right-sized scaffolding (not enterprise unless asked)
- Surface ripple effects proactively
- Prefer "buy" over "build" for orchestration
- Flag complexity creep across turns
- No code unless asked — planning mode only

**Working preferences:**

- User wants 20-year project longevity (informs all architecture decisions)
- User considering local agent runtime in ~12 months (informs current trade-offs)
- User does NOT want to use Notion as canonical agent memory (used for human-readable docs only)
- User wants free cloud sync for retention (not for monetization)
- User likes incremental planning with explicit triggers (vs. plan-everything-upfront)

---

## Health Check Status

- **Strategy:** ✅ Complete
- **Technical architecture:** ✅ Complete
- **Brand identity:** ✅ Complete
- **Memory architecture:** ✅ Specified (not implemented)
- **Backlog of unplanned items:** ✅ Captured (40 items)
- **Implementation roadmap:** ✅ Complete
- **Validation plan:** ✅ Complete
- **Database schema:** ✅ v2 (review-log split, event_log, timezone, soft-delete, scheduler_version)
- [**AGENTS.md](http://AGENTS.md) conventions:** ✅ Updated (DB conventions: soft-delete filter, append-only, scheduler versioning, timezone, sync event writes)
- **Word lists sourced:** ❌ Not yet (Week 1 task)
- **Competitive analysis:** 🚧 In Progress (Parts 1-4 captured + ELSA Field Note; Knowji teardown queued as #42)
- **Audience boundary:** ✅ Locked — LexiTap = ESL-only (non-native English speakers)
- **Tier list:** ✅ Expanded (10 tiers: 2 free + 8 paid across launch & post-launch waves)
- **Content sourcing strategy:** 🚧 Tracked as P0 backlog item #41
- **Audio scope:** ✅ Locked — reference only, NOT pronunciation training (explicit scope-out vs. ELSA Speak)
- **Marketing pillars:** ✅ Locked — 5 pillars (own-forever, zero-ads, best-bang-for-the-buck, no-typing, serious-non-native)
- **Competitive frame:** ✅ Updated — WordUp = closest direct competitor on audience; Knowji = closest on paper feature surface; Duolingo explicitly NOT a competitor
- **Multimedia scope:** ✅ Locked — audio + imagery + example sentences only; NOT WordUp-style video / quotes / expert analysis (Year 2 revisit)
- **SRS forgiveness:** ✅ Locked at architectural level — Phase 1 UX must cap reviews + catch-up + no-guilt; specific design as backlog #43
- **Pedagogical scope:** ⚠️ Acknowledged limitation — LexiTap exercises passive recognition only, not active production (no-typing trade-off)
- **Content sourcing philosophy:** ❓ Open Decision — CEFR vs. frequency vs. hybrid (resolves via #41)
- **Onboarding diagnostic:** ❓ Open Decision — adopt endowed-progress pattern in some form (resolves via #45)
- **Validation interviews:** ❌ Not yet (Week 1 task)
- **Code written:** ❌ None yet (Phase 0 = planning only)
- **App Store submitted:** ❌ Week 18 target

---

## Document Versioning

**v1.0 — 2026-05-22**

- Initial Session State document created
- Captures all decisions from initial planning conversation
- Reference point for future conversations

**v1.1 — 2026-05-22 (later same day)**

- Added Decision Log: Database Schema v2 (5 patterns adopted from external reference)
- Added Decision Log: [AGENTS.md](http://AGENTS.md) Database Conventions section
- Database Schema doc (separate page) bumped to v2
- [AGENTS.md](http://AGENTS.md) (separate page) updated with Database Conventions section

**v1.2 — 2026-05-22 (later same day)**

- Removed all GRE/SAT tier-expansion references (decision moved to a separate conversation)
- Added new doc to inventory: 🔎 Competitive Analysis — Vocab App Market 2026 (Part 1: Market Overview captured)

**v1.3 — 2026-05-22 (later same day)**

- Captured Parts 2-3 of Competitive Analysis (AI commoditization + market gaps)
- **Audience-Split decision:** LexiTap = ESL-only; American-student vocab in separate app
- Expanded tier list: GRE, GMAT, Idioms, Phrasal Verbs added as post-launch content drops
- Dropped rigid per-tier word counts (content sourcing determines actuals)
- Anti-Pattern added: productive/family lexical chunking architecture (flat multi-word entries OK)
- Anti-Pattern added: mixing ESL + American-student vocab in one app
- Content Sourcing Strategy added to Planning Backlog as P0 item #41
- Updated docs: Session State, Product Strategy Overview, Implementation Roadmap, Database Schema, Planning Backlog

**v1.4 — 2026-05-22 (later same day)**

- Captured Part 4 of Competitive Analysis (8 competitor profiles + industry monetization)
- Captured founder ELSA Speak hands-on Field Note (verdict: ~$5 felt value vs. $89-99/yr asking)
- **Audio Scope-Out decision:** LexiTap audio = reference, NOT pronunciation training (explicit scope-out vs. ELSA)
- Added Competitive Frame to Product Strategy Overview (direct/non-competitors named, Duolingo deliberately excluded as benchmark)
- Added Marketing Pillars to Brand Identity: own-forever, zero-ads, best-bang-for-the-buck, no-typing
- Updated pricing benchmark in Product Strategy Overview to full ESL/vocab competitor set (Knowji ~$120, ELSA ~$89-99, Memrise ~$90, Babbel ~$168, Duolingo Super ~$84)
- Added Planning Backlog item #42: Knowji Competitive Teardown (P0, trigger MET)
- Softened hard word-count claims in Brand Identity hero + App Store copy (consistency with v1.3 decision)

**Working mode shift (capture-only):** Going forward, research dumps are captured into the appropriate research doc (Competitive Analysis, Field Notes, etc.) without per-turn synthesis into strategy docs. Synthesis happens later in a deliberate extraction pass when the founder signals.

**v1.5 — 2026-05-22 (later same day) — Competitive Analysis Extraction Pass**

- Captured Competitive Analysis Parts 5-6 (WordUp deep-dive: positioning + feature evaluation)
- **Extraction pass performed:** parsed Parts 1-6 + Field Notes of Competitive Analysis doc; distributed actionable findings across strategy docs
- **Multimedia Contextualization Scope-Out decision** (vs. WordUp's video / quote / expert-analysis moat)
- **SRS Forgiveness Mechanics decision** (Phase 1 UX must cap reviews + soft catch-up + no red-badge guilt)
- WordUp added to Competitive Frame as closest direct competitor on audience overlap (Product Strategy Overview)
- Pedagogical Scope acknowledged in Product Strategy Overview: LexiTap exercises passive recognition only; active production is a known limitation of the no-typing UX commitment
- Brand Identity Pillar #2 (Zero Ads) strengthened with Duolingo Super contrast
- New Brand Identity Pillar #5 added: "serious non-native English speakers" positioning sharpener
- Anti-Patterns added: AI chat features at MVP; multimedia video contextualization; SRS without forgiveness mechanics
- Open Decisions added: Content Sourcing Philosophy (CEFR vs. frequency vs. hybrid); Onboarding Diagnostic (endowed-progress pattern adopt?)
- Planning Backlog items #43 (SRS Forgiveness Mechanics design), #44 (WordUp Competitive Teardown), #45 (Onboarding Diagnostic design) added

**Next version trigger:** Any new major decision or new doc added to inventory.

**v1.6 — 2026-05-22 (later same day) — Claude Code Workflow Integration**

- [**AGENTS.md](http://AGENTS.md) updated** with three autonomous agent workflow protocols: Planning Gate (mandatory pre-code adversarial plan challenge), Adversarial Review Protocol (5 LexiTap-specific reviewer personas: Schema, SRS Logic, Content Pipeline, Paywall/IAP, UX/Mobile), and Compound Learning (mandatory post-task [AGENTS.md](http://AGENTS.md) self-update)
- **Planning Backlog expanded to 47 items:** #46 Ship and Watch CI Loop (P1 — autonomous PR + CI fix loop via GitHub Actions), #47 Git Worktrees Two-Track Setup (P0 — Phase 1 Day 1), Firecrawl approved as autonomous content sourcing tool (note added to #41)
- **Implementation Roadmap:** Phase 1 Day 1 infrastructure block added (Git Worktrees + CI + Ship and Watch + [CLAUDE.md](http://CLAUDE.md) + memory system)
- **Pending follow-up resolved:** SRS no-red-badge-guilt rule added via SRS Logic Reviewer persona in [AGENTS.md](http://AGENTS.md); [AGENTS.md](http://AGENTS.md) DB Conventions confirmed in place

**Next version trigger:** Any new major decision or new doc added to inventory.