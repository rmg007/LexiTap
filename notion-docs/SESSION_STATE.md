# Session State - LexiTap

---
title: Session State - LexiTap (Active)
category: strategy
status: active
phase: 0
priority: P0
updated: 2026-05-24
load_order: 1
tags: [session-state, decisions, anti-patterns, next-actions, tiers, audience, gamification, workflow]
---

> Load order: 1 of 14. LOAD THIS FIRST. No need to load other docs unless a specific one is needed. Previous session archived in SESSION_STATE_V1_HISTORICAL.md.

**Role:** Starting point for every new Claude conversation about LexiTap. Load this doc first. It tells you where things stand, what's decided, what's open, and what to do next.

**Previous session:** 2026-05-22 (Session State v1 — archived). Full decision history lives there.

**Last updated:** 2026-05-22 — v2.0

---

## Project Snapshot

| **Item** | **Value** |
| --- | --- |
| Product name | LexiTap |
| Stage | Phase 0 — Validation (Week 1) |
| Code written | ❌ None yet |
| Stack | React Native (Expo) + TypeScript + SQLite (local) + Supabase (cloud) |
| Platform | iOS + Android (mobile-first; no web at launch) |
| Target audience | Global ESL learners — non-native English speakers ONLY |
| NOT targeting | American students (SAT/ACT/K-12) — separate product, separate chat |
| Primary GTM | Teacher referral network |
| Year 1 budget | ~$144 |
| Year 1 revenue projection | $3,600 (conservative) |
| Solo founder | Yes — all decisions flow through founder |

---

## Tiers at a Glance

**Free (launch):** Foundation (top 3,000 most-used words) · Advanced (words 3,001–9,000)

**Paid — Launch Wave:** TOEFL $14.99 (with audio) · IELTS $14.99 · Business English $9.99 · Common 3,000 $2.99 · Premium Pass $29.99/yr (unlocks all paid tiers, current + future; price locked through launch)

**Paid — Post-Launch Content Drops (Week 22+):** GRE $14.99 · GMAT $14.99 · Idioms & Expressions $9.99 · Phrasal Verbs $9.99

⚠️ **Word counts deliberately not committed in marketing copy.** Internal counts known (3,000 Foundation; 6,000 Advanced; 3,000 TOEFL) but enrichment may filter some words; tier names are the durable external claims.

---

## Session v1 Summary (2026-05-22)

One-day planning session that locked core product strategy and captured extensive competitive research.

**Decisions made:** Audience split (ESL-only; American-student app is separate) · 10-tier structure (launch wave + monthly post-launch drops) · Word count commitments dropped · Audio = reference only, not training · Multimedia scope-out (not WordUp-style video) · SRS Forgiveness Mechanics locked · No AI chatbot at MVP · Lexical chunking productive models deferred to Year 2

**Research captured:** Competitive Analysis Parts 1-6 — market sizing, AI commoditization, market gaps, 8 competitor profiles, WordUp deep-dive positioning + feature evaluation · ELSA Speak hands-on Field Note (founder bought and evaluated; verdict: ~$5 felt value vs. $89-99/yr asking) · Extraction Pass 1 distributed findings across all strategy docs

**Agent workflow protocols added to [AGENTS_MOBILE_CONVENTIONS.md](./AGENTS_MOBILE_CONVENTIONS.md):** Planning Gate (mandatory adversarial plan challenge before any code) · Adversarial Review Protocol (5 reviewer personas: Schema, SRS Logic, Content Pipeline, Paywall/IAP, UX/Mobile) · Compound Learning (mandatory post-task [AGENTS_MOBILE_CONVENTIONS.md](./AGENTS_MOBILE_CONVENTIONS.md) self-update)

**Infrastructure planned:** Git Worktrees two-track setup (Phase 1 Day 1) · Ship and Watch CI loop (GitHub Actions, autonomous PR + fix loop) · Firecrawl approved as autonomous content sourcing tool

---

## Notion Documentation Hub — 13 Docs

