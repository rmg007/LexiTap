---
title: Feature Backlog and Prioritization
category: product
status: active
updated: 2026-05-31
priority: P1
tags: [backlog, features, prioritization, moscow, mvp, launch-wave, post-launch]
---

# Feature Backlog — LexiTap

A product-feature backlog organized by release window. This is the *product* view; the operational/infrastructure planning backlog (privacy, CI/CD, legal, payments) is the numbered master list in the at-a-glance tracker [../../ROADMAP.md](../../ROADMAP.md) and is referenced by item number (e.g. backlog #43). Sequencing is in [ROADMAP.md](./ROADMAP.md); requirements in [PRODUCT_REQUIREMENTS_DOCUMENT.md](./PRODUCT_REQUIREMENTS_DOCUMENT.md).

Priority uses MoSCoW within each window: **Must / Should / Could / Won't (this window)**.

## Window 1: MVP (Phase 1, Weeks 2–6)

Free Foundation tier only. Validates the core loop before any monetization.

| Feature | MoSCoW | Notes |
| --- | --- | --- |
| MultipleChoice widget | Must | Recognition, no typing. |
| DragDrop widget | Must | Touch drag, iOS + Android. |
| SRS scheduler (1/3/7/14/30, mastery 0–5) | Must | `useSpacedRepetition`, `useMastery`. |
| SRS forgiveness layer (cap + soft catch-up + streak freeze + no guilt) | Must | Blocker — design resolved (backlog #43); see [SRS_FORGIVENESS_MECHANICS.md](./SRS_FORGIVENESS_MECHANICS.md). |
| Streak counter | Must | Non-negotiable gamification. |
| Quiz session orchestration | Must | `useQuizSession`. |
| Home / Quiz / Progress / Settings screens | Must | Four screens only. |
| Account creation (email + Google + Apple) | Must | Required for sync. Email = Magic-Link (no password stored); Google + Apple = OAuth (Phase 3). |
| Free cloud sync (background) | Must | `useSync`; locked free-for-all. |
| Simplified adaptive diagnostic onboarding | Must | Self-segment → Yes/No → pseudo-words → SE exit → Knowledge Map (backlog #45). |
| Progress / mastery visualization | Should | Knowledge Map reveal. |
| Both-accent (US + GB) audio playback | Should | Depends on enrichment availability. |
| Per-word imagery | Should | Unsplash-sourced. |
| ImageMatch / Classification widgets | Won't | Phase 4. |
| Any paywall / IAP | Won't | Phase 3. |

## Window 2: Launch Wave (Phases 3–4, Weeks 11–18)

Monetization + the launch-wave paid catalog.

| Feature | MoSCoW | Notes |
| --- | --- | --- |
| Paywall screen | Must | Phase 3. |
| Apple + Google IAP (one-time non-consumables) | Must | RevenueCat (`react-native-purchases`) — locked vendor; native install planned for Phase 3. |
| Entitlement management | Must | Per-pack + `all_exams`, held in RevenueCat `CustomerInfo` (memory only); never written to user.db. Access check: `isFree OR owns(pack) OR owns(all_exams)`. |
| TOEFL exam pack + audio | Must | First exam-pack content focus (`com.lexitap.exam.toefl`, $9.99). Audio is free and universal. |
| Restore purchases | Must | Cross-device; re-reads entitlements from RevenueCat. |
| Teacher referral code validation | Must | Grants an exam pack / non-cash rewards only; no off-store discount steering. |
| Promo code system | Must | Goodwill marketing; grants an exam pack. |
| IELTS, Business English exam packs | Must | Launch-wave one-time packs at $9.99 each. Most Common 3000/9000 are free frequency categories (no SKU). |
| All-Exams bundle ($29.99) + upgrade SKUs | Must | `com.lexitap.bundle.full` grants `all_exams` (every exam pack, current and future); `upgrade1` ($19.99) / `upgrade2` ($9.99) for owners of 1 / 2 packs. |
| ImageMatch + Classification widgets | Should | Phase 4. |
| UX polish (animations, haptics) | Should | Phase 4. |
| Advanced tier full word list (3,001–9,000) | Should | MVP shipped a subset. |

## Window 3: Post-Launch Content Drops (Phase 6, Week 22+)

Monthly cadence; order may shift on conversion data.

| Feature | MoSCoW | Notes |
| --- | --- | --- |
| GRE Vocabulary | Should | Week 22 target; exam pack ($9.99), covered by `all_exams`. |
| GMAT Vocabulary | Should | Week 26 target; exam pack ($9.99), covered by `all_exams`. |
| Idioms & Expressions | Should | Week 30; fills WordUp blindspot; bundled into exam-pack content, covered by `all_exams`. |
| Phrasal Verbs | Should | Week 34; fills WordUp blindspot; bundled into exam-pack content, covered by `all_exams`. |
| Audio Playlist passive mode | Should | Backlog #49; needs 3-clip audio + background entitlement. |
| Context-aware push notifications | Should | Part of habit-loop design (backlog #43). |
| Notification strategy (reminders, streak protection) | Should | Backlog #20. |

## Window 4: Year 2 and Beyond (Conditional)

Only built when a specific trigger fires.

| Feature | MoSCoW | Trigger |
| --- | --- | --- |
| Dynamic L1-targeted distractors | Could | AI infra + L1 data at 10K+ users (backlog #48). |
| Per-word AI-generated imagery | Could | AI/ML integration (backlog #34). |
| Full IRT diagnostic | Could | If diagnostic accuracy proves a retention driver (backlog #45). |
| FSRS scheduler upgrade | Could | If long-term retention data favors it over fixed intervals (backlog #43). |
| Achievements / optional leaderboards | Could | After retention baseline known (backlog #24). |
| Web app / platform expansion | Won't | Mobile saturation + demand signal (backlog #33). |
| Localization | Won't | >30% non-English-primary traffic (backlog #31). |

## Cross-References

- Operational/infra backlog (numbered master list): [../../ROADMAP.md](../../ROADMAP.md)
- Tier pricing and competitive rationale: [../08-financial-legal/REVENUE_MODEL_PRICING.md](../08-financial-legal/REVENUE_MODEL_PRICING.md)
- Explicit non-goals: [OUT_OF_SCOPE.md](./OUT_OF_SCOPE.md)
