---
title: Product Roadmap
category: product
status: active
updated: 2026-07-04
priority: P0
tags: [roadmap, phases, milestones, two-track, content-cadence, gates]
---

# Product Roadmap — LexiTap

> **⚠️ SOURCE OF TRUTH:** [../../plans/RELEASE_PLAN.md](../../plans/RELEASE_PLAN.md) is the current, task-level execution plan (updated 2026-05-31). This file mirrors the phase structure and status for quick reference; **consult RELEASE_PLAN.md for actual dependencies, current blockers, and revised task list** (e.g., auth in P3 not P5, content as the long pole, Phase 2 requires analytics instrumentation, per-table sync deleted). Updates below reconcile this file with the audit.

## 🟢 Active Front (2026-07-04)

**2026-07-04 ✅ — E2E-1 done (last agent-runnable code-track task):** the black-screen sim blocker was a stale dev-client binary — a fresh `expo run:ios` rebuild fixed it, no code change needed. Found + fixed 3 real bugs live: an unbounded network await in `createContainer()`'s BK2 gate that could hang cold start forever on a bad connection, a missing `testID` on quiz options that left Submit permanently disabled, and `learn-loop.yaml` assuming 1 quick-check question when there are 10/batch. Full green run verified past the UI — `user.db` shows real `user_progress`/`quiz_attempts` rows after. Also: new app icon (bold custom "LT" monogram replacing a font-dependent placeholder that was technically wrong for the App Store spec) and Dependabot back to 0 open alerts.

**2026-06-11 ✅ — RC-1 done + five-chat parallel batch merged:** RevenueCat fully configured (entitlements `foundation_access` + `all_packs`, 3 products matching ASC SKUs, Offering `default` Current) → **IAP-1 ready** (on-device sandbox verify on build 4 is all that remains). **AUTH-2 + RC-2 code + secrets ✅** — delete-account now revokes Apple tokens (App Review 5.1.1(v)) and deletes the RevenueCat customer; 15 Deno tests, deployed; live verify folds into the AUTH-1 device pass. **BETA-2 recruitment kit ready** ([plans/BETA2_RECRUITMENT_KIT.md](../../plans/BETA2_RECRUITMENT_KIT.md)). **Dependabot: 0 open alerts** (post-SDK-56 re-triage; uuid override). **TestFlight tester feedback fixed** (paywall safe-area, full DOB picker, Lucide Icon system — emoji hard-blocked in app UI) + **SKUs/paywall aligned to the ASC 3-product model** (app version 0.0.1, matching the ASC registration). **E2E-1 reopened:** first live Maestro run blocked at the now-fixed paywall safe-area bug — the green re-run is the one agent-runnable frontier task.

**BETA-1 ✅ DONE:** Build `9bf46ff6` (Expo SDK 56 / RN 0.85 / React 19) distributed to internal testers on TestFlight. Phase 2 beta is live.

**2026-06-10 PM frontier batch ✅ (CI green):** AUTH-1 code half (native Sign in with Apple + Google → Supabase), IAP-1 code tail (RevenueCat alias + Restore purchases), CONTENT-2 driver (`enrich-senses` — the paid run is one command now), STORE-2 agent half (site was NOT live — redirect loop + no DNS + stale deploy fixed; deployed + verified; `/delete-account` page added). 24 adversarial-review findings fixed same-day; CI revived (dead since SDK-56).

**2026-06-10 evening ✅:** **STORE-2 DONE** — lexitap.app live (DNS + Email Routing; legal pages verified on the apex). **AUTH-1 dashboards done** (Supabase providers + Google client ID + EAS env, API-verified); **EAS build 3 built + submitted to App Store Connect**. ⚠️ Supabase project had **auto-paused** (free tier, idle since June 1 — backend DNS dead under build 2 for ~2 days); restored intact → new pre-submission blocker **SUPA-1** (Pro plan).

