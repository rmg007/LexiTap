---
title: LexiTap Roadmap
updated: 2026-06-09
status: active
---

# LexiTap Roadmap

> **▶ To run work, use [`ORCHESTRATION.md`](ORCHESTRATION.md)** — the execution layer: every remaining task as a runnable, dependency-tagged, parallel-safe prompt. This file is the *glance* mirror; `ORCHESTRATION.md` is what you actually pick tasks from (`/orchestrate next`), and `/orchestrate sync` keeps both in step. Task-level dependency truth still lives in [plans/RELEASE_PLAN.md](plans/RELEASE_PLAN.md).

> **⚠️ Ordering superseded (2026-05-30):** A code+docs audit found this file's phase *ordering* and status claims are stale — auth is a Phase 3 dependency (not Phase 5), `words.db` content delivery is currently broken, Foundation is ~2,848/3,000 sourced (2,881 words total; TOEFL + exam tiers still stubs), per-table sync was deleted, and Phase 2 requires instrumentation coding. The authoritative, task-level execution plan is **[plans/RELEASE_PLAN.md](plans/RELEASE_PLAN.md)**. This file remains the high-level phase mirror; trust RELEASE_PLAN.md where they conflict.

---

## 🟢 Active Front (2026-06-10)

**Shipped since 2026-05-31 (verified, committed):**
- **2026-06-10 PM frontier batch ✅** (`da530c7`…`cde165d`, CI green): **AUTH-1 code half** (native Sign in with Apple + Google → Supabase, 520 tests), **IAP-1 code tail** (RevenueCat↔Supabase alias + Settings "Restore purchases"), **CONTENT-2 driver** (`enrich-senses` — the paid run is now one command), **STORE-2 agent half** (site was NOT live: redirect loop + stale deploy + no DNS — fixed, deployed, verified; `/delete-account` page added). 30-agent adversarial review: 24 confirmed findings, all fixed same-day. **CI revived** (dead since SDK-56: TS2882 on clean checkouts).
- **BETA-1 ✅ DONE** — build `9bf46ff6` (SDK 56 / RN 0.85) distributed to internal testers on TestFlight.
- **Expo SDK 52 → 56 ✅** (`556606c`) — forced by Apple iOS-26-SDK mandate. RN 0.85 / React 19 / expo-doctor 21/21.
- **BUILD-1 ✅** — app confirmed on physical device. **LEGAL-2, STORE-3, RTL-1, LEGAL-3, STORE-1, CONTENT-1, E2E-1** all ✅.

**▶ Next, in order (all Ryan-owned — mostly clicks now, exact steps in [ORCHESTRATION.md](ORCHESTRATION.md)):**
1. **STORE-2 tail — 2 Cloudflare clicks:** add the CNAME records (`@` + `www` → lexitap.pages.dev) + enable Email Routing. Until then lexitap.app doesn't resolve and support@ bounces.
2. **Recruit 50 beta testers (BETA-2).** Share TestFlight link — r/TOEFL, r/IELTS, r/languagelearning, ESL groups. D7 gate: 7 days from first session.
3. **RC-1 — RevenueCat + App Store Connect products.** IAP-1's code is COMPLETE — after RC-1 it's config + one sandbox device test, no code.
4. **CONTENT-2 — run the driver:** `npm run enrich:senses -- --limit 300 --dry-run`, then live (~$8 approx on claude-opus-4-8). Runbook: `content-tool/ENRICH_SENSES.md`.
5. **AUTH-1 tail:** Supabase provider toggles + Google iOS client ID + EAS build 3 → verify both native sign-ins on device (`mobile/AUTH_INTEGRATION.md`).

**Tracked, lower priority:**
- **Pre-submission blockers (new, from review):** AUTH-2 (Apple token revocation on account deletion — App Review 5.1.1(v)) + RC-2 (RevenueCat customer deletion) — both in the delete-account Edge Function, both await Ryan-owned secrets.
- **Dependabot:** ~11 remaining alerts — transitive Expo-build-tooling (tar×6, xmldom×4, uuid), accepted until next SDK bump.
- **Sentry auth token:** add as EAS secret (`eas secret:create --scope project --name SENTRY_AUTH_TOKEN`) before beta/prod builds — preview currently skips source-map upload.

