---
title: LexiTap Roadmap
updated: 2026-05-24
status: active
---

# LexiTap Roadmap

**21 weeks from validation to 1,000 users.**
Solo founder. $144 Year 1 budget. Teacher referral network as primary GTM.

---

## Current Status

| Item | Value |
|------|-------|
| Phase | **0 — Validation** (Week 1) |
| Code written | None |
| Stack | React Native (Expo) + TypeScript + SQLite + Supabase |
| Target | Global ESL learners (non-native English speakers only) |

---

## Before Phase 1 Starts — 3 Blockers

These must be done before any Phase 1 code is written. Nothing else gates Phase 1 start.

- [ ] **Backlog #43** — SRS Forgiveness Mechanics design (daily review cap + soft catch-up + streak freeze — blocks all scheduler/SRS code)
- [ ] **Backlog #41** — Content Sourcing Strategy (blocks content tool build, Track A Week 2-3)
- [ ] **Backlog #42** — Knowji competitive teardown (~$10 + 4-6 hrs — blocks Brand Identity finalization)

---

## Phase 0 — Validation (Week 1)

**Gate:** 7/10 parents say yes to free download + 3/5 juniors say maybe/yes to paid. If not — stop.

- [ ] Interview 10 parents
- [ ] Interview 5 high schoolers
- [ ] Survey 20 TOEFL test-takers
- [ ] Source Foundation word list (top 3,000 most-used words)
- [ ] Source TOEFL word list (~3,000 words)
- [ ] Resolve 3 Phase 1 blockers (above)

---

## Phase 1 — Build (Weeks 2-6)

### Day 1 Setup (before any application code)

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
- [ ] Hooks: useSpacedRepetition, useMastery, useQuizSession, useSync
- [ ] Streak counter (non-negotiable gamification)
- [ ] Deliverable: Working iOS + Android app, free tier, cloud sync included

---

## Phase 2 — Validation (Weeks 7-10)

**Gate:** D7 retention >30% → proceed. 20-30% → fix core loop. <20% → product broken, pivot/kill.

- [ ] Recruit 50 beta testers (TestFlight + Google Play Internal)
- [ ] Measure D1 retention (target >50%)
- [ ] Measure D7 retention (target >30%)
- [ ] Measure D30 retention (target >15%)
- [ ] Avg session >3 min
- [ ] Cloud sync device-switch test
- [ ] No coding — testing + analysis only

---

## Phase 3 — First Paid Tier (Weeks 11-12)

- [ ] Source TOEFL audio (ElevenLabs, ~$50)
- [ ] Content tool: enrich TOEFL tier with audio
- [ ] Paywall screen
- [ ] Apple + Google IAP integration (`expo-in-app-purchases`)
- [ ] Teacher referral code validation (Supabase)
- [ ] Promo code system (Supabase)
- [ ] Early adopter push ($11.99 intro vs $14.99 list)
- [ ] **Gate: 10 paying users**

---

## Phase 4 — Launch Wave Tiers (Weeks 12-16)

Content tool additions:
- [ ] Source + import IELTS word list
- [ ] Source + import Business English word list
- [ ] Source + import Common 3K word list
- [ ] Export updated `words.db` (6 tiers total)

Mobile additions:
- [ ] Add IAP products for new tiers
- [ ] Update paywall UI
- [ ] Premium Pass logic ($29.99/yr — covers all paid tiers including future drops)
- [ ] Assessment widgets: ImageMatch, Classification
- [ ] UX polish (animations, haptics)
- [ ] **Gate: $1,000/month revenue**

---

## Phase 5 — Launch Prep (Weeks 17-18)

- [ ] App icon (1024×1024)
- [ ] App Store screenshots (6)
- [ ] App Store description
- [ ] Privacy policy
- [ ] Terms of service
- [ ] Support email setup
- [ ] Launch lexitap.app website
- [ ] Deploy teacher referral portal
- [ ] Apple App Store submission ($99/year)
- [ ] Google Play submission ($25 one-time)
- [ ] **Deliverable: Live on both stores**

---

## Phase 6 — Growth + Content Drops (Week 19+)

Growth:
- [ ] Activate teacher referral network
- [ ] Reddit presence (r/TOEFL, r/ESL, r/languagelearning)
- [ ] App Store Optimization
- [ ] Content marketing (blog, TikTok/YouTube Shorts)

Content drop cadence:
- [ ] Week 22 — GRE Vocabulary ($14.99)
- [ ] Week 26 — GMAT Vocabulary ($14.99)
- [ ] Week 30 — Idioms & Expressions ($9.99)
- [ ] Week 34 — Phrasal Verbs ($9.99)

**Gate: 1,000 users**

---

## Timeline Summary

| Week | Milestone |
|------|-----------|
| 1 | Validation interviews + word lists sourced |
| 3 | Content tool done (Track A) |
| 6 | Mobile MVP done — free tier + cloud sync |
| 10 | Retention data from 50 beta users |
| 11 | WTP validated |
| 12 | First 10 paying users |
| 17 | All launch-wave tiers complete |
| 19 | App Store live |
| 21 | 1,000 users |

---

## Revenue Targets

| Milestone | Target |
|-----------|--------|
| First paying users | 10 users (Week 12) |
| Monthly revenue | $1,000 (Phase 4) |
| Year 1 (conservative) | $3,600 |
| Year 2 (growth) | $30,000 |
| Year 3 (mature) | $67,500 net |

---

## Kill Criteria

| Point | Condition | Action |
|-------|-----------|--------|
| Week 1 | Validation interviews fail | Stop — pivot or kill |
| Week 10 | D7 retention <20% | Product broken — pivot/kill |
| Week 12 | <5 paying users | Pivot to B2B or rethink pricing |
| Week 20 | <100 users acquired | Rethink GTM, invest in teacher network |

---

## Documentation

| Folder | Purpose |
|--------|---------|
| `notion-docs/` | 14 agent-handoff docs — load `SESSION_STATE.md` first |
| `lexitap-docs/` | Full research docs (~40-50 files, 8 categories) — not yet scaffolded |

Detailed specs live in `notion-docs/`. This file is the at-a-glance tracker.
