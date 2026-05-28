---
title: LexiTap Roadmap
updated: 2026-05-27
status: active
---

# LexiTap Roadmap

**21 weeks from validation to 1,000 active users (including B2B cram-school seats).**
Solo founder. $194 Year 1 budget. B2B Cram School licensing + non-cash teacher referrals as primary GTM.

This root file is the at-a-glance mirror. The canonical product roadmap is [lexitap-docs/02-product-definition/ROADMAP.md](lexitap-docs/02-product-definition/ROADMAP.md).

---

## Current Status

| Item | Value |
|------|-------|
| Phase | **1 — Build** (active) |
| Code written | Track A (content-tool CLI) complete. Track B ~85% through Phase 1 — core quiz loop, SRS, streak, widgets, sync service, and DB layer done. Auth and lifecycle wiring deferred to end of Phase 1. |
| Stack | React Native (Expo) + TypeScript + SQLite + Supabase |
| Target | Global ESL learners (cram schools & test prep individuals) |
| Last updated | 2026-05-27 |

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
- [x] Load bundled `words.db` (ATTACH DATABASE setup in infrastructure/db/database.ts)
- [x] Cloud sync (background, non-blocking) — SupabaseSyncService fully implemented; lifecycle wiring pending
- [x] Screens: Home, Quiz, Progress, Settings
- [x] Assessment widgets: MultipleChoice, DragDrop
- [x] Use cases + services: SRS scheduling, mastery, quiz session, sync, entitlements — implemented via use-case/service layer (hooks pattern replaced by this architecture per clean/hexagonal design)
- [x] Streak counter (non-negotiable gamification)
- [ ] Deliverable: Working iOS + Android app, free tier, no-typing recognition loop, cloud sync included

---

## Phase 2 — Validation (Weeks 7-10)

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

## Phase 3 — Subscription & Bulk Beta (Weeks 11-12)

- [ ] Source TOEFL audio (ElevenLabs, ~$50)
- [ ] Content tool: enrich TOEFL tier with audio
- [ ] Paywall screen (unified premium subscription: $4.99/mo, $24.99/yr)
- [ ] Apple + Google IAP integration (RevenueCat)
- [ ] B2B cram-school seat activation validation (Supabase)
- [ ] Early adopter push ($19.99/yr intro premium pass)
- [ ] **Gate: 10 paying individual subscribers + 2 paid cram-school contracts**

---

## Phase 4 — Launch Wave Content Drops (Weeks 12-16)

Content tool additions:
- [ ] Source + import IELTS word list
- [ ] Source + import Business English word list
- [ ] Source + import Common 3K word list
- [ ] Export updated `words.db` (6 tiers total)

Mobile additions:
- [ ] Update paywall UI with IELTS/Business highlights
- [ ] B2B school management portal deploy (web-based bulk purchase)
- [ ] Assessment widgets: Classification, ImageMatch
- [ ] UX polish (animations, haptics)
- [ ] **Gate: $1,000/month recurring revenue**

---

## Phase 5 — Launch Prep (Weeks 17-18)

- [ ] Account creation — email/password auth screen (Supabase)
- [ ] Google Sign-In (`expo-google-sign-in` + Supabase OAuth)
- [ ] Sign in with Apple (`expo-apple-authentication` + Supabase Apple OAuth)
- [ ] Wire `SupabaseSyncService` lifecycle to authenticated user ID
- [ ] App icon (1024×1024)
- [ ] App Store screenshots showing no-typing recognition practice
- [ ] App Store description emphasizing subscription value & schools
- [ ] Privacy policy & Terms of Service
- [ ] Support email setup
- [ ] Launch lexitap.app website with B2B licensing portal
- [ ] Apple App Store submission ($99/year)
- [ ] Google Play submission ($25 one-time)
- [ ] **Deliverable: Live on both stores**

---

## Phase 6 — Growth + Content Drops (Week 19+)

Growth:
- [ ] Scale cram-school institutional sales outreach
- [ ] Activate non-cash teacher referral program (in-app rewards / free unlocks)
- [ ] Reddit presence (r/TOEFL, r/ESL, r/languagelearning)
- [ ] App Store Optimization for "TOEFL vocabulary", "IELTS vocabulary", and "offline vocabulary"
- [ ] Content marketing (blog, TikTok/YouTube Shorts)

Content drop cadence:
- [ ] Week 22 — GRE Vocabulary (included in Premium)
- [ ] Week 26 — GMAT Vocabulary (included in Premium)
- [ ] Week 30 — Idioms & Expressions (included in Premium)
- [ ] Week 34 — Phrasal Verbs (included in Premium)

**Gate: 1,000 active users**

---

## Timeline Summary

| Week | Milestone |
|------|-----------|
| 1 | Validation interviews + word lists sourced + cram school outreach |
| 3 | Content tool done (Track A) |
| 6 | Mobile MVP done — free tiers + recognition widgets |
| 10 | Retention data from 50 beta users + B2B school trials |
| 11 | WTP validated for Premium Subscription & Cram School bulk |
| 12 | First 10 paying subscribers + 2 cram school accounts |
| 17 | All launch-wave tiers + B2B web portal complete |
| 19 | App Store live |
| 21 | 1,000 active users |

---

## Revenue Targets

| Milestone | Target |
|-----------|--------|
| First paying users | 10 subscribers + 2 schools (Week 12) |
| Monthly revenue | $1,000 recurring (Phase 4) |
| Year 1 (conservative) | $3,600 net |
| Year 2 (growth) | $30,000 net |
| Year 3 (mature) | $67,500 net |

---

## Kill Criteria

| Point | Condition | Action |
|-------|-----------|--------|
| Week 1 | Validation interviews/school interest fail | Stop — pivot or kill |
| Week 10 | D7 retention <20% | Product broken — pivot/kill |
| Week 12 | <5 paying subscribers OR 0 B2B schools paid | Pivot to consumer-only or restructure pricing |
| Week 20 | <100 active users acquired | Rethink GTM, pivot sales strategy |

---

## Documentation

| Folder | Purpose |
|--------|---------|
| `lexitap-docs/` | Full research docs (42 non-README documents, 8 categories) — the single canonical doc layer |

Detailed specs live in `lexitap-docs/`. This file is the at-a-glance tracker.
