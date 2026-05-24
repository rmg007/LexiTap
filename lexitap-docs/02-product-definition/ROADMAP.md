---
title: Product Roadmap
category: product
status: active
updated: 2026-05-24
priority: P0
tags: [roadmap, phases, milestones, two-track, content-cadence, gates]
---

# Product Roadmap — LexiTap

The detailed product roadmap: 6 phases across 21 weeks, two parallel build tracks, deliverables and gates per phase, and the post-launch content-drop cadence. This doc expands the at-a-glance tracker [../../ROADMAP.md](../../ROADMAP.md). Feature detail is in [FEATURE_BACKLOG.md](./FEATURE_BACKLOG.md); requirements in [PRODUCT_REQUIREMENTS_DOCUMENT.md](./PRODUCT_REQUIREMENTS_DOCUMENT.md).

## Table of Contents

- [Two-Track Build Model](#two-track-build-model)
- [Phase 0: Validation](#phase-0-validation-week-1)
- [Phase 1: Build](#phase-1-build-weeks-26)
- [Phase 2: User Validation](#phase-2-user-validation-weeks-710)
- [Phase 3: First Paid Tier](#phase-3-first-paid-tier-weeks-1112)
- [Phase 4: Launch Wave Tiers](#phase-4-launch-wave-tiers-weeks-1216)
- [Phase 5: Launch Prep](#phase-5-launch-prep-weeks-1718)
- [Phase 6: Growth and Content Drops](#phase-6-growth-and-content-drops-week-19)
- [Content-Drop Cadence](#content-drop-cadence)
- [Kill Criteria](#kill-criteria)
- [Phase 1 Blockers](#phase-1-blockers)

## Two-Track Build Model

Two independent Git worktrees run in parallel from Phase 1, each with its own Claude Code instance:

- **Track A — Content Tool (CLI):** Node.js + TypeScript + SQLite. Ingests raw word lists, runs the stage-gated enrichment pipeline (ingest → enrich → human review → resource generation → resource review → publish), and produces `words.db`. Must lead Track B because the mobile app bundles the DB. Sourcing is resolved (backlog #41); the work is enrichment-only.
- **Track B — Mobile App (React Native / Expo):** the LexiTap app — screens, widgets, SRS, sync, accounts.

Content is the launch-blocking long pole, not code. Each tier's drop date is gated by its enrichment path (word list → examples → QA → audio for premium → publish).

## Phase 0: Validation (Week 1)

**Goal:** validate assumptions before writing code.
- Interview 10 parents, 5 high schoolers; survey 20 TOEFL test-takers.
- Source Foundation (top 3,000) and TOEFL (~3,000) word lists.
- Resolve the 3 Phase 1 blockers (see [below](#phase-1-blockers)).
- **Gate:** 7/10 parents say yes to free download + 3/5 juniors say maybe/yes to paid. Otherwise stop.

## Phase 1: Build (Weeks 2–6)

**Day 1 setup (before any application code):** Git repo + two-track worktrees, GitHub Actions CI (ESLint + TS), Ship-and-Watch loop, `CLAUDE.md`, memory dirs, EAS Build.

**Track A (Weeks 2–3):** CLI `import` / `validate` / `export`; CSV + XLSX + plain-text parsers; SQLite export; `npm run build:db` → Foundation tier DB.

**Track B (Weeks 2–6, +1 week for cloud sync):** Expo + TS setup; Supabase auth + DB; account creation (email + Google); load bundled `words.db`; background cloud sync; Home/Quiz/Progress/Settings; MultipleChoice + DragDrop; hooks `useSpacedRepetition` / `useMastery` / `useQuizSession` / `useSync`; streak counter; SRS forgiveness layer.

**Deliverable:** working iOS + Android app, free Foundation tier, free cloud sync.
**Gate:** app runs on both platforms.

## Phase 2: User Validation (Weeks 7–10)

**Goal:** 50 beta testers (TestFlight + Google Play Internal); measure retention; test cloud sync via device switch. No coding.
**Gate:** D7 > 30% → proceed. 20–30% → fix core loop. < 20% → product broken, pivot/kill.

## Phase 3: First Paid Tier (Weeks 11–12)

**Track A:** enrich TOEFL with premium audio (ElevenLabs).
**Track B:** paywall, Apple/Google IAP, entitlements (Supabase), teacher referral code validation, promo codes, restore purchases. Early-adopter intro price ($11.99 vs $14.99 list).
**Gate:** 10 paying users (rethink if < 5 at Week 12).

## Phase 4: Launch Wave Tiers (Weeks 12–16)

**Track A:** source + import IELTS, Business English, Common 3000; export `words.db` (6 tiers).
**Track B:** add IAP products, update paywall, Premium Pass logic, ImageMatch + Classification widgets, UX polish.
**Gate:** $1,000/month revenue.

## Phase 5: Launch Prep (Weeks 17–18)

App Store assets (icon, 6 screenshots, description), privacy policy + ToS, support email, launch lexitap.app, deploy teacher referral portal, Apple ($99/yr) + Google ($25 one-time) submission.
**Deliverable:** live on both stores.

## Phase 6: Growth and Content Drops (Week 19+)

Activate teacher network, Reddit presence, ASO, content marketing. Ship post-launch paid tiers on a monthly cadence.
**Gate:** 1,000 users.

## Content-Drop Cadence

Target schedule (order may shift on conversion data). Premium Pass holders get each drop free automatically.

| Week | Tier | Price |
| --- | --- | --- |
| 22 | GRE Vocabulary | $14.99 |
| 26 | GMAT Vocabulary | $14.99 |
| 30 | Idioms & Expressions | $9.99 |
| 34 | Phrasal Verbs | $9.99 |

Each drop: sourced list → example sentences → QA → (audio for premium) → IAP product configured → paywall/UI updated → ship via app update + Premium Pass auto-unlock.

## Kill Criteria

| Point | Condition | Action |
| --- | --- | --- |
| Week 1 | Validation interviews fail | Stop — pivot or kill |
| Week 10 | D7 retention < 20% | Product broken — pivot/kill |
| Week 12 | < 5 paying users | Pivot to B2B or rethink pricing |
| Week 20 | < 100 users acquired | Rethink GTM, invest in teacher network |

## Phase 1 Blockers

Must be resolved before any Phase 1 code:

- **Backlog #43 — SRS Forgiveness Mechanics design** (blocks all scheduler/SRS code) — resolved; design specified in [SRS_FORGIVENESS_MECHANICS.md](./SRS_FORGIVENESS_MECHANICS.md).
- **Backlog #41 — Content Sourcing Strategy** (blocks Track A) — resolved 2026-05-23.
- **Backlog #42 — Knowji competitive teardown** (blocks Brand Identity finalization) — research-based teardown complete; first-person hands-on still outstanding.
