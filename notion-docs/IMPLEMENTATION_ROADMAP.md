# Implementation Roadmap

---
title: Implementation Roadmap
category: strategy
status: active
phase: 0
priority: P0
updated: 2026-05-22
load_order: 8
tags: [roadmap, phases, timeline, track-a, track-b, content-tool, mobile-mvp, worktrees, ci-cd, cloud-sync, validation]
---

> Load order: 8 of 14. Load when planning phase work, checking timelines, or setting up infrastructure.

**Project:** Lexicon ESL - Multi-tier vocabulary app

**Timeline:** 17-20 weeks from start to App Store launch

**Build Approach:** Two parallel tracks (Content Tool + Mobile App)

---

## The Two Tracks

### Track A: Content Tool (CLI)

- Purpose: Generate `words.db` file
- Tech: Node.js + TypeScript + SQLite
- Timeline: 1-2 weeks
- Must finish FIRST (mobile app needs the DB)

### Track B: Mobile App (React Native)

- Purpose: The actual Lexicon ESL app
- Tech: React Native (Expo) + TypeScript + SQLite
- Timeline: 8-12 weeks (MVP), 16-20 weeks (full)

---

## Phase-by-Phase Breakdown

### Phase 0: Pre-Build Validation (Week 1)

**Goal:** Validate assumptions before writing code

**Tasks:**