**2026-06-10 ✅ — Content pipeline rebuilt (JSONL + OpenAI), Phases 1–4 code-complete** (`6cda5f1`, 289 tests): single `words_master.jsonl` source of truth; `categorize` (CEFR + specialty tiers/word) + `enrich-master` (felt senses + 5 click/drag questions/word) on `OPENAI_API_KEY`. **Bulk seeding run HELD** — per-word sync calls don't scale to 2,848 words (~$7–30/pass); needs a Batch-API strategy. Replaces the legacy Anthropic `enrich-senses` path; folds in CONTENT-3's tier cross-reference.

**Shipped since 2026-05-31:** BUILD-1 ✅ (device), SDK-56 ✅ (iOS 26 mandate), Figma 100% finalized, Rich Word-Detail model (CONTENT-1 ✅), Learn-loop wired, LEGAL-2, STORE-3, RTL-1, LEGAL-3, STORE-1, E2E-1 — all ✅.

**▶ Next, in order (all Ryan-owned — no agent-runnable code-track tasks remain in [ORCHESTRATION.md](../../ORCHESTRATION.md)):**
1. **AUTH-1 tail:** when build 3 clears Apple processing, verify Apple + Google sign-in + magic link on device (`mobile/AUTH_INTEGRATION.md`). While there: delete a test account → confirm the RevenueCat customer is gone (closes the AUTH-2/RC-2 live verify).
2. **IAP-1 sandbox verify (build 4 needed).** RC-1 ✅ — trigger EAS build 4, then: sandbox purchase → entitlement unlocks pack; "Restore purchases" works; alias visible in the RC dashboard.
3. **Recruit 50 beta testers (BETA-2).** Everything pre-written in [plans/BETA2_RECRUITMENT_KIT.md](../../plans/BETA2_RECRUITMENT_KIT.md) — post + enroll. D7 gate: 7 days from first session.
4. **CONTENT-2 — pick a seeding strategy, then run.** JSONL + OpenAI pipeline (`categorize` + `enrich-master`) is done + tested + resume-safe; bulk run HELD (per-word sync calls don't scale, ~$7–30/pass over 2,848 words) — decide Batch-API vs frequency-waves first. Runbook: `content-tool/PHASE3_4_RUNBOOK.md`.
5. **SUPA-1 — Supabase Pro plan** (~$25/mo): free tier auto-paused the backend once already; required before submission.
6. **New EAS build needed** to ship E2E-1's fixes + the new app icon (both compiled into the binary, not JS-updatable via EAS Update) — bump `buildNumber` in `app.config.ts`.

**Tracked, lower priority:** AUTH-2 + RC-2 code + secrets ✅ done — live verify folds into the AUTH-1 device pass. Dependabot: ✅ 0 open alerts (2026-07-04 re-triage). Splash screen still shows the old icon mark — cheap follow-up, same asset pipeline. Sentry auth token needed as EAS secret before production builds.

The detailed product roadmap: 6 phases across 21 weeks, two parallel build tracks, deliverables and gates per phase, and the post-launch content-drop cadence. This doc expands the at-a-glance tracker [../../ROADMAP.md](../../ROADMAP.md). Feature detail is in [FEATURE_BACKLOG.md](./FEATURE_BACKLOG.md); requirements in [PRODUCT_REQUIREMENTS_DOCUMENT.md](./PRODUCT_REQUIREMENTS_DOCUMENT.md).

## Current Status

| Item | Value |
|------|-------|
| Phase | **1 → 2/3 — Build gate cleared; entering Beta + Phase 3 setup** (see [../../plans/RELEASE_PLAN.md](../../plans/RELEASE_PLAN.md)) |
| Code written | Track A CLI exists; content is Foundation ~2,848/3,000 sourced (2,881 words / 2,894 memberships across 9 tiers; TOEFL + exam tiers still stubs). Track B domain logic done + tested (quiz loop, SRS, mastery, streak, 2 widgets, DB) + rich word-detail read layer + multi-sense UI (459 tests). **Fixed 2026-05-30:** words.db device delivery, `tiers.ts` model, Jest harness. Per-table sync deleted; auth is a **Phase 3** dependency. Learn loop wired end-to-end (card → quick-check → SRS) as of 2026-06-09. |
| Last updated | 2026-07-04 (E2E-1 done — last agent-runnable code-track task; see Active Front above) |

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