**21 weeks from validation to 1,000 active users.**
Solo founder. $194 Year 1 budget. **One-time consumer IAP (exam packs + bundle) via RevenueCat — no subscriptions.** B2B licensing and teacher referrals deferred (door left open). See [pricing model](lexitap-docs/08-financial-legal/REVENUE_MODEL_PRICING.md).

This root file is the at-a-glance mirror. The canonical product roadmap is [lexitap-docs/02-product-definition/ROADMAP.md](lexitap-docs/02-product-definition/ROADMAP.md).

---

## Current Status

| Item | Value |
|------|-------|
| Phase | **1 → 2/3 — Build gate cleared; entering Beta + Phase 3 setup** (see [plans/RELEASE_PLAN.md](plans/RELEASE_PLAN.md)) |
| Code written | Domain logic done + tested (SRS, scheduling, mastery, quiz session, DB, 2 widgets). **Fixed 2026-05-30:** words.db delivery (was loading empty on device), `tiers.ts` monetization model, broken Jest harness. Per-table sync was deleted. Auth is a **Phase 3** dependency (not 5). Content: Foundation ~2,848/3,000 sourced (2,881 words / 2,894 memberships across 9 tiers); TOEFL + exam tiers still stubs — see [memory note](memory/2026-05-31_content_count_regression.md). Learn loop wired end-to-end (card → quick-check → SRS) as of 2026-06-09. |
| Stack | React Native (Expo) + TypeScript + SQLite + Supabase |
| Target | Global ESL learners (cram schools & test prep individuals) |
| Last updated | 2026-06-10 (BUILD-1 cleared; see Active Front above) |

---

## Before Continuing Phase 1 — 3 Blockers

These must be resolved before Phase 1 is treated as validated for continued build work. Nothing else gates Phase 1 continuation.

- [x] **Backlog #43** — SRS Forgiveness Mechanics design (daily review cap + soft catch-up + streak freeze — blocks all scheduler/SRS code) — resolved; see [lexitap-docs/02-product-definition/SRS_FORGIVENESS_MECHANICS.md](lexitap-docs/02-product-definition/SRS_FORGIVENESS_MECHANICS.md)
- [x] **Backlog #41** — Content Sourcing Strategy (blocks content tool build, Track A Week 2-3) — resolved 2026-05-23
- [x] **Backlog #42** — Knowji competitive teardown — resolved by desk research; first-person hands-on is impossible due to store-access limitations on the deprecated competitive app. Branding work moved to post-validation backlog. All Phase 1 blockers are fully closed!

---

## Phase 0 — Validation (Week 1)

**Gate:** 10/20 TOEFL/IELTS test-takers say yes to a free download + 3/5 cram-school directors say yes to a bulk licensing free trial. If not — stop or pivot GTM.

- [x] Survey 20 TOEFL/IELTS test-takers
- [x] Interview 5 ESL or cram-school operators
- [x] Pitch bulk pilot to 5 local ESL cram schools
- [x] Source Foundation word list (top 3,000 most-used words)
- [x] Source TOEFL word list (~3,000 words)
- [x] Resolve 3 Phase 1 blockers (above)

---

## Phase 1 — Build (Weeks 2-6)

### Baseline Setup

- [x] Initialize Git repository
- [ ] Git Worktrees two-track setup (single repo used in practice; worktree split deferred)
  - `git worktree add ../lexitap-content track/content-cli` (Track A)
  - `git worktree add ../lexitap-mobile track/mobile-mvp` (Track B)
- [ ] GitHub Actions CI (ESLint + TypeScript on every PR)
- [ ] Ship and Watch loop (autonomous PR monitor + fix loop)
- [x] Create `CLAUDE.md` in project root
- [x] Initialize memory system (`memory/`, `docs/`, `plans/`)
- [ ] Configure EAS Build (iOS + Android)