- [ ]  Interview 10 parents
- [ ]  Interview 5 high schoolers
- [ ]  Survey 20 TOEFL test-takers
- [ ]  Competitive analysis (5 apps)
- [ ]  Source word lists (counts TBD — content sourcing strategy is P0 backlog item #41):
    - [ ]  Foundation
    - [ ]  TOEFL

**Success:**

- 7/10 parents say "yes" to free download
- 3/5 juniors say "maybe/yes" to paid
- At least one word list ready

**If failure:** Stop. Pivot or kill.

---

### Phase 1 Day 1: Project Infrastructure Setup (before any code)

**Do this before writing a single line of application code. The agent handles all of this autonomously given [CLAUDE.md](../CLAUDE.md) instructions.**

- [ ]  Initialize Git repository
- [ ]  Git Worktree two-track setup:
    - `git worktree add ../lexitap-content track/content-cli` — Track A (content CLI tool)
    - `git worktree add ../lexitap-mobile track/mobile-mvp` — Track B (mobile MVP)
- [ ]  Configure CI pipeline: GitHub Actions for ESLint + TypeScript checks on every PR
- [ ]  Set up Ship and Watch loop: Claude Code GitHub Actions integration for autonomous PR monitoring + fix loop (#46)
- [ ]  Create `CLAUDE.md` in project root with compound-learning + adversarial-review instructions
- [ ]  Initialize memory system directory structure (`memory/`, `docs/`, `plans/`) per Memory Architecture doc
- [ ]  Configure EAS Build for iOS + Android

**Why Day 1:** Git Worktrees and CI/CD set up retroactively are messier than doing them first. Two independent Claude Code instances (one per track) run from Week 2 onward — this setup makes that possible autonomously.

---

### Phase 1A: Build Content Tool (Weeks 2-3)

**Goal:** CLI to generate `words.db`

**What to build:**

- CLI with 3 commands: import, validate, export
- CSV parser
- SQLite export script
- Run: `npm run build:db`

**Deliverable:** `data/output/words.db` (800 words, Foundation tier)

**Complexity:** Low (Node.js script)

---

### Phase 1B: Mobile App MVP (Weeks 2-6) - REVISED +1 week

**Goal:** Free tier only, 2 assessments, basic spaced repetition, **cloud sync**

**What to build:**

- Expo + TypeScript setup
- **Supabase setup (auth + database for sync)**
- **Account creation flow (email/password + Google Sign-In)**
- DB integration (load bundled `words.db`)
- **Cloud sync logic (background upload/download on app open/close)**
- Screens: Home, Quiz, Progress, **Settings (account)**
- Assessment widgets: MultipleChoice, DragDrop
- Hooks: useSpacedRepetition, useMastery, useQuizSession, **useSync**
- Gamification: Streak counter

**What NOT to build:**

- Paywall (no paid tiers yet)
- ImageMatch, Classification (only 2 types for MVP)
- Advanced analytics

**Deliverable:** Working iOS/Android app with free cloud sync

**Complexity:** Medium-High

**Timeline change:** +1 week (now 5 weeks instead of 4) for cloud sync implementation

---

### Phase 2: User Validation (Weeks 7-10) - REVISED dates

**Goal:** Get 50 users, measure retention, **test cloud sync**

**Distribution:**

- TestFlight (iOS)
- Google Play Internal Testing (Android)
- Recruit: teachers, Reddit, Facebook groups

**Metrics:**

- D1 retention: ___% (target >50%)
- D7 retention: ___% (target >30%)
- D30 retention: ___% (target >15%)
- Avg session: ___ min (target >3min)
- **Cloud sync test:** Ask users to switch devices, verify progress transfers correctly

**Decision point:**

- D7 >30%: Proceed to Phase 3
- D7 20-30%: Fix core loop
- D7 <20%: Product broken, pivot/kill

**No coding.** Just testing + analysis.

---

### Phase 3A: Add TOEFL to Content Tool (Week 11) - REVISED date

**Goal:** Generate DB with Foundation + TOEFL

**Tasks:**

- [ ]  Source TOEFL word list (count determined by sourcing, not pre-committed)
- [ ]  Add audio files (ElevenLabs or comparable premium TTS)
- [ ]  Run: `npx lexitap-tool enrich --tier toefl --add-audio`
- [ ]  Export: `npx lexitap-tool export`

**Deliverable:** Updated `words.db` with TOEFL + audio

---

### Phase 3B: Add Paywall to Mobile App (Week 11) - REVISED date

**Goal:** In-app purchase for TOEFL

**What to build:**

- Paywall screen
- Apple/Google IAP integration (`expo-in-app-purchases`)
- Entitlement management (**via Supabase - already set up**)
- **Teacher referral code validation (Supabase)**
- **Promo code system (Supabase)**
- Restore purchases button

**Deliverable:** TOEFL unlocks after $14.99 purchase

**Complexity:** Medium (IAP is tricky)

---

### Phase 3C: Validate Paid Tier (Week 12) - REVISED date

**Goal:** First 10 paying users

**Tasks:**

- [ ]  Offer early adopter discount ($11.99 was $14.99)
- [ ]  Post in r/TOEFL, r/ESL
- [ ]  Track conversion

**Success:** 10+ paying users in 2 weeks

**Failure:** <5 paying users → iterate pricing/positioning

---

### Phase 4: Expand Paid Tiers — Launch Wave (Weeks 12-16)

**Goal:** Add IELTS, Business English, Common 3K, Premium Pass — the **launch-wave** paid tiers. GRE, GMAT, Idioms, and Phrasal Verbs are deliberately deferred to Phase 6 as post-launch content drops.

**Content tool (Weeks 12-13):**

- [ ]  Source IELTS
- [ ]  Source Business English
- [ ]  Source Common 3K
- [ ]  Import all
- [ ]  Export: `words.db` now has 6 launch tiers (counts TBD)

**Mobile app (Weeks 14-16):**

- [ ]  Add products to IAP
- [ ]  Update paywall UI
- [ ]  Implement Premium Pass logic (covers all paid tiers, including future post-launch drops)
- [ ]  Add ImageMatch, Classification widgets
- [ ]  Polish UX

**Deliverable:** Launch-wave product complete (6 tiers, 4 assessment types). Post-launch tiers (GRE, GMAT, Idioms, Phrasal Verbs) shipped via Phase 6 cadence.

---

### Phase 5: Launch Prep (Weeks 17-18)

**Goal:** App Store submission, marketing prep

**Tasks:**

- [ ]  App Store assets:
    - [ ]  Icon (1024×1024)
    - [ ]  Screenshots (6)
    - [ ]  Description
    - [ ]  Privacy policy
    - [ ]  Terms of service
- [ ]  Apple submission ($99/year)
- [ ]  Google submission ($25 one-time)
- [ ]  Support email: [support@lexicon-esl.com](mailto:support@lexicon-esl.com)
- [ ]  Landing page: [lexicon-esl.com](http://lexicon-esl.com)

**Deliverable:** Live on App Store

---

### Phase 6: Post-Launch — Growth + Content Drops (Week 19+)

**Goal:** Acquire users, iterate, expand paid catalog through monthly content drops.

**Growth tactics:**

- [ ]  Teacher referral network (primary)
- [ ]  Content marketing (blog posts)
- [ ]  Reddit presence (helpful comments)
- [ ]  TikTok/YouTube Shorts ("word of the day")
- [ ]  App Store Optimization (keywords)

**Content-drop cadence (target schedule; order may shift on conversion data):**

- [ ]  Week 22 — GRE Vocabulary ($14.99) ship
- [ ]  Week 26 — GMAT Vocabulary ($14.99) ship
- [ ]  Week 30 — Idioms & Expressions ($9.99) ship
- [ ]  Week 34 — Phrasal Verbs ($9.99) ship

Each drop requires: sourced word list → example sentences → quality review → (audio for premium tiers) → IAP product configured → paywall/UI updated → ship via app update + Premium Pass auto-unlock. Premium Pass holders get each new tier free as drops land.

**Iteration:**

- If retention drops: Fix spaced repetition
- If conversion low: Test pricing
- If feature requests: Add based on frequency

---

## Success Metrics by Phase

| Phase | Metric | Target |
| --- | --- | --- |
| Phase 0 | Interviews complete | 35 people |
| Phase 1 | App works | iOS + Android |
| Phase 2 | D7 retention | >30% |
| Phase 3 | Paying users | 10+ |
| Phase 4 | Revenue | $1K/month |
| Phase 5 | App Store | Live |
| Phase 6 | Users | 1,000+ |

---

## Critical Path Items

**Must finish before anything else:**

1. Phase 0 validation (Week 1)
2. Content tool (Week 2-3)
3. Foundation word list sourced (Week 1)

**Must finish before paid tiers:**

1. Free tier retention >30% (Week 9)
2. Willingness to pay validated (Week 10)

**Must finish before launch:**

1. Privacy policy written
2. Terms of service written
3. Support email set up
4. App Store assets created

---

## Timeline Summary

| Week | Milestone |
| --- | --- |
| 1 | Validation complete |
| 3 | Content tool done |
| 6 | Mobile MVP done (with cloud sync) |
| 10 | Retention data (50 users) |
| 11 | WTP validated |
| 12 | First paying users |
| 17 | All tiers complete |
| 19 | App Store launch |
| 21 | 1,000 users |

**Total: 21 weeks (5 months) from start to 1K users** (+1 week for cloud sync)

---

## What Could Go Wrong

**Week 1:** No one wants the app in validation

- **Action:** Pivot product thesis or kill

**Week 9:** D7 retention <20%

- **Action:** Fix spaced repetition algorithm, UX issues

**Week 11:** No one pays

- **Action:** Pivot to B2B (school licensing) or partnership

**Week 18:** App Store rejection

- **Action:** Fix issues, resubmit (add 1-2 weeks)

**Week 20:** <100 users acquired

- **Action:** Rethink GTM, invest in teacher network

---

## Next Actions (This Week)

1. **You:** Decide GTM path (confirmed: Teacher network + App Store)
2. **You:** Source Foundation word list (800 words)
3. **Me:** Generate all agent docs (conventions, plans, ADRs)
4. **You/Agent:** Build content tool (Week 2-3)
5. **You/Agent:** Build mobile MVP (Week 4-7)

---

## ☁️ Cloud Sync: Why It's FREE

**Decision made:** Cloud sync is included FREE for all users (not a paid feature)

**Critical insight:** Export ≠ Backup

- Users can export word lists to CSV/Anki/Quizlet (FREE)
- BUT export does NOT include progress data (mastery levels, review dates, streak, quiz history)
- Losing device = losing months of study progress = immediate churn

**Competitive reality:**

- Duolingo: Free cloud sync
- Quizlet: Free cloud sync
- Anki: Free cloud sync (AnkiWeb)
- Market expectation: Progress sync is standard, not premium

**Cost vs. benefit:**

- Server cost: $0/month until 50K users, then $25/month
- At 150K users: $25/month = $300/year = 0.4% of revenue
- Retention benefit: Prevents churn from device loss/upgrade
- LTV increase > server cost

**Implementation:**

- Supabase backend (already building for teacher referral system)
- Automatic sync on app open/close (non-blocking)
- Account required (email/password or Google Sign-In)
- Privacy-focused: No tracking, no ads, no data selling