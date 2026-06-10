---
title: Product Roadmap
category: product
status: active
updated: 2026-06-09
priority: P0
tags: [roadmap, phases, milestones, two-track, content-cadence, gates]
---

# Product Roadmap — LexiTap

> **⚠️ SOURCE OF TRUTH:** [../../plans/RELEASE_PLAN.md](../../plans/RELEASE_PLAN.md) is the current, task-level execution plan (updated 2026-05-31). This file mirrors the phase structure and status for quick reference; **consult RELEASE_PLAN.md for actual dependencies, current blockers, and revised task list** (e.g., auth in P3 not P5, content as the long pole, Phase 2 requires analytics instrumentation, per-table sync deleted). Updates below reconcile this file with the audit.

## 🔴 Active Front (2026-06-10)

**Shipped since 2026-05-31:** Figma 100% finalized (10 pages gate=PASS, 20-component library, 40-glyph icon set, WCAG-AA contrast). **Rich Word-Detail model** (felt explanation + teaching examples; additive, zero SRS ripple): Phase 1 schema, Phase 3 mobile read layer, Phase 4 multi-sense UI, **Phase 1 content-tool synthesis + pre-write validation (CONTENT-1 ✅)** all DONE + green (165 / 474 tests). Phase 2 paid enrichment is Ryan's next task. Plan: [../../plans/RICH_WORD_DETAIL_PLAN.md](../../plans/RICH_WORD_DETAIL_PLAN.md).