### Track A — Content Tool (Weeks 2-3)

- [x] CLI: `import`, `validate`, `export` commands
- [x] CSV parser + SQLite export
- [x] `npm run build:db` → `data/output/words.db`
- [ ] Deliverable: Foundation tier DB (2,848/3,000 words sourced; 2,881 total / 2,894 memberships; enrichment is the long pole; see [plans/RELEASE_PLAN.md §B](plans/RELEASE_PLAN.md))

### Track B — Mobile MVP (Weeks 2-6)

- [x] Expo + TypeScript project setup
- [x] Load bundled `words.db` — asset bundling + version-gated copy before ATTACH (`infrastructure/db/contentDb.ts`); **fixed 2026-05-30, proven on iOS simulator 2026-05-31; physical device verification in progress**
- [ ] Cloud sync — encrypted `user.db` blob backup via Supabase Storage (Phase 3+; per-table sync removed 2026-05-28)
- [x] Screens: Home, Quiz, Progress, Settings
- [x] Assessment widgets: MultipleChoice, DragDrop
- [x] Use cases + services: SRS scheduling, mastery, quiz session, entitlements — implemented via use-case/service layer (hexagonal design; per-table sync deleted)
- [x] Streak counter (non-negotiable gamification)
- [ ] Deliverable: Working iOS + Android app, free Foundation tier, no-typing recognition loop; **encrypted backup wired to auth (Phase 3)**

---

## Phase 2 — User Validation (Weeks 7-10)

**Gate:** D7 retention >30% + 2 cram schools onboarded for free beta trials. If not — stop.

