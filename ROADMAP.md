---
title: LexiTap Roadmap
updated: 2026-05-27
status: active
---

# LexiTap Roadmap

> **⚠️ Ordering superseded (2026-05-30):** A code+docs audit found this file's phase *ordering* and status claims are stale — auth is a Phase 3 dependency (not Phase 5), `words.db` content delivery is currently broken, content is ~8% sourced (241 words, not 3,000), per-table sync was deleted, and Phase 2 requires instrumentation coding. The authoritative, task-level execution plan is **[plans/RELEASE_PLAN.md](plans/RELEASE_PLAN.md)**. This file remains the high-level phase mirror; trust RELEASE_PLAN.md where they conflict.

**21 weeks from validation to 1,000 active users.**
Solo founder. $194 Year 1 budget. **One-time consumer IAP (exam packs + bundle) via RevenueCat — no subscriptions.** B2B licensing and teacher referrals deferred (door left open). See [pricing model](lexitap-docs/08-financial-legal/REVENUE_MODEL_PRICING.md).

This root file is the at-a-glance mirror. The canonical product roadmap is [lexitap-docs/02-product-definition/ROADMAP.md](lexitap-docs/02-product-definition/ROADMAP.md).

---

## Current Status

| Item | Value |
|------|-------|
| Phase | **1 — Build** (active; ~30% to launch, not 85% — see [plans/RELEASE_PLAN.md](plans/RELEASE_PLAN.md)) |
| Code written | Domain logic done + tested (SRS, scheduling, mastery, quiz session, DB, 2 widgets). **Fixed 2026-05-30:** words.db delivery (was loading empty on device), `tiers.ts` monetization model, broken Jest harness. Per-table sync was deleted. Auth is a **Phase 3** dependency (not 5). Content is ~8% sourced (241 unique words / 246 tier memberships across 9 tiers; restored 2026-05-31 from a downsized sample — see [memory note](memory/2026-05-31_content_count_regression.md)). |
| Stack | React Native (Expo) + TypeScript + SQLite + Supabase |
| Target | Global ESL learners (cram schools & test prep individuals) |
| Last updated | 2026-05-30 |

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
- [ ] Deliverable: Foundation tier DB (words.db not yet verified in bundled assets)

### Track B — Mobile MVP (Weeks 2-6)

- [x] Expo + TypeScript project setup
- [x] Load bundled `words.db` — asset bundling + version-gated copy before ATTACH (`infrastructure/db/contentDb.ts`); **fixed 2026-05-30, still to be proven on a physical device**
- [ ] Cloud sync — encrypted `user.db` blob backup via Supabase Storage (Phase 3+; per-table sync removed)
- [x] Screens: Home, Quiz, Progress, Settings
- [x] Assessment widgets: MultipleChoice, DragDrop
- [x] Use cases + services: SRS scheduling, mastery, quiz session, sync, entitlements — implemented via use-case/service layer (hooks pattern replaced by this architecture per clean/hexagonal design)
- [x] Streak counter (non-negotiable gamification)
- [ ] Deliverable: Working iOS + Android app, free tier, no-typing recognition loop, cloud sync included

---

## Phase 2 — User Validation (Weeks 7-10)

**Gate:** D7 retention >30% + 2 cram schools onboarded for free beta trials. If not — stop.

- [ ] Recruit 50 beta testers (TestFlight + Google Play Internal)
- [ ] Pitch and onboard 2 local cram schools for bulk pilot
- [ ] Measure D1 retention (target >50%)
- [ ] Measure D7 retention (target >30%)
- [ ] Measure D30 retention (target >15%)
- [ ] Avg session >3 min
- [ ] Cloud sync device-switch test
- [ ] No coding — testing + analysis only

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
