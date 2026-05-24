---
title: Feature Backlog and Prioritization
category: product
status: active
updated: 2026-05-24
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
| Account creation (email + Google) | Must | Required for sync. |
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
| Apple + Google IAP | Must | RevenueCat (`react-native-purchases`) — locked vendor. |
| Entitlement management | Must | Via Supabase. |
| TOEFL tier ($14.99) + premium audio | Must | First paid tier. |
| Restore purchases | Must | Cross-device. |
| Teacher referral code validation | Must | 20% student discount. |
| Promo code system | Must | Goodwill marketing. |
| IELTS ($14.99), Business English ($9.99), Common 3000 ($2.99) | Must | Launch-wave tiers. |
| Premium Pass ($29.99/yr) | Must | Unlocks all paid tiers incl. future drops. |
| ImageMatch + Classification widgets | Should | Phase 4. |
| UX polish (animations, haptics) | Should | Phase 4. |
| Advanced tier full word list (3,001–9,000) | Should | MVP shipped a subset. |

## Window 3: Post-Launch Content Drops (Phase 6, Week 22+)

Monthly cadence; order may shift on conversion data.

| Feature | MoSCoW | Notes |
| --- | --- | --- |
| GRE Vocabulary ($14.99) | Should | Week 22 target. |
| GMAT Vocabulary ($14.99) | Should | Week 26 target. |
| Idioms & Expressions ($9.99) | Should | Week 30 — fills WordUp blindspot. |
| Phrasal Verbs ($9.99) | Should | Week 34 — fills WordUp blindspot. |
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