| **Doc** | **Status** | **Key content** |
| --- | --- | --- |
| 🏗️ PROJECT OVERVIEW — Start Here | ✅ Current | Master decisions doc |
| 📋 Product Strategy Overview | ✅ Current | Tiers, pricing, GTM, Competitive Frame, Audio/Multimedia Scope-Outs, Pedagogical Scope |
| 📅 Implementation Roadmap | ✅ Current | 21-week timeline, Phase 1 Day 1 setup block, content-drop cadence (Week 22/26/30/34) |
| 📋 Planning Backlog — 47 Items | ✅ Current | 47 items; 5 triggers MET (#41 Content Sourcing, #42 Knowji, #43 SRS Forgiveness, #44 WordUp, #47 Worktrees) |
| 🔎 Competitive Analysis — Vocab App Market 2026 | 🚧 In Progress | Parts 1-6 + ELSA Field Note + Extraction audit; more parts incoming |
| 📊 Database Schema (Multi-Tier + Paywall) | ✅ v2.1 | 10-tier schema, soft-delete, append-only, multi-word entry rules |
| ⚙️ Content Pipeline Architecture | 📋 Referenced | Content tool CLI spec (Track A) |
| 🌐 Website + Teacher Referral System | 📋 Referenced | GTM landing page + referral tracking |
| 🎉 Brand Identity — LexiTap | ✅ Current | 5 Marketing Pillars, Brand Guidelines, App Store copy |
| 🤖 [AGENTS_MOBILE_CONVENTIONS.md](./AGENTS_MOBILE_CONVENTIONS.md) — Mobile App Conventions | ✅ Current | Stack, DB conventions, 7-item task checklist, 5-persona Adversarial Review Protocol, Compound Learning |
| 🏛️ Architecture — Clean & Domain-Driven | 📋 Referenced | Hexagonal architecture spec |
| 🧠 Memory & Documentation Architecture | ✅ Specified (not built) | Markdown + SQLite memory system, 20-year design; build starts Phase 1 Week 1 |
| 📁 Session State v1 (2026-05-22) | 🗄️ Archived | Full decision history v1.0–v1.6; read for historical context only |
| 📁 Session State v2 — this doc | ✅ Active | Current state handoff for all new conversations |

---

## Open Decisions — Needs Founder Input

**✅ RESOLVED 2026-05-23: Frequency-based.** Founder already has the corpora: top 3,000 most-used words (Foundation), top 9,000 most-used words (Advanced), and 3,000 TOEFL words (TOEFL tier). Content pipeline work = enrichment only (definitions, audio, imagery, example sentences). No scraping or CEFR word list licensing required. Unblocks Backlog #41.

### 2. Onboarding Diagnostic with Endowed-Progress Pattern

Should LexiTap adopt a WordUp-style "I know / Test me / Learn" diagnostic onboarding?

- **Yes:** Powerful D1 retention boost via *endowed progress effect* (users see they already know X words)
- **No:** Keep simpler CEFR self-assessment (faster, less friction, less engineering)
- **✅ RESOLVED 2026-05-23:** Simplified adaptive diagnostic at MVP. Self-segmentation screen → adaptive Yes/No quiz (correct = harder, wrong = easier) → 2–3 pseudo-words for overclaiming detection → SE-based early exit (~10–25 questions) → Knowledge Map reveal. Full IRT deferred post-launch. Unblocks Backlog #45.
- **Research complete (Part 11 — 2026-05-23):** Full methodology now specified in Backlog #45. Design is clear: self-segmentation screen → CAT adaptive quiz → Yes/No + pseudo-words (Signal Detection) → SE-based stopping rules → Knowledge Map reveal. One fork remains: **full IRT vs. simplified adaptive at MVP.** Recommendation: simplified adaptive (Option B) delivers ~80% accuracy at a fraction of the engineering cost; revisit full IRT post-launch.
- **Resolves via:** Backlog #45 — founder decision needed on IRT vs. simplified adaptive only

---

## Immediate Next Actions — Priority Order

**🔴 P0 NOW (Week 1 — triggers met, some blocking):**

1. Decide Content Sourcing Philosophy (open decision → unblocks Backlog #41)
2. Decide Onboarding Diagnostic (open decision → unblocks Backlog #45)
3. Plan Backlog #41 — Content Sourcing Strategy (blocks Week 2-3 content tool build)
4. Plan Backlog #43 — SRS Forgiveness Mechanics design (required before Phase 1B scheduler code)
5. Execute Backlog #42 — Knowji competitive teardown (~$10 + 4-6 hrs; blocks Brand Identity finalization)
6. Execute Backlog #44 — WordUp competitive teardown (blocks Brand Identity finalization)
7. Run validation interviews — 35 total (10 parents, 5 high schoolers, 20 TOEFL test-takers); Phase 0 gate criterion

**🔴 P0 Week 2 (triggers firing soon):**

1. Plan Backlog #4 — IP / Content Licensing (before content tool build)
2. Plan Backlog #5 — Secrets Management (before any API integration)

**🟠 P1 Phase 1 Day 1 (first day of build, agent handles autonomously):**

1. Git Worktrees two-track setup (#47 — Track A: content CLI, Track B: mobile MVP)
2. GitHub repo + CI pipeline + Ship and Watch loop (#46 + #8)
3. Create [CLAUDE.md](../CLAUDE.md) with agent instructions
4. Initialize memory system directory structure (`memory/`, `docs/`, `plans/`)

---

## Key Decisions Locked — Quick Reference

| **Decision** | **Value** |
| --- | --- |
| Target audience | Global ESL learners ONLY (non-native English speakers) |
| American-student vocab | Separate product — not LexiTap, not this chat |
| Tier count | 10 tiers: 2 free + 8 paid (launch wave + post-launch drops) |
| Word count commitments | None — content sourcing determines actuals |
| Premium Pass pricing | $29.99/yr locked through launch; revisit after 100+ paying users |
| Audio | Pronunciation reference ONLY — not training (ELSA Speak's lane) |
| Multimedia contextualization | Audio + imagery + example sentences ONLY — not WordUp-style video/quotes/expert analysis (Year 2 revisit) |
| SRS Forgiveness Mechanics | Daily review cap + soft catch-up + no red-badge guilt — locked at architecture level; Backlog #43 for design |
| AI chatbot | Not in scope at MVP or Year 1 |
| Lexical chunking | Flat multi-word entries OK; productive/family models deferred to Year 2 |
| Closest competitor | WordUp (audience) · Knowji (feature surface) — NOT Duolingo (different audience) |
| Localization | English-only UI + App Store listing; ASO localization deferred (cost-prohibitive) |
| Gamification | Streak counter (non-negotiable — confirmed 2026-05-23; "did you show up today?" = streak maintained; no time/word-count target) + streak freeze mechanism (design in Backlog #43 — prevents habit-breaking guilt on missed days) + progress visualization; NOT Duolingo-clone (no hearts/leagues) |
| Pedagogical scope | Passive recognition only (no active production — deliberate no-typing trade-off) |
| Agent workflow | Planning Gate + 5-persona Adversarial Review + Compound Learning — all in [AGENTS_MOBILE_CONVENTIONS.md](./AGENTS_MOBILE_CONVENTIONS.md) |
| Autonomous constraint | If it requires the founder to type a command or remember something, don't implement it |
| Two-folder doc architecture | `notion-docs/` (14 agent-handoff docs) + `lexitap-docs/` (full research, ~40-50 files across 8 categories) — strictly separate, never mixed. Decided 2026-05-24. |
| Doc conventions | YAML frontmatter (title, category, status, phase, priority, updated, load_order, tags) + relative links + emoji-free headings + ToC on files >300 lines. Finalized 2026-05-24. |
| Phase 1 blockers | Three items must be done before Phase 1 code starts: Backlog #41 (Content Sourcing), #43 (SRS Forgiveness design), #42 (Knowji teardown). All others are Phase 1 execution. |

---

## Brain Dump Extraction Status

Tracks what has been extracted from each doc into structured strategy docs. Nothing is considered "used" until it appears in this table as `complete`.

| Doc | Extraction Status | Notes |
|-----|-------------------|-------|
| SESSION_STATE.md | — | This doc IS the extraction index |
| PROJECT_OVERVIEW.md | `complete` | Master decisions + implementation checklist fully processed |
| PRODUCT_STRATEGY.md | `complete` | Tiers, pricing, GTM, audio/multimedia scope-outs, pedagogical scope extracted |
| IMPLEMENTATION_ROADMAP.md | `complete` | 21-week timeline, Phase 1 Day 1 setup, content-drop cadence extracted |
| PLANNING_BACKLOG.md | `complete` | 47 items captured; 5 triggers met and marked |
| COMPETITIVE_ANALYSIS.md | `partial` | Parts 1-6 + ELSA Field Note extracted. Parts 7-11+ pending. Knowji (#42) and WordUp (#44) teardowns not yet captured. |
| DATABASE_SCHEMA.md | `complete` | v2.1 schema, soft-delete, append-only, multi-word entry rules extracted |
| CONTENT_PIPELINE_ARCHITECTURE.md | `referenced` | CLI spec referenced but not deeply extracted into execution plan yet |
| WEBSITE_TEACHER_REFERRAL.md | `referenced` | GTM landing page + referral tracking referenced; no deep extraction pass done |
| BRAND_IDENTITY.md | `complete` | 5 Marketing Pillars, brand guidelines, App Store copy extracted |
| AGENTS_MOBILE_CONVENTIONS.md | `complete` | 7-item task checklist, 5-persona Adversarial Review, Compound Learning extracted |
| ARCHITECTURE.md | `referenced` | Hexagonal architecture spec referenced; no deep extraction pass done |
| MEMORY_DOCUMENTATION_ARCHITECTURE.md | `planned` | Not yet built — nothing to extract |
| SESSION_STATE_V1_HISTORICAL.md | `archived` | Historical only — do not extract unless researching v1 decisions |

**Status tokens:** `complete` = fully processed · `partial` = some sections done, some pending · `referenced` = linked but no extraction pass done · `planned` = not yet built · `archived` = do not extract

**Pending extraction work:**
- COMPETITIVE_ANALYSIS.md Parts 7-11+ (when founder says "extract")
- CONTENT_PIPELINE_ARCHITECTURE.md — deep extraction pass before Track A build starts
- WEBSITE_TEACHER_REFERRAL.md — deep extraction pass before teacher referral build starts
- ARCHITECTURE.md — deep extraction pass before Phase 1 architecture work starts

---

## Anti-Patterns — What NOT to Do

- **TextInput in quiz flows** — banned; defeats no-typing UX
- **Hard-coded secrets** — .env in dev, EAS secrets in production
- **Building web app to launch** — mobile-first only
- **Productive/family lexical chunking architecture** — flat multi-word entries OK; word-family graphs deferred to Year 2
- **Mixing ESL + American-student vocab** — audience split locked
- **AI chat/chatbot/conversational AI at MVP** — WordUp's instability validates the out
- **Multimedia video contextualization at MVP** — WordUp's moat; LexiTap's lane is price + ownership + UX
- **SRS without forgiveness mechanics** — backlog-as-punishment drives abandonment; cap + catch-up + no guilt is required before Phase 1 ships
- **Committing to specific word counts** — content sourcing determines actuals
- **Comparing to Duolingo in marketing** — different audience; Duolingo is a retention reference, not a competitor

---

## Sister Apps in Pipeline (noted 2026-05-23)

After LexiTap ships and is stable, two additional apps are planned under the same content pipeline + schema architecture:

**App 2 — USA Schools & Tests**

Target audience: American K-12 students, SAT/ACT/AP prep, native English speakers expanding academic vocabulary. Content: Common Core-aligned word lists, SAT/ACT high-frequency vocabulary, AP exam vocabulary. Audience explicitly separated from LexiTap per the 2026-05-22 audience-split decision.

**App 3 — Europe CEFR**

Target audience: European ESL learners following the CEFR framework (A1–C2). Content: CEFR-aligned vocabulary lists with explicit level labeling. Potentially stronger B2B angle (language schools, EU educational institutions).

**Architectural implication:** LexiTap’s content pipeline (Backlog #41), database schema, and enrichment workflow should be designed to be **app-agnostic from day one** — parameterized by app ID and tier slug, not hardcoded for LexiTap. The editorial workflow, audio generation, and image pipeline are identical across all three apps. This is not a scope change for LexiTap Phase 1; it is a constraint that prevents throwaway architecture.

**Timeline:** App 2 and App 3 are post-LexiTap-stability projects. Do not plan in detail until LexiTap reaches Phase 4 revenue targets.

- **Start of chat:** Load this doc. No need to re-read all 14 docs unless a specific one is needed.
- **Research dumps:** Capture-only mode — file into Competitive Analysis doc; no synthesis until founder says "extract"
- **Execution:** When founder says "push" or "push to notion," execute all pending doc updates immediately
- **Synthesis:** When founder says "extract," run a full extraction pass and distribute findings across strategy docs
- **Autonomous only:** If it requires founder to type a command or remember something, make it autonomous or skip it
- **Right-sized:** Default to minimum scaffolding; ask for enterprise rigor explicitly
- **Ripple effects:** Surface system-wide impact before executing, even if not asked
- **Premise critique:** Push back on weak framing; proceed directly when framing is settled