**✅ Learn-loop wired (2026-06-09, `8fab926`):** LearnCardScreen hands batch to `/learn-check` (SRS seeding step). 474 tests green. **✅ RTL harness + Maestro learn-loop flow (E2E-1) both landed (2026-06-10).** Issue [#10](https://github.com/rmg007/LexiTap/issues/10) closed.

**✅ 16+ age gate complete (LEGAL-2, 2026-06-10):** AsyncStorage persistence, permanent dead-end rejection screen, 5 render tests. 474 tests green.

**✅ expo-doctor clean (STORE-3, 2026-06-10):** 16/18 checks pass; metro@0.84.4 benign; `.expo/` untracked. No SDK bump needed pre-launch.

**▶ Next, in order:** (1) **C0 on-device smoke (Ryan — THE GATE):** `eas build --platform ios --profile preview`, install on device, tap through learn flow, confirm Quick check appears, confirm `srs_state` row written — only this proves native+DB+SRS; unblocks all of Phase 3+. (2) **Phase 2 paid enrichment run (Ryan):** CONTENT-1 ✅ done; CONTENT-2 now `ready` — top-N by frequency, top-tier model.

**Tracked, lower priority:** ~11 Dependabot alerts remaining — transitive Expo-build-tooling (accepted until SDK bump); standing launch blockers (physical-device C0 test, fresh EAS build, P-2 beta recruitment, AU2/AU3 native sign-in).

The detailed product roadmap: 6 phases across 21 weeks, two parallel build tracks, deliverables and gates per phase, and the post-launch content-drop cadence. This doc expands the at-a-glance tracker [../../ROADMAP.md](../../ROADMAP.md). Feature detail is in [FEATURE_BACKLOG.md](./FEATURE_BACKLOG.md); requirements in [PRODUCT_REQUIREMENTS_DOCUMENT.md](./PRODUCT_REQUIREMENTS_DOCUMENT.md).

## Current Status

| Item | Value |
|------|-------|
| Phase | **1 — Build** (active; ~30% to launch — see [../../plans/RELEASE_PLAN.md](../../plans/RELEASE_PLAN.md)) |
| Code written | Track A CLI exists; content is Foundation ~2,848/3,000 sourced (2,881 words / 2,894 memberships across 9 tiers; TOEFL + exam tiers still stubs). Track B domain logic done + tested (quiz loop, SRS, mastery, streak, 2 widgets, DB) + rich word-detail read layer + multi-sense UI (459 tests). **Fixed 2026-05-30:** words.db device delivery, `tiers.ts` model, Jest harness. Per-table sync deleted; auth is a **Phase 3** dependency. Learn loop wired end-to-end (card → quick-check → SRS) as of 2026-06-09. |
| Last updated | 2026-06-09 (see Active Front above) |

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

## Phase 0: Validation (Week 1) — COMPLETE

**Goal:** validate assumptions before making further launch-scope commitments.
- Survey 20 TOEFL/IELTS test-takers (recruit via r/TOEFL, r/IELTS, APAC ESL Facebook groups); cold-email 5 cram school directors (LinkedIn/Naver/KakaoTalk communities) with a B2B beta pitch.
- Source Foundation (top 3,000) and TOEFL (~3,000) word lists.
- Resolve the 3 Phase 1 blockers (see [below](#phase-1-blockers)).
- **Gate:** 10/20 test-takers say they would install the free app AND 3/5 cram school directors respond positively to a B2B pilot pitch. Otherwise pivot GTM or stop.
- **Status:** All Phase 0 items complete. Word lists sourced; all 3 blockers resolved; validation complete.

> **Audience note:** LexiTap targets adult ESL learners (non-native English speakers), not native-speaking K-12 buyer personas. All validation must use the actual audience. See [../01-discovery-strategy/TARGET_USER_PERSONAS.md](../01-discovery-strategy/TARGET_USER_PERSONAS.md).

## Phase 1: Build (Weeks 2–6) — IN PROGRESS (~30%)

**Baseline setup:** Git repo ✔; `CLAUDE.md` ✔; memory dirs ✔; GitHub Actions CI ☐; Ship-and-Watch loop ☐; Git worktrees (single repo used in practice) ☐; EAS Build ☐.

**Track A (Weeks 2–3) — COMPLETE:** CLI `import` / `validate` / `export` ✔; CSV + SQLite export ✔; `npm run build:db` ✔. Foundation tier DB (2,848/3,000 words sourced; 2,881 total / 2,894 memberships; enrichment is the long pole) ☐.

**Track B (Weeks 2–6) — IN PROGRESS:** Expo + TS setup ✔; bundled `words.db` delivery (asset bundle + version-gated copy before ATTACH) ✔ *(fixed 2026-05-30; proven on iOS simulator 2026-05-31; physical device verification pending)*; Home/Quiz/Progress/Settings screens ✔ *(Home progress wired; onboarding steps 2/4/5 done, full flow complete)*; MultipleChoice + DragDrop widgets ✔; SRS scheduling, mastery, quiz session as use-case/service layer ✔ (hexagonal); streak counter ✔. Per-table cloud sync removed 2026-05-28; encrypted blob backup → **Phase 3** (needs auth). **Auth (magic-link + Google + SIWA) → Phase 3**, not Phase 5.

**Deliverable:** working iOS + Android app, free Foundation tier.
**Gate:** cold-launches on real devices, loads real Foundation words, completes onboarding→quiz→progress, emits retention events. **(See [../../plans/RELEASE_PLAN.md §3](../../plans/RELEASE_PLAN.md#3-corrected-phase-structure) for task-level current state.)**

## Phase 2: User Validation (Weeks 7–10)

**Goal:** 50 beta testers (TestFlight + Google Play Internal); measure retention (via PostHog analytics dashboard); **analytics + Sentry instrumentation required** (not "no coding"). ~~Test cloud sync via device switch~~ (sync deleted 2026-05-28; deferred to Phase 3).
**Gate:** D7 > 30% → proceed. 20–30% → fix core loop. < 20% → product broken, pivot/kill. **(See [../../plans/RELEASE_PLAN.md §E](../../plans/RELEASE_PLAN.md#e-instrumentation-beta-distribution--quality-gates) for instrumentation detail.)**

## Phase 3: First Paid Pack (Weeks 11–12)

**Monetization: one-time exam packs, no subscriptions.** See [../08-financial-legal/REVENUE_MODEL_PRICING.md](../08-financial-legal/REVENUE_MODEL_PRICING.md).

**Track A:** universal word+sentence audio on all content via **neural TTS (Polly/Google, ~$10)** — not ElevenLabs.
**Track B:** leave Expo Go (EAS dev client) → paywall (one-time **exam packs $9.99 + All-Exams bundle $29.99 + gated upgrade SKUs**), Apple/Google IAP via RevenueCat (non-consumables only; `exam_*` + `all_exams` entitlements), restore purchases; **auth here (magic-link + Google + SIWA)**; encrypted blob backup wired to the authenticated user id. **B2B deferred** (build nothing; entitlement door left open).

**Gate:** 10 paying customers (rethink if < 5 at Week 12).

## Phase 4: Launch Wave Packs (Weeks 12–16)

**Track A:** source + import IELTS, Business English, GRE, GMAT exam packs (paid); export `words.db` (free frequency/CEFR categories + paid exam packs). *Most Common 3000/9000 are free, shipped at launch.*
**Track B:** add exam-pack IAP products, update paywall + bundle attach, ImageMatch + Classification widgets, UX polish.
**Gate:** $1,000 cumulative pack/bundle revenue (one-time).

## Phase 5: Launch Prep (Weeks 17–18)

**Auth ships in Phase 3, not here** (magic-link + Google + Sign in with Apple via Supabase; SIWA required by Guideline 4.8 whenever Google Sign-In is offered; encrypted backup wired to the authenticated user id there too). Phase 5 adds only the launch-gating legal code: **account deletion + data export (Apple 5.1.1(v), required once accounts exist) and a 16+ age gate.**

App Store assets (icon, 6 screenshots, description), privacy policy + ToS, support email, launch lexitap.app, run `npx expo-doctor` and evaluate SDK upgrade requirements, Apple ($99/yr) + Google ($25 one-time) submission. Teacher referral portal deferred to Phase 3+.
**Deliverable:** live on both stores.

## Phase 6: Growth and Content Drops (Week 19+)

Reddit presence, ASO, content marketing. Ship post-launch paid packs on a monthly cadence. (Teacher network deferred with B2B.)
**Gate:** 1,000 users.

## Content-Drop Cadence

Target schedule (order may shift on conversion data). All-Exams bundle holders get each new **exam pack** free automatically (bundle covers future exams).

| Week | Pack | Monetization |
| --- | --- | --- |
| 22 | GRE | Exam pack ($9.99); in All-Exams bundle |
| 26 | GMAT | Exam pack ($9.99); in All-Exams bundle |
| 30 | Idioms & Expressions | One-time content pack — pricing TBD (not an exam; not in bundle) |
| 34 | Phrasal Verbs | One-time content pack — pricing TBD (not an exam; not in bundle) |

Each drop: sourced list → example sentences → QA → audio → paywall/UI updated → ship via store build (IAP products are not OTA-updatable). Exam packs auto-unlock for `all_exams` holders; non-exam packs are sold as separate one-time products.

## Kill Criteria

| Point | Condition | Action |
| --- | --- | --- |
| Week 1 | Validation interviews fail | Stop — pivot or kill |
| Week 10 | D7 retention < 20% | Product broken — pivot/kill |
| Week 12 | < 5 paying customers (pack/bundle) | Restructure pricing or rethink paid content |
| Week 20 | < 100 users acquired | Rethink GTM |

## Phase 1 Blockers

Must be resolved before Phase 1 is treated as ready to continue:

- **Backlog #43 — SRS Forgiveness Mechanics design** (blocks all scheduler/SRS code) — resolved; design specified in [SRS_FORGIVENESS_MECHANICS.md](./SRS_FORGIVENESS_MECHANICS.md).
- **Backlog #41 — Content Sourcing Strategy** (blocks Track A) — resolved 2026-05-23.
- **Backlog #42 — Knowji competitive teardown** (blocks Brand Identity finalization) — resolved by desk research; first-person hands-on is impossible due to store-access limitations on the deprecated competitive app. Brand identity finalization tasks are moved to a post-validation branding milestone. All Phase 1 blockers are now fully closed.
