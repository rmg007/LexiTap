# PROJECT OVERVIEW - Start Here

---
title: PROJECT OVERVIEW - Start Here
category: strategy
status: active
phase: 0
priority: P0
updated: 2026-05-22
load_order: 2
tags: [overview, project, documentation-structure, strategy, technical, marketing, agent-docs]
---

> Load order: 2 of 14. Load after SESSION_STATE.md. Contains doc index with statuses — use to navigate to specific files.

**Project Type:** Multi-tier vocabulary app with freemium model

**Target Market:** Global ESL learners (TOEFL/IELTS test-takers, professionals)

**Distribution:** Teacher referral network + App Store

**Timeline:** 21 weeks from validation to 1,000 users

---

## 📚 Documentation Structure

### Strategy Documents

**📋 Product Strategy Overview**

- Product tiers (Foundation, Advanced, TOEFL, IELTS, Business, Common 3K/9K, Premium Pass)
- Pricing strategy ($2.99-$29.99, one-time purchases)
- Market validation phases (0-6)
- GTM strategy (teacher network primary, App Store secondary)
- Revenue model (conservative: $90K/year, optimistic: $135K/year by Year 3)

**📅 Implementation Roadmap**

- 20-week timeline broken into 6 phases
- Two parallel tracks: Content Tool + Mobile App
- Critical path items and success metrics
- Risk mitigation strategies

### Technical Documents

**📊 Database Schema (Multi-Tier + Paywall)**

- Complete SQLite schema (9 tables)
- Mobile app tables: content_tiers, words, user_entitlements, user_progress, quiz_sessions, quiz_attempts
- Backend tables (Supabase): teachers, referrals, promo_codes
- Spaced repetition algorithm (exact intervals: 1, 3, 7, 14, 30 days)
- Query functions (TypeScript signatures)

**⚙️ Content Pipeline Architecture**

- Local CLI tool (Node.js)
- Commands: import, validate, enrich, export
- Word sourcing strategies
- Enrichment providers (OpenAI synonyms, ElevenLabs audio)
- Build script: one-command DB generation

### Marketing & Distribution

**🌐 Website + Teacher Referral System**

