---
title: LexiTap Roadmap
updated: 2026-05-24
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
| Phase | **0 — Validation** (Week 1) |
| Code written | Track A and Track B scaffolds/code exist; continue validating before launch commitments |
| Stack | React Native (Expo) + TypeScript + SQLite + Supabase |
| Target | Global ESL learners (cram schools & test prep individuals) |

---

## Before Continuing Phase 1 — 3 Blockers

These must be resolved before Phase 1 is treated as validated for continued build work. Nothing else gates Phase 1 continuation.

- [x] **Backlog #43** — SRS Forgiveness Mechanics design (daily review cap + soft catch-up + streak freeze — blocks all scheduler/SRS code) — resolved; see [lexitap-docs/02-product-definition/SRS_FORGIVENESS_MECHANICS.md](lexitap-docs/02-product-definition/SRS_FORGIVENESS_MECHANICS.md)
- [x] **Backlog #41** — Content Sourcing Strategy (blocks content tool build, Track A Week 2-3) — resolved 2026-05-23
- [ ] **Backlog #42** — Knowji competitive teardown (~$10 + 4-6 hrs — blocks Brand Identity finalization) — research-based teardown done; first-person hands-on still outstanding

---

## Phase 0 — Validation (Week 1)

**Gate:** 10/20 TOEFL/IELTS test-takers say yes to a free download + 3/5 cram-school directors say yes to a bulk licensing free trial. If not — stop or pivot GTM.

- [ ] Survey 20 TOEFL/IELTS test-takers
- [ ] Interview 5 ESL or cram-school operators
- [ ] Pitch bulk pilot to 5 local ESL cram schools
- [ ] Source Foundation word list (top 3,000 most-used words)
- [ ] Source TOEFL word list (~3,000 words)
- [ ] Resolve 3 Phase 1 blockers (above)

---

## Phase 1 — Build (Weeks 2-6)

### Baseline Setup

- [ ] Initialize Git repository
- [ ] Git Worktrees two-track setup
  - `git worktree add ../lexitap-content track/content-cli` (Track A)
  - `git worktree add ../lexitap-mobile track/mobile-mvp` (Track B)
- [ ] GitHub Actions CI (ESLint + TypeScript on every PR)
- [ ] Ship and Watch loop (autonomous PR monitor + fix loop)
- [ ] Create `CLAUDE.md` in project root
- [ ] Initialize memory system (`memory/`, `docs/`, `plans/`)
- [ ] Configure EAS Build (iOS + Android)

### Track A — Content Tool (Weeks 2-3)

- [ ] CLI: `import`, `validate`, `export` commands
- [ ] CSV parser + SQLite export
- [ ] `npm run build:db` → `data/output/words.db`
- [ ] Deliverable: Foundation tier DB

### Track B — Mobile MVP (Weeks 2-6)

- [ ] Expo + TypeScript project setup
- [ ] Supabase: auth + database
- [ ] Account creation (email/password + Google Sign-In)
- [ ] Load bundled `words.db`
- [ ] Cloud sync (background, non-blocking, on app open/close)
- [ ] Screens: Home, Quiz, Progress, Settings
- [ ] Assessment widgets: MultipleChoice, DragDrop
- [ ] Hooks: useSpacedRepetition, useMastery, useQuizSession, useSync, useSeatLicensing
- [ ] Streak counter (non-negotiable gamification)
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