- [ ] Recruit 50 beta testers (TestFlight + Google Play Internal)
- [ ] Pitch and onboard 2 local cram schools for bulk pilot
- [ ] Measure D1 retention (target >50%)
- [ ] Measure D7 retention (target >30%)
- [ ] Measure D30 retention (target >15%)
- [ ] Avg session >3 min
- [ ] Retention dashboard + analytics instrumentation (PostHog + Sentry; not "no coding" — see [plans/RELEASE_PLAN.md §3](plans/RELEASE_PLAN.md#3-corrected-phase-structure))
- ~~Cloud sync device-switch test~~ (deleted 2026-05-28; deferred to Phase 3)

---

## Phase 3 — First Paid Pack (Weeks 11-12)

**Monetization model: one-time exam packs, NO subscriptions.** See [lexitap-docs/08-financial-legal/REVENUE_MODEL_PRICING.md](lexitap-docs/08-financial-legal/REVENUE_MODEL_PRICING.md).

- [ ] Universal audio (word + sentence) on ALL content via **neural TTS (Amazon Polly / Google, ~$10)** — NOT ElevenLabs
- [ ] Content tool: generate audio across tiers
- [ ] Leave Expo Go → EAS dev client (gates all native modules below)
- [ ] Paywall screen — **one-time exam packs ($9.99) + All-Exams bundle ($29.99) + gated upgrade SKUs**; no subscription
- [ ] Apple + Google IAP (RevenueCat) — one-time non-consumables only; `exam_*` + `all_exams` entitlements
- [ ] **Auth (magic-link + Google + Sign in with Apple)** — moved here from Phase 5; backup + identity depend on it
- [ ] Encrypted `user.db` blob backup wired to authenticated user id
- [ ] ~~B2B cram-school seat activation~~ **deferred (build nothing; leave entitlement door open)**
- [ ] **Gate: 10 paying customers (pack or bundle purchases)**

---

## Phase 4 — Launch Wave Tiers (Weeks 12-16)

Content tool additions:
- [ ] Source + import IELTS exam pack (paid)
- [ ] Source + import Business English exam pack (paid)
- [ ] Source + import GRE / GMAT exam packs (paid)
- [ ] Export updated `words.db` (free frequency/CEFR categories + paid exam packs)

> Note: Most Common 3000 / 9000 are **free** frequency categories shipped at launch, not Phase 4 paid additions.

Mobile additions:
- [ ] Add IELTS / Business / GRE / GMAT exam-pack products; update paywall + bundle attach
- [ ] Assessment widgets: Classification, ImageMatch
- [ ] UX polish (animations, haptics)
- [ ] **Gate: $1,000 cumulative pack/bundle revenue** (one-time, not recurring)

---

## Phase 5 — Launch Prep (Weeks 17-18)

> Auth (magic-link + Google + SIWA) and encrypted backup **moved to Phase 3** — they are dependencies of monetization/identity, and Apple 4.8 forces SIWA once Google Sign-In ships. Launch prep below assumes auth already exists.

- [ ] Account deletion + data export (Apple 5.1.1(v), required once accounts exist) + 16+ age gate
- [ ] App icon (1024×1024)
- [ ] App Store screenshots showing no-typing recognition practice
- [ ] App Store description emphasizing exam packs + free frequency content
- [ ] Privacy policy & Terms of Service
- [ ] Support email setup
- [ ] Launch lexitap.app static site (privacy/terms; no B2B portal — deferred)
- [ ] Apple App Store submission ($99/year)
- [ ] Google Play submission ($25 one-time)
- [ ] **Deliverable: Live on both stores**

---

## Phase 6 — Growth and Content Drops (Week 19+)

Growth:
- [ ] ~~Scale cram-school institutional sales~~ (B2B deferred — door left open)
- [ ] ~~Teacher referral program~~ (deferred with B2B)
- [ ] Reddit presence (r/TOEFL, r/ESL, r/languagelearning)
- [ ] App Store Optimization for "TOEFL vocabulary", "IELTS vocabulary", and "offline vocabulary"
- [ ] Content marketing (blog, TikTok/YouTube Shorts)

Content drop cadence:
- [ ] Week 22 — GRE exam pack (paid; joins All-Exams bundle)
- [ ] Week 26 — GMAT exam pack (paid; joins All-Exams bundle)
- [ ] Week 30 — Idioms & Expressions (one-time content pack — pricing TBD)
- [ ] Week 34 — Phrasal Verbs (one-time content pack — pricing TBD)

**Gate: 1,000 active users**

---

## Timeline Summary

| Week | Milestone |
|------|-----------|
| 1 | Validation interviews + word lists sourced + cram school outreach |
| 3 | Content tool done (Track A) |
| 6 | Mobile MVP done — free tiers + recognition widgets |
| 10 | Retention data from 50 beta users |
| 11 | WTP validated for exam-pack pricing ($9.99 / $29.99 bundle) |
| 12 | First 10 paying customers (pack or bundle) |
| 17 | All launch-wave exam packs complete |
| 19 | App Store live |
| 21 | 1,000 active users |

---

## Revenue Targets

> ⚠️ Old subscription + B2B projections are **void** (model changed 2026-05-31). Business is now pure one-time B2C exam packs. Re-modeling is an open task — see [pricing doc](lexitap-docs/08-financial-legal/REVENUE_MODEL_PRICING.md#revenue-projections-needs-re-modeling).

| Milestone | Target |
|-----------|--------|
| First paying customers | 10 pack/bundle purchases (Week 12) |
| Cumulative revenue | $1,000 (Phase 4; one-time, not recurring) |
| Year 1 (rough) | ~$2,000 net — covers the $194 cost base; full re-model pending |

---

## Kill Criteria

| Point | Condition | Action |
|-------|-----------|--------|
| Week 1 | Validation interviews/school interest fail | Stop — pivot or kill |
| Week 10 | D7 retention <20% | Product broken — pivot/kill |
| Week 12 | <5 paying customers (pack/bundle) | Restructure pricing or rethink paid content |
| Week 20 | <100 active users acquired | Rethink GTM, pivot sales strategy |

---

## Documentation

| Folder | Purpose |
|--------|---------|
| `lexitap-docs/` | Full research docs (42 non-README documents, 8 categories) — the single canonical doc layer |

Detailed specs live in `lexitap-docs/`. This file is the at-a-glance tracker.