- Single-page HTML website ([lexitap.app](http://lexitap.app))
- Teacher referral tool (Supabase backend)
- Tiered commission structure (20-35% based on referrals)
- Student discount (20% with teacher code)
- Promo codes system (free unlocks for goodwill marketing)
- Admin panel for code management

### Agent Documentation

**🤖 [AGENTS_MOBILE_CONVENTIONS.md](./AGENTS_MOBILE_CONVENTIONS.md) - Mobile App Conventions**

- Stack: React Native (Expo) + TypeScript + SQLite
- Banned practices (no TextInput in quizzes, no network in core logic)
- File structure (domain, application, infrastructure, presentation)
- Testing requirements (75% coverage)
- Accessibility baseline (WCAG 2.1 Level AA)

**🏛️ Architecture - Clean & Domain-Driven**

- Hexagonal architecture (ports & adapters)
- Domain layer (100% reusable for future Schools app)
- Application layer (use cases for orchestration)
- Infrastructure layer (SQLite, IAP implementations)
- Presentation layer (LexiTap-specific React Native UI)
- Dependency injection examples

**🧠 Memory & Documentation Architecture**

- Markdown files as canonical store (20-year format)
- SQLite as rebuildable index (not source of truth)
- Capability-based mode detection (full/scripts/manual)
- Layered defense for Claude Code soft enforcement
- Migration path to custom local agent (~Year 2)
- Pluggable retrieval (BM25 today, hybrid later if needed)

---

## ✅ Implementation Checklist

### Phase 0: Validation (Week 1)

- [ ]  Interview 10 parents
- [ ]  Interview 5 high schoolers
- [ ]  Survey 20 TOEFL test-takers
- [ ]  Source Foundation word list (800 words)
- [ ]  Source TOEFL word list (600 words)

### Phase 1: Build (Weeks 2-6) - REVISED +1 week for cloud sync

- [ ]  Content Tool: import, validate, export commands
- [ ]  Mobile App: Expo setup, DB integration
- [ ]  **Supabase setup: auth + database**
- [ ]  **Account creation flow (email/password + Google Sign-In)**
- [ ]  **Cloud sync logic (background upload/download)**
- [ ]  Screens: Home, Quiz, Progress, **Settings (account)**
- [ ]  Assessment widgets: MultipleChoice, DragDrop
- [ ]  Hooks: useSpacedRepetition, useMastery, useQuizSession, **useSync**

### Phase 2: Validation (Weeks 6-9)

- [ ]  Recruit 50 beta testers
- [ ]  Measure D7 retention (target >30%)
- [ ]  Collect qualitative feedback

### Phase 3: Paid Tier (Weeks 10-11)

- [ ]  Add audio to TOEFL (ElevenLabs ~$50)
- [ ]  Build paywall screen
- [ ]  Integrate Apple/Google IAP
- [ ]  Get 10 paying users

### Phase 4: Expansion (Weeks 12-16)

- [ ]  Add IELTS, Business English, Common 3K
- [ ]  Build Premium Pass logic
- [ ]  Add ImageMatch, Classification widgets
- [ ]  Polish UX (animations, haptics)

### Phase 5: Launch (Weeks 17-18)

- [ ]  Create App Store assets (icon, screenshots, description)
- [ ]  Write privacy policy + terms of service
- [ ]  Submit to Apple ($99/year) + Google ($25 one-time)
- [ ]  Set up support email
- [ ]  Launch website ([lexitap.app](http://lexitap.app))
- [ ]  Deploy teacher referral tool

### Phase 6: Growth (Week 19+)

- [ ]  Activate teacher network
- [ ]  Content marketing (blog, Reddit, TikTok)
- [ ]  App Store Optimization
- [ ]  Monitor retention, conversion, revenue

---

## 🎯 Success Metrics

| Metric | Target | Status |
| --- | --- | --- |
| Phase 0 validation | 35 interviews | ◯ Not started |
| D7 retention | >30% | ◯ Pending Phase 2 |
| First paying users | 10 users | ◯ Pending Phase 3 |
| Monthly revenue | $1,000 | ◯ Pending Phase 4 |
| Total users | 1,000 | ◯ Pending Phase 6 |

---

## 🚨 Critical Decisions Made

1. **ESL-first positioning** (not Schools) - bigger market, higher WTP
2. **Teacher referral network** - primary GTM channel
3. **Tiered commission** (20-35%) - gamification for teachers
4. **One-time purchases** (not subscriptions) - psychological fit
5. **TOEFL priority** - highest WTP, audio required
6. **Clean architecture** - enables future Schools app reuse
7. **Supabase backend** - for teacher/referral system + cloud sync
8. **Promo codes** - for goodwill marketing (plumber, friend codes)
9. **☁️ Cloud sync: FREE for all users** - competitive necessity, prevents churn from device loss
10. **🧠 Memory architecture: Markdown canonical + SQLite index** - designed for 20-year longevity, agent-runtime independent
11. **🔮 Local agent migration: ~Year 2** - move from Claude Code (soft enforcement) to custom local agent (hard enforcement) when project proves alive

---

## 📈 Revenue Projections

### Year 1 (Conservative)

- Free users: 10,000
- Conversion: 3%
- Paying users: 300
- ARPPU: $12
- **Revenue: $3,600**

### Year 2 (Growth)

- Free users: 50,000
- Conversion: 5%
- Paying users: 2,500
- ARPPU: $12
- **Revenue: $30,000**

### Year 3 (Mature)

- Free users: 150,000
- Conversion: 5%
- Paying users: 7,500
- ARPPU: $12
- **Revenue: $90,000**
- Teacher commissions (25% avg): -$22,500
- **Net: $67,500**

### Year 3 (Optimistic - TOEFL Focus)

- Free users: 60,000
- Conversion: 15% (desperate audience)
- Paying users: 9,000
- ARPPU: $15
- **Revenue: $135,000**
- Teacher commissions (25% avg): -$33,750
- **Net: $101,250**

---

## 🔧 Tech Stack Summary

**Mobile App:**

- React Native 0.73+ (Expo SDK 50)
- TypeScript 5.x (strict mode)
- SQLite (expo-sqlite)
- TanStack Query v5 + Zustand
- expo-router (navigation)
- Jest + Testing Library

**Content Tool:**

- Node.js 20 LTS
- TypeScript
- SQLite
- CLI (commander.js)

**Backend (Cloud Sync + Teacher System):**

- Supabase (Postgres + Auth + Edge Functions)
- PostgreSQL (user_accounts, user_progress_sync, teachers, referrals, promo_codes)
- **Cost:** $0/month (free tier until 50K users), then $25/month

**Website:**

- Static HTML + Tailwind CSS
- Vercel (free hosting)
- Domain: [**lexitap.app**](http://lexitap.app) ($20/year)

---

## 📝 Next Actions

**This Week:**

1. Review all documentation
2. Make final GTM decision
3. Source Foundation + TOEFL word lists

**Next Week:**

- Begin Phase 0 validation interviews
- Start building content tool

**Week 4:**

- Begin mobile app development
- Generate first `words.db` file

---

## 📌 Important Links

**Notion Database:** [Lexicon ESL Documentation Hub](../Lexicon%20ESL%20Documentation%20Hub%209bbc4230030c4052a43d34a0d4d74975.md)

**Future Links:**

- Website: [lexitap.app](http://lexitap.app) (pending)
- Teacher Portal: [lexitap.app/teachers](http://lexitap.app/teachers) (pending)
- GitHub: TBD
- App Store: TBD
- Google Play: TBD

---

## ℹ️ Notes

All documentation created: May 22, 2026

Based on: 3-hour strategic planning session

Architecture: Clean/Hexagonal with Domain-Driven Design

Ready for: Agent-driven development

**The foundation is built. Time to execute.**

---

## ☁️ Cloud Sync Decision (Updated)

**Decision:** Cloud sync is **FREE** for all users (not a paid feature)

**Why:**

- Export ≠ Backup: Users can export word lists, but NOT their progress (mastery levels, review dates, streak, quiz history)
- Device loss = catastrophic: Losing phone = losing months of TOEFL prep = immediate churn
- Competitive standard: Duolingo, Quizlet, Anki all offer free cloud sync
- Small cost, big benefit: $0/month until 50K users, then $25/month (~0.4% of revenue at scale)
- Better retention: Users don't quit after dropping phone or upgrading device

**Implementation:**

- Supabase backend (already building for teacher system)
- Account required (email/password or Google Sign-In)
- Automatic sync on app open/close (background, non-blocking)
- Privacy-focused: No tracking, no ads, no data selling

**Timeline Impact:** +1 week to Phase 1 (now 6 weeks instead of 5)

---

## 🧠 Memory Architecture Decision (Updated 2026-05-22)

**Decision:** Markdown files as canonical store + SQLite as rebuildable index. Designed for 20-year project longevity, agent-runtime independent.

**Why:**

- Markdown survives any tooling change (universal format)
- SQLite is rebuildable from markdown at any time (insurance)
- Retrieval is behind an interface (swap backends freely)
- No vendor lock-in (Notion, proprietary formats avoided)
- Same data layer works for Claude Code today AND custom local agent in Year 2

**Three-tier access mode (capability detection):**

- **full** — Native tool calls (Year 2+, after local agent built)
- **scripts** — CLI scripts (Year 1, current Claude Code reality)
- **manual** — Fallback only (agent must ask user, never write directly)

**Layered defense (Claude Code era):**

1. [CLAUDE.md](../CLAUDE.md) guidance with self-check patterns
2. Path-of-least-resistance tooling (`npm run memory:*`)
3. Git pre-commit hooks (catch drift at commit time)
4. Continuous validation script
5. Quarterly rebuild test (proves recoverability)

**Local agent migration target:** ~12 months. Will switch from soft enforcement (Claude Code) to hard enforcement (custom runtime with sandboxed tools).

**Full specification:** See "🧠 Memory & Documentation Architecture" document in this database.

---

## 🔮 Local Agent Migration Plan

**Status:** Planned for Year 2 (~12 months out)

**Why migrate:**

- Claude Code cannot truly sandbox memory tools (only guidance)
- Custom agent runtime can enforce tool contracts hard
- 20-year project benefits from ironclad enforcement
- Hand-off to other agents/systems requires it

**Migration is data-safe:**

- Markdown files remain canonical (no migration needed)
- SQLite index rebuilds automatically
- Only the tool layer changes
- [CLAUDE.md](../CLAUDE.md) gains new "full" mode branch

**Triggers to accelerate timeline:**

- Drift exceeds 20% of tasks (soft enforcement failing)
- You hand off project to others
- You add multiple concurrent agents
- Project hits commercial scale

**If never migrated:** Project still works in "scripts" mode indefinitely. The plan is robust either way.

---

## 📋 Planning Backlog (40 Items)

**See:** "📋 Planning Backlog — 40 Items" document in this database.

This is the master list of everything that needs planning beyond what's already documented. Items are categorized by priority and have explicit triggers for when to plan them deeply.

**Summary breakdown:**

- 🔴 **P0 — Must Plan Before Launch:** 10 items (privacy, legal, security baseline, support, ASO)
- 🟠 **P1 — Plan Within First 3 Months:** 11 items (security depth, backups, analytics, payments, business setup)
- 🟡 **P2 — Plan Within First Year:** 9 items (threat model, content refresh, gamification, marketing)
- 🟢 **P3 — Plan When Triggered:** 6 items (localization, platforms, AI/ML, open source, community)
- 🔵 **P4 — Strategic Reflection:** 4 items (annual reviews, bus factor, reputation)

**Critical insight:** Product is well-planned. Business infrastructure around the product is NOT. This backlog closes that gap incrementally as triggers fire.

**Next review:** Week 2 (when first triggers expected to fire — IP licensing, secrets management)