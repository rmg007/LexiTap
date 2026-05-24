# Planning Backlog

---
title: Planning Backlog (47 items)
category: strategy
status: active
phase: 0
priority: P0
updated: 2026-05-23
load_order: 9
tags: [backlog, planning, triggers, p0, p1, p2, p3, p4, content-sourcing, srs, worktrees, onboarding, competitive, privacy, ci-cd]
---

> Load order: 9 of 14. Load when checking trigger status or planning upcoming work. Items 41-49 appended at the bottom under "Items Not Yet Captured."

## Table of Contents

- [Priority Tiers](#priority-tiers)
- [P0 - Must Plan Before Launch](#p0--must-plan-before-launch) (items 1-10)
- [P1 - Plan Within First 3 Months](#p1--plan-within-first-3-months-post-launch) (items 11-21)
- [P2 - Plan Within First Year](#p2--plan-within-first-year) (items 22-30)
- [P3 - Plan When Triggered](#p3--plan-when-triggered) (items 31-36)
- [P4 - Strategic Reflection Annual](#p4--strategic-reflection-annual) (items 37-40)
- [Trigger Tracking](#trigger-tracking)
- [Review Cadence](#review-cadence)
- [How to Use This Document](#how-to-use-this-document)
- [Items Not Yet Captured](#items-not-yet-captured) (items 41-49 — trigger met)

---

**Purpose:** Capture all areas requiring planning before/during/after launch. Each item has a description, priority, and trigger condition for when to plan it deeply.

**Status:** Not yet planned in detail. This is the master list. Each item will get its own document when its trigger fires.

**Usage:** Review during quarterly planning sessions. Move items into active planning when triggers are met.

---

## Priority Tiers

- 🔴 **P0 — Must Plan Before Launch** (App Store submission depends on these)
- 🟠 **P1 — Plan Within First 3 Months** (Post-launch operational needs)
- 🟡 **P2 — Plan Within First Year** (Scaling and sustainability)
- 🟢 **P3 — Plan When Triggered** (Future expansion, conditional)
- 🔵 **P4 — Strategic Reflection** (Annual review items)

---

## 🔴 P0 — Must Plan Before Launch

These items block App Store submission or expose the project to legal/operational risk if unaddressed.

### 1. Privacy Policy & Terms of Service

**Description:** Legal documents required by Apple/Google for app submission. Must comply with GDPR (EU), CCPA (California), COPPA (under-13 users).

**Why it matters:** Cannot submit to App Store without these. Cloud sync means processing personal data triggers GDPR.

**Scope:** Privacy policy, terms of service, cookie policy, data processing agreement template.

**Trigger to plan:** Week 14 (before Phase 5 launch prep)

**Estimated planning time:** 2-3 days (template-based, then customize)

**Dependencies:** Need to know exact data flows (Supabase, ElevenLabs, etc.)

### 2. Data Protection & Compliance Strategy

**Description:** How user data is collected, processed, retained, and deleted across all systems.

**Why it matters:** GDPR Article 17 (right to be forgotten), Article 20 (data portability). EU/UK users have legal rights.

**Scope:** Data retention policy, deletion cascade procedures, data export mechanism, subprocessor list, breach response plan.

**Trigger to plan:** Week 14 (with privacy policy)

**Estimated planning time:** 2-3 days

**Dependencies:** Database schema (already planned), all third-party vendors identified

### 3. Age Verification & Minors Strategy

**Description:** How to handle users under 18, especially under 13 (COPPA in US). ESL learners include minors.

**Why it matters:** COPPA violations carry $50K+ fines per child. Apple has Family Sharing rules. App rating affects discoverability.

**Scope:** Age gate at signup, parental consent flow, App Store age rating selection, restricted features for minors.

**Trigger to plan:** Week 14 (before submission)

**Estimated planning time:** 1-2 days

**Dependencies:** Account creation flow design

### 4. Intellectual Property & Content Licensing

**Description:** Word list sourcing, trademark usage (TOEFL®, IELTS® are registered), audio rights, user-generated content policies.

**Why it matters:** Cannot sell content you don't have rights to. "TOEFL" used in product name = ETS trademark issue. ElevenLabs has commercial use restrictions.

**Scope:** Trademark fair use analysis (TOEFL®, IELTS® are registered marks — confirm descriptive fair use is sufficient for tier naming, per Magoosh/Kaplan precedent); audio licensing terms review (ElevenLabs commercial use terms); UGC policy if custom lists added later. **No source documentation required** — word lists were personally collected by the founder over 35 years; individual English words are not copyrightable expression; LexiTap’s definitions, example sentences, audio, and images are entirely original generated content.

**Trigger to plan:** Week 2 (before content tool is built)

**Estimated planning time:** 2 days

**Dependencies:** Word list sourcing decisions, audio provider selection

### 5. Secrets Management

**Description:** Where API keys, credentials, and sensitive config live during development and production.

**Why it matters:** Leaked Supabase key = data breach. Leaked OpenAI key = financial loss. Cannot ship with hardcoded secrets.

**Scope:** .env strategy for development, EAS secrets for production, rotation policy, access control (currently just you), git ignore rules.

**Trigger to plan:** Week 2 (before any API integration)

**Estimated planning time:** Half day

**Dependencies:** None (do this early)

### 6. Monitoring & Observability

**Description:** How to detect when the app breaks in production, before users complain.

**Why it matters:** Silent failures destroy trust. Sync errors that go unnoticed = lost progress = churn.

**Scope:** Error tracking tool selection (Sentry/PostHog/self-hosted), crash reporting (iOS/Android), Supabase logs review, sync failure alerting.

**Trigger to plan:** Week 13 (before launch)

**Estimated planning time:** 1 day

**Dependencies:** Production architecture finalized

### 7. Customer Support Process

**Description:** What happens when users email [support@lexitap.app](mailto:support@lexitap.app). Response time commitments, common issues KB, escalation path.

**Why it matters:** Bad support reputation kills word-of-mouth. App Store reviews mention support quality.

**Scope:** Email handling workflow, response SLA (24-72hr), template responses for common issues, bug intake process, refund handling.

**Trigger to plan:** Week 14 (before launch)

**Estimated planning time:** 1 day

**Dependencies:** Email setup, first beta feedback identifies common issues

### 8. CI/CD Pipeline

**Description:** Automated testing, building, and deployment from local machine to App Store.

**Why it matters:** Manual deployments are error-prone. Tests must run on every commit to catch regressions.

**Scope:** GitHub Actions config, Expo EAS Build setup, test automation, lint/type-check on PRs, deployment scripts for iOS/Android.

**Trigger to plan:** Week 3 (alongside initial mobile app build)

**Estimated planning time:** 1-2 days

**Dependencies:** Project scaffolded, basic tests exist

### 9. Onboarding Flow

**Description:** First-time user experience: signup, CEFR assessment, goal-setting, daily target, permissions.

**Why it matters:** D1 retention is determined here. If users don't reach "aha moment" in first session, they churn.

**Scope:** Wireframes for each onboarding screen, CEFR self-assessment vs. test, goal selection options, notification permission timing, account creation flow.

**Trigger to plan:** Week 4 (before building mobile app screens)

**Estimated planning time:** 2 days

**Dependencies:** Brand identity, design system

### 10. App Store Optimization (ASO) Strategy

**Description:** Keyword research, screenshot design, description copy, review solicitation, competitive positioning in App Store.

**Why it matters:** Organic App Store traffic is your second-biggest acquisition channel (after teacher referrals). ASO determines if anyone finds you.

**Scope:** Keyword research per region, screenshot variations for A/B testing, app description copy, review prompt timing logic, competitor analysis.

**Trigger to plan:** Week 17 (during launch prep)

**Estimated planning time:** 2-3 days

**Dependencies:** App polished, screenshots ready

---

## 🟠 P1 — Plan Within First 3 Months Post-Launch

These items become urgent once real users are using the app.

### 11. Security Architecture

**Description:** Comprehensive review of attack surface, authentication, session management, rate limiting, input sanitization.

**Why it matters:** Defensive baseline. Most apps don't get attacked, but the ones that do, get destroyed.

**Scope:** Auth flow security review, Supabase RLS policies, API rate limiting, input validation, OWASP mobile top 10 checklist.

**Trigger to plan:** Month 2 (post-launch, when first real traffic exists)

**Estimated planning time:** 2 days

**Dependencies:** Production deployment exists

### 12. Backup & Disaster Recovery

**Description:** What happens if Supabase loses your data, your laptop dies, or your account is locked.

**Why it matters:** Single points of failure are unacceptable. Need redundancy.

**Scope:** Supabase backup verification, off-platform user data export, code repository mirroring, recovery time objectives (RTO/RPO).

**Trigger to plan:** Month 2 (after first 100 paying users)

**Estimated planning time:** 1 day

**Dependencies:** Production data exists

### 13. Privacy-Respecting Analytics

**Description:** Measure what matters (retention, conversion, funnels) without tracking users invasively.

**Why it matters:** You said "no tracking" but need SOME metrics. Otherwise you're flying blind.

**Scope:** What to measure (cohort retention, funnel conversion), how (self-hosted PostHog vs. Plausible vs. App Store/Play Console only), opt-in vs. anonymous, privacy policy implications.

**Trigger to plan:** Month 1 (before first 1000 users)

**Estimated planning time:** 1 day

**Dependencies:** Privacy policy aligned

### 14. Deployment Pipeline (Beyond CI/CD)

**Description:** Release process, version numbering, rollback strategy, beta testing flow.

**Why it matters:** Bad release = bad reviews = lost users. Need ability to ship safely.

**Scope:** Semantic versioning rules, release notes template, TestFlight/Play Internal Testing workflow, rollback procedure if release breaks production.

**Trigger to plan:** Week 17 (with launch prep)

**Estimated planning time:** 1 day

**Dependencies:** CI/CD pipeline exists

### 15. Business Entity & Tax Structure

**Description:** Sole prop vs. LLC vs. S-Corp, sales tax handling, bookkeeping system, annual tax filing.

**Why it matters:** Personal liability protection (LLC), tax efficiency, professional credibility for teacher payouts.

**Scope:** Entity type decision, formation process, business bank account, bookkeeping software selection (Wave/QuickBooks), sales tax nexus analysis.

**Trigger to plan:** Month 1 post-launch (or earlier if revenue starts pre-launch)

**Estimated planning time:** 1 day research + execution time varies

**Dependencies:** First revenue projected

### 16. Payment Infrastructure for Teachers

**Description:** How teachers actually receive commissions. Manual works for 1-10 teachers, breaks at 50+.

**Why it matters:** Teacher referral network is your primary GTM. If they don't get paid reliably, network dies.

**Scope:** PayPal Mass Payments vs. Stripe Connect vs. Wise API, currency handling, minimum payout threshold, 1099 reporting for US teachers earning >$600/year.

**Trigger to plan:** Month 2 (after first 20 teachers earning)

**Estimated planning time:** 2 days

**Dependencies:** Teacher referral system live

### 17. Pricing Strategy Evolution

**Description:** When and how to raise prices, regional pricing, grandfathering existing users.

**Why it matters:** Initial prices are guesses. Real data tells you what to charge. Need framework for changing.

**Scope:** A/B testing framework for pricing, regional pricing (India/Brazil/etc.), grandfather policy, communication template for price changes.

**Trigger to plan:** Month 3 (after first 100 paying users provide data)

**Estimated planning time:** 1 day

**Dependencies:** Conversion data exists

### 18. Financial Sustainability Framework

**Description:** Decision tree for whether this is a side project, full-time, or should be wound down.

**Why it matters:** Don't keep grinding on something that's not viable. Don't kill something that's working.

**Scope:** Minimum revenue thresholds at each phase, decision criteria for going full-time, exit options (sell/open-source/abandon), personal sustainability budget.

**Trigger to plan:** Month 3 (after revenue data exists)

**Estimated planning time:** Half day

**Dependencies:** Revenue data, personal financial situation

### 19. Content Quality Assurance Process

**Description:** Who reviews word definitions, example sentences, audio quality before they ship to users.

**Why it matters:** A wrong definition in TOEFL pack = refund requests + bad reviews + reputation damage.

**Scope:** Native speaker review process, error reporting from users, content versioning, correction workflow.

**Trigger to plan:** Week 11 (before TOEFL pack ships)

**Estimated planning time:** 1 day

**Dependencies:** Content pipeline operational

### 20. Notification Strategy

**Description:** When and how to send push notifications without being annoying.

**Why it matters:** Notifications drive retention. But over-notification = uninstalls.

**Scope:** Notification types (daily reminder, streak protection, review due), permission ask timing (NOT first launch), frequency caps, quiet hours, opt-out flows.

**Trigger to plan:** Month 1 post-launch

**Estimated planning time:** 1 day

**Dependencies:** Onboarding flow, first user behavior data

### 21. Pre-Launch Marketing

**Description:** Building audience BEFORE launch so day-1 isn't crickets.

**Why it matters:** "If you build it, they will come" is a lie. Pre-launch awareness drives launch-day traction.

**Scope:** Waitlist landing page, email collection, teacher pre-recruitment, Reddit/community presence, content seeding.

**Trigger to plan:** Week 10 (during paid tier validation, 8 weeks before launch)

**Estimated planning time:** 1 day

**Dependencies:** Brand identity, landing page

---

## 🟡 P2 — Plan Within First Year

Longer-term operational and growth items.

### 22. Threat Model

**Description:** Who might attack the app, what they'd want, what's defensible vs. accepted risk.

**Why it matters:** Realistic threat model prevents both under-protection (breach) and over-protection (paranoia).

**Scope:** Attacker personas (content pirates, data breachers, competitors), attack vectors, defense priorities, accepted risks documentation.

**Trigger to plan:** Month 6 (after enough users to be a target)

**Estimated planning time:** 1 day

**Dependencies:** Production architecture stable

### 23. Content Refresh Strategy

**Description:** How and when to update content as English evolves and tests change.

**Why it matters:** TOEFL changes annually. Stale content = bad results = bad reviews.

**Scope:** Annual review cadence per word pack, exam change monitoring (ETS announcements), update rollout strategy, user notification of content updates.

**Trigger to plan:** Month 6 (after first paid pack live)

**Estimated planning time:** Half day

**Dependencies:** Paid packs live, sales data exists

### 24. Gamification System Design

**Description:** Beyond streaks — the full gamification layer (achievements, leaderboards, daily goals).

**Why it matters:** Done right: retention boost. Done wrong: feels manipulative, destroys intrinsic motivation.

**Scope:** Achievement system, optional leaderboards (self vs. teacher's class), daily/weekly goals, progress visualization, anti-patterns to avoid.

**Trigger to plan:** Month 4 (after retention baseline known)

**Estimated planning time:** 2 days

**Dependencies:** Retention data shows engagement drop-offs

### 25. Re-engagement & Churn Recovery

**Description:** Win back users who stopped opening the app.

**Why it matters:** Reactivation is cheaper than acquisition. Most users churn silently.

**Scope:** Email re-engagement (you have email from cloud sync signup), push notification triggers, win-back offers, exit survey for uninstalls.

**Trigger to plan:** Month 4 (after first churn cohort identified)

**Estimated planning time:** 1 day

**Dependencies:** Cohort retention data

### 26. Content Marketing Strategy

**Description:** Blog, YouTube, TikTok presence for organic acquisition.

**Why it matters:** Long-term SEO compounds. Teacher network is great but content amplifies it.

**Scope:** Blog topic clusters, YouTube format decisions, TikTok cadence, content calendar, repurposing workflow.

**Trigger to plan:** Month 6 (after product validated, ready to amplify)

**Estimated planning time:** 2 days

**Dependencies:** Product working, basic GTM proven

### 27. Student Viral Mechanics

**Description:** Student-to-student sharing beyond teacher referrals.

**Why it matters:** Teacher network is one channel. Peer sharing is another. Both compound.

**Scope:** Share-achievement features, study-group functionality, leaderboard sharing, social media integration.

**Trigger to plan:** Month 8 (after teacher network proven)

**Estimated planning time:** 1 day

**Dependencies:** Teacher referral metrics show viral potential

### 28. Long-Term Product Roadmap

**Description:** What does LexiTap look like in Year 2, 3, 5?

**Why it matters:** Year 1 plan is detailed; beyond is fog. Need vision to guide annual planning.

**Scope:** Year 2 features (Schools app?), Year 3 (other languages?), Year 5 (platform expansion?), explicit "will not build" list.

**Trigger to plan:** Month 9 (end of Year 1, planning Year 2)

**Estimated planning time:** 2-3 days

**Dependencies:** Year 1 data and learnings

### 29. Vendor Lock-In Audit

**Description:** For each third-party dependency, what's the migration plan if they disappear?

**Why it matters:** 20-year project will outlive most vendors. Need exit strategy for each.

**Scope:** Supabase → self-hosted Postgres path, ElevenLabs → alternative TTS, Expo → bare React Native, Apple/Google → ?, OpenAI → alternatives.

**Trigger to plan:** Month 12 (annual review)

**Estimated planning time:** 1 day

**Dependencies:** Production architecture stable

### 30. Legal Risk Scenarios

**Description:** Specific risks like DMCA takedowns, copyright claims, data breaches, App Store rejections.

**Why it matters:** Prepared response > panicked response.

**Scope:** Playbook for each scenario (DMCA, copyright, breach, App Store rejection, user lawsuit), legal counsel relationships, insurance evaluation.

**Trigger to plan:** Month 6 (when stakes increase)

**Estimated planning time:** 1 day

**Dependencies:** Active user base exists

---

## 🟢 P3 — Plan When Triggered

Conditional items — only plan when specific signals appear.

### 31. Localization Strategy

**Description:** Translating UI into Spanish, Portuguese, Mandarin, Arabic, etc.

**Why it matters:** ESL learners speak many languages. UI in their native language = better conversion.

**Trigger to plan:** When >30% of traffic comes from non-English-primary markets

**Estimated planning time:** 2 days when triggered

### 32. Accessibility Beyond WCAG 2.1 AA

**Description:** Dyslexia-friendly fonts, color-blind modes, reading speed adjustments, audio descriptions.

**Why it matters:** Beyond compliance, accessibility is good business. Underserved markets.

**Trigger to plan:** When user feedback explicitly requests these, OR when localizing (similar effort)

**Estimated planning time:** 1 day

### 33. Platform Expansion

**Description:** Web app, Wear OS / Apple Watch, smart TVs, tablets optimization.

**Why it matters:** Mobile-first doesn't mean mobile-only forever. New platforms = new users.

**Trigger to plan:** When mobile saturates AND specific platform shows demand signals

**Estimated planning time:** 2-3 days per platform

### 34. AI/ML Integration

**Description:** Personalized difficulty, adaptive spaced repetition, pronunciation assessment, AI tutor.

**Why it matters:** Modern users expect AI features. Differentiation from static apps.

**Trigger to plan:** When base product has 10K+ active users (enough data for personalization)

**Estimated planning time:** 3-5 days

### 35. Open Source Strategy

**Description:** Whether/which parts of the project to open source.

**Why it matters:** Open source content tool could attract contributors. Open source word lists build goodwill.

**Trigger to plan:** When project is stable AND you have bandwidth for community management

**Estimated planning time:** 1 day

### 36. Community Building

**Description:** User community (Discord/forum), teacher community, user-generated content moderation.

**Why it matters:** Community = retention + word-of-mouth + content. But requires moderation.

**Trigger to plan:** When user base requests community spaces (forum posts, social mentions)

**Estimated planning time:** 2 days

---

## 🔵 P4 — Strategic Reflection (Annual)

These aren't "plan once" — they're recurring strategic reviews.

### 37. Competitor Response Framework

**Description:** What to do when Duolingo adds tap-only, Quizlet acquires a competitor, or open-source alternative emerges.

**Cadence:** Quarterly review of competitive landscape

**Why it matters:** Reactive panic moves are worse than prepared responses.

**Estimated planning time:** Half day per quarterly review

### 38. Personal Risk & Bus Factor

**Description:** What happens if you get sick, want to step away, or lose interest?

**Cadence:** Annual

**Why it matters:** 20-year project depends on personal sustainability. "Bus factor" mitigation enables hand-off.

**Scope:** Documentation completeness check, hand-off procedures, code maintainability review, financial runway planning.

**Estimated planning time:** 1 day annually

### 39. Reputation Management Playbook

**Description:** How to respond to 1-star reviews, social media incidents, public bug reports.

**Cadence:** Establish once, review annually

**Why it matters:** Reactive responses are usually bad. Prepared playbook = consistent professional response.

**Estimated planning time:** 1 day initially, half day per annual review

### 40. Annual Strategic Review

**Description:** Full project health check: financial, product, market position, personal.

**Cadence:** Annual (anniversary of launch)

**Why it matters:** Without reviews, drift happens. 20-year projects need course corrections.

**Scope:** Revenue/retention analysis, competitor landscape, personal goals alignment, decisions to make for upcoming year.

**Estimated planning time:** 2-3 days annually

---

## Trigger Tracking

Use this section to mark when triggers fire and items move into active planning.

### Triggers Currently Met

- **Week 1** — #41 Content Sourcing Strategy (tier list expanded to 10 tiers; content is the explicit launch-blocker bottleneck)
- **Week 1** — #42 Knowji Competitive Teardown (closest direct competitor on paper feature surface; teardown needed before Brand Identity copy finalizes)
- **Week 1** — #43 SRS Forgiveness Mechanics Design (architectural decision locked 2026-05-22; specific design must precede Phase 1B scheduler code)
- **Week 1** — #44 WordUp Competitive Teardown (closest direct competitor on audience; teardown needed before Brand Identity copy finalizes)

### Triggers to Watch For

- Week 2: Triggers IP/licensing (#4), secrets management (#5)
- Week 3: Triggers CI/CD planning (#8)
- Week 4: Triggers onboarding flow planning (#9)
- Week 10: Triggers pre-launch marketing (#21)
- Week 11: Triggers content QA process (#19)
- Week 13: Triggers monitoring/observability (#6)
- Week 14: Triggers privacy policy (#1), data protection (#2), age verification (#3), customer support (#7)
- Week 17: Triggers ASO strategy (#10), deployment pipeline (#14)
- Month 1 post-launch: Triggers analytics (#13), notifications (#20), business entity (#15)
- Month 2 post-launch: Triggers security (#11), backups (#12), teacher payments (#16)
- Month 3 post-launch: Triggers pricing evolution (#17), financial framework (#18)
- Month 4 post-launch: Triggers gamification (#24), re-engagement (#25)
- Month 6 post-launch: Triggers threat model (#22), content refresh (#23), content marketing (#26), legal scenarios (#30)
- Month 8 post-launch: Triggers student viral (#27)
- Month 9: Triggers Year 2 roadmap (#28)
- Month 12: Triggers vendor lock-in audit (#29), annual review (#40)

---

## Review Cadence

**Weekly (during build phases):** Check if any new triggers are met

**Monthly (post-launch):** Review backlog, update priorities, mark triggers

**Quarterly:** Full backlog review, re-prioritize based on learnings

**Annually:** Strategic reflection items (#37-40)

---

## Document Status

- **Created:** 2026-05-22
- **Last reviewed:** 2026-05-22
- **Items planned in detail:** 0 / 47
- **Items with triggers met:** 5 (#41 Content Sourcing, #42 Knowji Teardown, #43 SRS Forgiveness Design, #44 WordUp Teardown — all Week 1; #47 Git Worktrees triggers Phase 1 Day 1; #46 triggers after repo creation)
- **Next review:** Week 2 (next batch of triggers expected: #4 IP/licensing, #5 secrets management)

---

## How to Use This Document

1. **Don't plan everything now.** Premature planning is wasted planning.
2. **Watch for triggers.** When a trigger fires, move that item to active planning.
3. **Create a new doc per item.** When planning deeply, each item gets its own Notion page with full specification.
4. **Update status here.** When an item is planned, note the link to its detailed doc.
5. **Adjust priorities.** Reality will shift priorities. Update this list quarterly.
6. **Add items as they emerge.** This isn't exhaustive. Add new items as the project teaches you about new needs.

---

## Items Not Yet Captured

*(Reserved for items discovered later. Add here when found.)*

### Item #41: Content Sourcing Strategy — 🔴 P0 (added 2026-05-22, trigger MET)

**Description:** End-to-end plan for sourcing, authoring, validating, and shipping vocabulary content across all 10 tiers (Foundation, Advanced, TOEFL, IELTS, Business, Common 3K, GRE, GMAT, Idioms, Phrasal Verbs).

**Why it matters:** Content is the launch-blocker bottleneck, not code. Each paid tier needs sourced word list + example sentences + audio (for premium-audio tiers) + quiz-distractor pool + content QA pass. Without an explicit strategy, content authoring becomes the unplanned variable that slips the timeline.

**✅ SOURCING RESOLVED 2026-05-23:** Word lists in hand. No scraping, no licensing required.

- **Foundation tier:** existing top 3,000 most-used word list
- **Advanced tier:** words 3,001–9,000 from existing top 9,000 most-used word list
- **TOEFL tier:** existing 3,000 TOEFL word list
- **Input formats supported:** CSV, Excel (XLSX), plain text (one word per line) — all three must be handled by the CLI tool

**The pipeline problem is purely enrichment.** Each word needs: definition, part of speech, example sentences, audio, and image. The CLI tool (Track A) ingests a raw word list and produces database-ready JSON.

---

**Pipeline Architecture — Stage-Gated Editorial Workflow**

Resource generation is NOT automatic. Human review gates every stage transition. Words can move backward (e.g., `resources_reviewed` → `needs_revision`) if quality fails.

**Six-Stage Content Flag (added 2026-05-23):**

- `needs_revision` — Word ingested; definition / examples / POS need human review
- `reviewed_audio_ready` — Content approved; queue for audio generation only
- `reviewed_audio_image_ready` — Content approved; queue for audio + image generation
- `resources_generated` — Audio/image generated; pending quality review
- `resources_reviewed` — Quality check passed; approved for production
- `live` — Published to production database

**Schema impact:** `enrichment_status` in `words` table must be an enum with these 6 values. Update Database Schema v2.1 before Phase 1B.

**Step 1 — Ingest**

CSV (first column) / XLSX (first sheet, first column) / plain text (one word per line). All imported words land at `needs_revision`. `frequency_rank` = source file row order.

**Step 2 — Enrich (LLM)**

Batch Claude API calls (50 words/batch). Per word: definition, POS, 2–3 example sentences, homonym flag. Status stays `needs_revision` — human review required before advancement.

**Step 3 — Human Review (multiple cycles)**

Founder reviews definition accuracy, example quality, POS. Multiple passes expected.

- `lexitap review` — shows next `needs_revision` word
- `lexitap approve --audio` — advances to `reviewed_audio_ready`
- `lexitap approve --audio-image` — advances to `reviewed_audio_image_ready`
- `lexitap flag` — keeps in `needs_revision` with note

**Step 4 — Resource Generation (manually triggered)**

`lexitap generate` — processes all `reviewed_audio_ready` and `reviewed_audio_image_ready` words.

Audio (all words, via ElevenLabs or equivalent premium TTS) — **6 clips per word, both accents:**

1. Pronunciation 🇺🇸 American English
2. Pronunciation 🇬🇧 British English
3. Definition read aloud 🇺🇸
4. Definition read aloud 🇬🇧
5. Example sentences 🇺🇸
6. Example sentences 🇬🇧

Both accents are displayed on the word card simultaneously — user taps either flag to hear that accent. This is a deliberate listening-skills feature, not a preference toggle. Both accents also power the Audio Playlist passive mode (Backlog #49).

**Schema impact:** Do NOT store 6 URL columns on the `words` table. Use a separate `word_audio` table:

`word_audio (id, word_id, clip_type ENUM[pronunciation, definition, examples], accent ENUM[us, gb], url, created_at)`

This is cleaner, extensible to future accents (Australian, etc.), and keeps the `words` table lean. Update Database Schema v2.1 before Phase 1B.

Image (`reviewed_audio_image_ready` only) — LLM-generated search query → Unsplash API → fallback Pexels → flag if no result.

Status advances to `resources_generated`.

**Step 5 — Resource Review**

- `lexitap review-resources` — plays audio, shows image
- `lexitap approve-resources` — advances to `resources_reviewed`
- `lexitap reject-resources` — returns to `needs_revision` or back to `reviewed_*` for regeneration

**Step 6 — Publish**

`lexitap publish` — batch-inserts all `resources_reviewed` words into production Supabase. Status advances to `live`.

**Enrichment Priority:** TOEFL (3,000) → Foundation (3,000, MVP can ship with first reviewed subset) → Advanced (6,000, top 2,000 for MVP).

**Revised Cost Estimate (3 audio clips/word × 12,000 words):**

- LLM enrichment: ~$12
- Audio (ElevenLabs, all tiers, **6 clips/word**, both accents): ~$0.01/clip × 6 × 12,000 = **~$720**
- Images (Unsplash): $0
- **Total: ~$372.** If budget is tight: ElevenLabs for TOEFL only (~$90); free TTS for Foundation/Advanced until revenue covers the upgrade.

**Open Technical Decisions (Week 2):**

1. Audio format: MP3 vs. AAC
2. Supabase Storage path: `word_audio/{word_id}/{accent}/{clip_type}.mp3` (recommended — clean for both accents)
3. Publish command: tier-batch with dry-run preview (recommended)
4. Review CLI: terminal-based for now; web UI is Backlog #34 territory

**Updated total audio cost: ~$732** (6 clips/word × 12,000 words × $0.01). Budget path: ElevenLabs TOEFL first (~$180); free TTS for Foundation/Advanced until revenue covers the upgrade.

**Step 1 — Ingest**

Accept three input formats:

- **CSV:** parse first column; detect "word" header if present; strip whitespace
- **XLSX:** first sheet, first column; strip whitespace
- **Plain text:** one word per line; strip whitespace and empty lines

Output: deduplicated, normalized word array. `frequency_rank` = source file row order.

**Step 2 — Enrich (LLM)**

Batch Claude API calls (50 words per batch via Anthropic Batch API for cost efficiency).

Per word, generate:

- Primary definition (most common real-world usage; conversational not dictionary-formal)
- Part of speech (noun / verb / adjective / adverb / phrase)
- 2–3 example sentences (realistic ESL contexts: professional life, academic settings, daily conversation)
- Homonym flag: if the word has 3+ very different meanings, flag for human review

**Step 3 — Audio**

- **TOEFL tier:** ElevenLabs TTS (premium voice quality; pronunciation value justifies cost ~$0.01/word × 3,000 = ~$30)
- **Foundation + Advanced:** free TTS (Expo-Speech or Web Speech API; adequate for pronunciation reference)
- Output: MP3 files → upload to Supabase Storage → store URL in word record

**Step 4 — Image**

- Use LLM-generated descriptive query (e.g., for "velocity": "fast movement speed racing") to search Unsplash API (free, commercial use)
- Download first high-quality result → upload to Supabase Storage → store URL
- Fallback: Pexels API if Unsplash returns no result
- If no image found: flag word for manual image assignment; do not block pipeline

**Step 5 — Validate (Quality Control)**

Auto-flag for human review queue if:

- Proper noun (capitalized)
- Very short (<3 characters)
- Duplicate across tier lists (preserve `tier_slug`; log the collision)
- Homonym flag set by LLM in Step 2
- No image found after both Unsplash + Pexels exhausted
- LLM returns low-confidence definition (detected via sentinel prompt)

Output: `enriched_words.json` (complete records) + `review_queue.json` (flagged words)

**Step 6 — Export**

Output JSON matching Database Schema v2.1:

```
{
  "word": "ubiquitous",
  "tier_slug": "toefl",
  "definition": "present or found everywhere",
  "part_of_speech": "adjective",
  "example_sentences": [
    "Smartphones have become ubiquitous in modern offices.",
    "The company's branding is ubiquitous across major cities.",
    "Social media has made English ubiquitous in global business."
  ],
  "audio_url": "https://[supabase]/storage/.../ubiquitous.mp3",
  "image_url": "https://[supabase]/storage/.../ubiquitous.jpg",
  "frequency_rank": 2847,
  "source_list": "toefl_3000",
  "enrichment_status": "complete"
}
```

---

**Enrichment Priority Order:**

1. **TOEFL** (3,000 words) — first paid tier; needed for Phase 3 (Week 12–15)
2. **Foundation** (3,000 words) — needed for Phase 1 MVP (Weeks 4–9)
3. **Advanced** (6,000 words) — MVP can ship with top 2,000; full list post-launch

**Cost Estimate (enrichment only):**

- LLM (Claude Batch API): ~$0.001/word × 12,000 = **~$12 total**
- Audio (ElevenLabs, TOEFL only): ~$0.01/word × 3,000 = **~$30**
- Audio (free TTS, Foundation + Advanced): **$0**
- Images (Unsplash API): **$0** (commercial use free)
- **Total estimated: ~$42 for full initial enrichment pass**

**Open Technical Decisions (resolve during Week 2 build):**

1. Batch size: 50 vs. 100 words per LLM call (speed vs. quality consistency)
2. Audio format: MP3 vs. AAC (cross-platform compatibility)
3. Audio + image steps run in-pipeline vs. as separate post-processing passes (recommendation: **separate** — allows re-running enrichment without regenerating audio/images)
4. Image storage path convention in Supabase Storage (by tier or flat?)

**Why P0 not P1:** Without this, Phase 0 Week 1 "source Foundation word list" task has no concrete plan; Phase 3A TOEFL build assumes word list materializes; Phase 4 launch wave assumes IELTS/Business/Common 3K materialize. The longest-pole content path determines the launch date.

**Trigger to plan:** **NOW** — Phase 0, Week 1. Cannot start content tool dev (Week 2-3) without knowing what flows through it.

**Estimated planning time:** 2 days for the strategy doc; ongoing execution across the 21-week roadmap.

**Dependencies:**

- #4 IP / Content Licensing (sourcing legality)
- #19 Content QA Process (review pipeline)
- Audio provider decision (currently ElevenLabs in plan; re-evaluate per tier)
- Content tool CLI (Track A in Implementation Roadmap)

**Approved autonomous tool for content sourcing:** `npx -y firecrawl-cli@latest` — the coding agent can use Firecrawl autonomously to scrape JS-heavy ESL word list sources, frequency corpora, and competitor vocabulary sets, converting them to clean Markdown for import. No manual intervention needed.

**Cross-reference:** Session State Decision Log entry 2026-05-22 ("Audience Split: LexiTap = ESL-Only"); Product Strategy Overview Decision Point #4. — 🔴 P0 (added 2026-05-22, trigger MET)

**Description:** Hands-on evaluation + structured competitive teardown of Knowji (AI-driven visual + audio memorization with prebuilt thematic lists and an imagery-based memory coach — ~$10/mo / ~$120/yr). Knowji is LexiTap's closest direct competitor on paper: same value prop, adjacent audience, ~4× the price.

**Why it matters:** Before launch positioning, brand copy, or App Store listing are locked, need first-person evaluation of:

- What Knowji actually delivers vs. its marketing claims
- Where Knowji is weak (where LexiTap can credibly out-position)
- Where Knowji is strong (where LexiTap shouldn't claim parity)
- Whether Knowji's "memory coach using imagery" is materially better than LexiTap's planned ImageMatch widget
- Whether their $120/yr is supported by real delivered value or, like ELSA Speak per the 2026-05-22 founder hands-on (see Competitive Analysis Field Notes), it overshoots felt value

**Scope:**

- Purchase + use Knowji for 1-2 weeks (monthly billing ~$10)
- Document feature inventory, UX quality, content quality, IAP structure
- Specifically evaluate visual mnemonics (their core claim)
- Compare against LexiTap's plan side-by-side
- Output: structured teardown doc + LexiTap positioning sharpenings (filed back into Competitive Analysis Field Notes + Product Strategy Overview Competitive Frame)

**Why P0 not P1:** Direct-competitor identification is launch-blocking. Cannot finalize Brand Identity copy, App Store listing, or competitive marketing claims without first-person Knowji intel. Cheap to do; high signal-to-noise.

**Trigger to plan:** **NOW** — before Brand Identity copy is finalized for App Store submission.

**Estimated time:** ~$10 for one month of Knowji + 4-6 hours structured evaluation + 2-3 hours writing the teardown.

**Dependencies:** None — runs in parallel with content tool build.

**Cross-reference:** Competitive Analysis Part 4 (Knowji profile); Session State Decision Log 2026-05-22 (Audio Scope-Out + Audience Split).

**Status update (2026-05-23):** Research-based teardown complete (Competitive Analysis Part 10, extracted to Product Strategy Overview Knowji profile + Brand Identity UI Aesthetic Direction). First-person hands-on evaluation still the outstanding deliverable for this item.

### Item #43: SRS Forgiveness Mechanics Design — 🔴 P0 (added 2026-05-22, trigger MET)

**Description:** Concrete design for the SRS forgiveness UX layer committed at Session State Decision Log 2026-05-22 (SRS Forgiveness Mechanics). The Decision Log locked the architectural requirements; this item produces the specific design — review caps, catch-up algorithm, notification rules, copy tone.

**Why it matters:** A fixed 1/3/7/14/30 SRS scheduler, used naively, becomes a backlog-as-punishment engine on user return. Competitive Analysis Part 6 names this as a primary driver of app abandonment for WordUp and similar apps. LexiTap will exhibit the same failure mode without explicit forgiveness UX. Cannot ship Phase 1 mobile MVP without this.

**Scope:**

- **Daily review cap:** numeric value, dynamic vs. static, user-configurable vs. fixed
- **Catch-up algorithm:** how to soft-rebalance `next_review_date` across the backlog after N missed days (don't dump everything; spread re-anchoring)
- **Notification rules:** no red-badge guilt, no "you've missed N days" shame, max 1 daily reminder, tone of voice
- **Welcome-back UX:** what the user sees on first re-open after a gap (>3 days)
- **Edge case:** very long gaps (weeks, months) — full reset offer vs. soft restart vs. continue as if nothing happened
- **Telemetry hooks:** event_log entries for backlog state, cap hits, gap returns — needed to measure whether forgiveness is working
- **SRS Algorithm choice — FSRS vs. SM-2 (added 2026-05-23):** Concrete technical fork. SM-2 is standard and simple; FSRS (Free Spaced Repetition Scheduler) is a modern research-backed algorithm that factors in individual memory retention rates and the inherent difficulty of the specific language pair being learned. FSRS demonstrably outperforms SM-2 on long-term retention. Must decide before Phase 1B scheduler code is written — this is not a reversible architectural choice.
- **Streak Forgiveness Layer — Streak Freeze (added 2026-05-23):** The streak mechanic (locked 2026-05-23) needs its own forgiveness mechanism. Specific design decision: implement streak freeze (user can bank N freezes, one consumed automatically on a missed day) or flexible weekly goals (X sessions per week vs. daily mandatory). Goal = durable habit, not punishment for a busy adult life. Design this alongside the SRS catch-up algorithm — both solve the same missed-day problem at different layers.
- **Context-Aware Push Notifications (added 2026-05-23):** Move beyond generic “Time to study!” prompts. SRS-schedule-aware, curiosity-driven triggers — e.g., *“You learned ‘mitigate’ yesterday. Can you remember what it means before your meeting today?”* Notification strategy is part of the habit loop architecture and must be designed alongside the forgiveness mechanics, not bolted on later.

**Why P0 not P1:** SRS is the core learning engine. Forgiveness is part of the SRS contract, not a feature to bolt on later. Designing it post-launch means shipping a punitive scheduler first — exactly the failure mode we're avoiding.

**Trigger to plan:** **NOW** — before mobile MVP scheduler code is written (Phase 1B, Weeks 2-6).

**Estimated time:** 1 day design + [AGENTS_MOBILE_CONVENTIONS.md](./AGENTS_MOBILE_CONVENTIONS.md) update with the no-red-badge-guilt rule.

**Dependencies:** Session State Decision Log 2026-05-22 (SRS Forgiveness Mechanics); [AGENTS_MOBILE_CONVENTIONS.md](./AGENTS_MOBILE_CONVENTIONS.md) (pending update); Database Schema (no DDL change needed; logic at scheduler + presentation layers).

**Cross-reference:** Session State Decision Log 2026-05-22 (SRS Forgiveness Mechanics); Competitive Analysis Part 6 §2.

### Item #44: WordUp Competitive Teardown — 🔴 P0 (added 2026-05-22, trigger MET)

**Description:** Hands-on evaluation + structured competitive teardown of WordUp — LexiTap's closest direct competitor on audience overlap (intermediate-to-advanced non-native speakers + IELTS/TOEFL/GRE candidates + working professionals). Same pattern as #42 Knowji Teardown.

**Why it matters:** Per Competitive Analysis Parts 5-6, WordUp is the most strategically relevant competitor for LexiTap. The research material gives detail on positioning and features (Knowledge Map, SRS, AI Chat) and their documented friction, but hands-on validates what's actually delivered. Cannot finalize Brand Identity copy, App Store listing, or competitive marketing claims without first-person WordUp intel.

**Scope:**

- Purchase / use WordUp for 1-2 weeks across free + paid tiers as relevant
- Document feature inventory + UX quality:
    - **Knowledge Map** onboarding — does the endowed-progress effect really boost motivation in practice?
    - **Multimedia contextualization** — video clips, quotes, expert analysis, AI imagery: quality + per-word coverage
    - **SRS** implementation — backlog handling, calibration friction
    - **AI Chat (Lexi + Fantasy Chat)** — verify the technological instability reported in research
    - **Content philosophy in practice** — frequency-based 25K-word ranking experience
- Compare side-by-side against LexiTap's plan
- Evaluate honestly: do users actually need video clips and expert analysis, or is it marketing window-dressing?
- Output: structured teardown + LexiTap positioning sharpenings (file into Competitive Analysis Field Notes + Product Strategy Overview Competitive Frame)

**Why P0 not P1:** Direct-audience competitor. Cannot finalize Brand Identity copy or competitive-frame positioning without first-person WordUp intel.

**Trigger to plan:** **NOW** — before Brand Identity copy finalizes for App Store submission.

**Estimated time:** WordUp purchase cost + 6-10 hours structured evaluation + 3-4 hours writing the teardown.

**Dependencies:** None — runs in parallel with content tool build.

**Cross-reference:** Competitive Analysis Parts 5-7, 8-9; Session State Decision Log 2026-05-22 (Multimedia Contextualization Scope-Out + SRS Forgiveness Mechanics).

**Status update (2026-05-23):** Research-based teardown complete (Competitive Analysis Parts 5–9, extracted to Product Strategy Overview and Brand Identity). First-person hands-on evaluation still pending — this remains the outstanding deliverable for #44.

### Item #45: Onboarding Diagnostic with Endowed-Progress Pattern — 🟠 P1 (added 2026-05-22)

**Description:** Design exercise: decide whether to adopt a WordUp-style "I know / Test me / Learn" diagnostic onboarding pattern (or some adaptation of it), and if so, what the LexiTap version looks like. Resolves the Open Decision under Phase 1 in Session State.

**Why it matters:** WordUp's Knowledge Map leverages the **endowed progress effect** — showing users they already know thousands of words — as a documented retention boost. This is one of WordUp's most-praised features. LexiTap currently plans a simpler CEFR self-assessment that doesn't capture the same psychological lift. But the WordUp diagnostic also generates real friction (manual sorting reported as grueling).

**Open question:** Adopt the pattern (in some form), keep the simpler CEFR self-assessment, or design a hybrid?

**Scope:**

- Define LexiTap version: number of words to sort? sliding scale vs. discrete buckets? skip option?
- Identify the minimum diagnostic depth that delivers the endowed-progress lift without grueling friction
- Storyboard the first-session UX so the user reaches an "aha — I already know X words" moment in <90 seconds
- Output: design doc + decision committed to Session State Decision Log; integrates with existing #9 Onboarding Flow

**✅ DECISION LOCKED 2026-05-23: Simplified Adaptive Diagnostic at MVP**

Self-segmentation screen → adaptive Yes/No quiz (correct = harder, wrong = easier, ~10–25 questions) → 2–3 pseudo-words for overclaiming detection → SE-based early exit → Knowledge Map reveal. Full IRT deferred post-launch.

**Why P1 not P0:** Not launch-blocking like content sourcing or SRS forgiveness.

**Design input — IRT Methodology (added 2026-05-23):** Item Response Theory offers a specific third path beyond WordUp’s grueling manual sort and LexiTap’s simple CEFR self-assessment. Present 15 carefully selected, progressively difficult questions — adaptive difficulty based on prior answers — to pinpoint vocabulary size and domain in under 2 minutes. Delivers the endowed-progress psychological lift with dramatically less friction than manual sorting. Evaluate whether IRT is implementable within the Phase 1 content pipeline or requires a separate assessment data model.

**Full diagnostic design spec (added 2026-05-23 — Competitive Analysis Part 11):**

**Layer 1 — Self-Segmentation Before the Test (1 screen)**

Before any assessment, present a brief welcome survey: goals (test prep, professional English, general fluency), perceived skill level (beginner/intermediate/advanced), and professional background. This allows users to self-select: beginners can skip the diagnostic entirely and start at Foundation level; advanced users take the adaptive test. Eliminates the risk of overwhelming beginners or boring advanced learners. Single screen, no typing required, 3 taps maximum.

**Layer 2 — Computerized Adaptive Testing (CAT) powered by IRT**

The diagnostic must be adaptive, not static. If the user answers correctly, the next question is harder; if they answer incorrectly, the next is easier. This pinpoints vocabulary level in far fewer questions than a fixed-length test. The question pool must be pre-calibrated by difficulty level across the CEFR/tier range. No fixed question count — the test terminates when statistical confidence is reached (see Stopping Rules below).

**Layer 3 — Yes/No Format with Pseudo-Word Signal Detection**

For rapid vocabulary size estimation, use a Yes/No format (“Do you know this word?”) rather than full definition recall. Efficient to answer; low cognitive load. Critical addition: intersperse 2–3 **pseudo-words** (fake words that follow English phonetic rules but don’t exist — e.g., *“flurvent”*, *“dessicate”* with a different meaning) throughout the diagnostic. Using Signal Detection Theory, the algorithm tracks “false alarms” (user claims to know a fake word) and automatically corrects their final score for overconfidence or guessing. Low-cost implementation; high-signal overclaiming detection.

**Layer 4 — Smart Stopping Rules (SE-based, not fixed question count)**

Do NOT require every user to answer exactly N questions. Implement a dynamic stopping rule: the test terminates automatically when the Standard Error (SE) of measurement drops below a defined confidence threshold. For some users this happens at 10 questions; for others at 25. Prevents cognitive fatigue for fast-to-classify users; provides accuracy for edge cases. The user never sees a progress bar counting down to a fixed number — they just see the diagnostic end naturally.

**Layer 5 — “Discovery” Framing (UX and copy)**

Tests cause anxiety. The entire diagnostic must be framed as discovery, not examination:

- **Start easy:** Always begin with an intermediate-or-easier word to guarantee early success and prime confidence
- **No “test” language:** Use copy like “Let’s find your starting point”, “Discover what you already know” — never “placement test” or “assessment”
- **Immediate payoff at the end:** Once the diagnostic terminates, immediately show a personalized Knowledge Map — “You already know an estimated X words. Here’s your personalized curriculum.” This is the endowed-progress effect payoff that drives D1 retention.

**Open design fork — requires founder decision:**

- **Option A: Full IRT implementation** — statistically precise, requires pre-calibrated question difficulty parameters, more engineering complexity in onboarding
- **Option B: Simplified adaptive quiz** — approximate CAT (correct = harder, wrong = easier), fixed ~15 questions, pseudo-words for signal detection, achieves ~80% of IRT accuracy with a fraction of the implementation cost. Likely the right MVP choice.
- **Recommended:** Option B at MVP; revisit full IRT post-launch if diagnostic accuracy is a retention driver (measurable from cohort data).

**Trigger to plan:** Week 4 (alongside #9 Onboarding Flow trigger).

**Estimated time:** 1 day design.

**Dependencies:** #9 Onboarding Flow (existing); #44 WordUp Teardown (run #44 first to inform the design).

**Cross-reference:** Competitive Analysis Part 6 §1 (Knowledge Map analysis); Session State Open Decisions → Phase 1.

- [ ]  Item #46:

### Item #46: Ship and Watch CI Loop — 🟠 P1 (added 2026-05-22)

**Description:** Set up a fully autonomous PR-creation-and-monitoring loop using Claude Code + GitHub Actions. Once configured: agent creates PR → CI runs → if linting or tests fail, agent fetches logs, diagnoses, commits fix, polls again → repeats until PR is green and mergeable. Zero human interaction required after initial setup.

**Why it matters:** Removes the biggest manual bottleneck in a solo dev's feedback loop. The agent ships code AND handles CI failures autonomously — consistent with the "if it can't be autonomous, don't use it" constraint.

**Scope:**

- GitHub Actions workflow triggered on PR creation
- Claude Code GitHub Actions integration ([github.com/apps/claude](http://github.com/apps/claude))
- Loop: poll CI status every 5 minutes → on failure, fetch logs → diagnose → commit fix → re-poll
- Exit condition: PR green + all checks pass, OR escalation to founder after N failed fix attempts
- Works across both Track A (content CLI) and Track B (mobile MVP) repositories

**Why P1 not P0:** Requires an existing GitHub repo and CI pipeline. Cannot set up before Phase 1 starts. But once the repo exists, this is the first infrastructure task.

**Trigger to plan:** Week 1 of Phase 1 (immediately after repo creation + initial CI setup).

**Dependencies:** GitHub repo exists; basic CI pipeline configured (ESLint + TypeScript checks at minimum).

**Cross-reference:** Session State; Implementation Roadmap Phase 1 infrastructure.

### Item #47: Git Worktrees Two-Track Setup — 🔴 P0 (added 2026-05-22, trigger MET at Phase 1 start)

**Description:** Set up two independent Git Worktree directories at the start of Phase 1 — one for the content CLI tool (Track A) and one for the mobile MVP (Track B). Each track runs a separate Claude Code instance without branch-switching, stashing, or context contamination between tracks.

**Why it matters:** LexiTap has two clearly independent build tracks (content pipeline + mobile app) that can progress in parallel. Without worktrees, switching between them mid-session corrupts context and loses momentum. With worktrees, each track is always at a clean, resumable state.

**Scope:**

- `git worktree add ../lexitap-content track/content-cli` — Track A
- `git worktree add ../lexitap-mobile track/mobile-mvp` — Track B
- Each worktree gets its own `node_modules`, `.env`, and Claude Code session
- Agent handles worktree creation autonomously at Phase 1 start given the instruction in [CLAUDE.md](../CLAUDE.md)
- No manual branch management needed after initial setup

**Why P0 not P1:** Should happen on Day 1 of Phase 1, before any code is written, to prevent the messy-branch problem from the start. Retroactively applying worktrees is more friction than setting them up from the beginning.

**Trigger to plan:** **Phase 1 Week 1, Day 1** — first thing before any implementation begins.

**Estimated time:** 30 minutes setup; autonomous operation thereafter.

**Dependencies:** Git repo initialized.

**Cross-reference:** Implementation Roadmap Phase 1 Week 1; [AGENTS_MOBILE_CONVENTIONS.md](./AGENTS_MOBILE_CONVENTIONS.md) Adversarial Review Protocol.

### Item #48: Dynamic Distractor Generation — 🟢 P3 (added 2026-05-23)

**Description:** Use AI to generate plausible-but-wrong multiple-choice answer options that specifically target common errors based on the user’s native language (L1) interference patterns, rather than generic or randomly selected distractors.

**Why it matters:** Standard distractors are often either too obviously wrong (no learning value) or too randomly wrong (arbitrary, not pedagogically targeted). Distractors tuned to a learner’s specific L1 — e.g., Spanish speakers confuse certain English word pairs differently than Mandarin speakers — dramatically increase the pedagogical value of every recognition exercise without adding any user-facing friction.

**Scope:**

- L1 selection at onboarding (user declares native language; used as distractor generation seed)
- Per-word distractor generation seeded by L1 interference patterns (e.g., false cognates, semantic near-misses in L1, common L1-to-English translation errors)
- Build-time vs. runtime generation trade-off: build-time is cheaper and more consistent; runtime enables personalization but adds latency and API cost
- Storage: distractor pool per word per L1 group in content database
- Fallback: generic distractors for unsupported L1s

**Why P3 not P2:** Requires AI infrastructure at scale (Backlog #34) AND L1 data collected at onboarding. Neither is available at MVP. High pedagogical value but zero urgency until base product is validated.

**Trigger to plan:** When Backlog #34 (AI/ML Integration) trigger fires AND user L1 data is available at meaningful scale (10K+ active users).

**Estimated planning time:** 2 days.

**Dependencies:** Backlog #34 (AI/ML Integration); L1 field added to user profile at onboarding; content database supports per-L1 distractor pools.

**Cross-reference:** Competitive Analysis Part 9 (Dynamic Distractor Generation); [AGENTS_MOBILE_CONVENTIONS.md](./AGENTS_MOBILE_CONVENTIONS.md) assessment widget specs.

### Item #49: Audio Playlist — Passive Learning Mode — 🟠 P1 (added 2026-05-23)

**Description:** Allow users to create ordered playlists of vocabulary words and listen to them sequentially — word pronunciation → definition → example sentences — while commuting, driving, or doing other tasks. Passive audio reinforcement as a complement to the active tap-based SRS loop.

**Why it matters:** The 5-minute commute window is the atomic unit of engagement (confirmed in Competitive Analysis Part 7). Most of that window is currently occupied by the visual SRS session. Passive audio gives users a way to reinforce vocabulary during time when the screen is unavailable. No competitor currently offers this as a deliberate feature. The 3 audio clips per word generated in Backlog #41 (pronunciation + definition + examples) are designed to support this feature from day one.

**Scope:**

- User selects words (from a tier, from their SRS queue, or custom selection) → creates a named playlist
- App plays clips sequentially: word pronunciation → brief pause → definition → brief pause → example sentences → next word
- Background audio mode: continues playing when screen is off or app is backgrounded (iOS/Android background audio entitlement)
- Playback controls: play/pause, skip word, repeat word, playback speed (0.75×, 1×, 1.25×)
- Progress: marks words as “heard” in the session; optionally counts toward streak
- Schema: `playlists` table (id, user_id, name, created_at) + `playlist_words` (id, playlist_id, word_id, position)

**Why P1 not P0:** Requires all three audio clips per word to exist (depends on Backlog #41 content pipeline) and requires iOS/Android background audio entitlement (non-trivial engineering). Not launch-blocking — core SRS loop ships first. Ships as a post-launch feature once TOEFL/Foundation audio is fully generated.

**Trigger to plan:** When first tier’s audio generation is complete (TOEFL or Foundation) AND core SRS loop is stable post-launch.

**Estimated planning time:** 2 days design + 3–4 days build.

**Dependencies:** Backlog #41 (audio clips generated for target tier); background audio entitlement configured in Expo/EAS.

**Cross-reference:** Backlog #41 (3-clip audio architecture); Competitive Analysis Part 7 (5-minute commute window as atomic engagement unit).