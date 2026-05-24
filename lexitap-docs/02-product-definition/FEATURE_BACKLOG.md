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
| Apple + Google IAP | Must | RevenueCat (`react-native-purchases`) — locked vendor; native install planned for Phase 3. |
| Entitlement management | Must | Via Supabase. |
| TOEFL premium content + audio | Must | First Premium Pass content focus. |
| Restore purchases | Must | Cross-device. |
| Teacher referral code validation | Must | Extended 14-day trial / non-cash rewards only; no off-store discount steering. |
| Promo code system | Must | Goodwill marketing. |
| IELTS, Business English, Common 3000 | Must | Launch-wave content; Common 3000 one-time unlock is $1.99, IELTS/Business are Premium Pass content. |
| Premium Pass ($4.99/mo, $24.99/yr) | Must | Unlocks all paid tiers incl. future drops. |
| ImageMatch + Classification widgets | Should | Phase 4. |
| UX polish (animations, haptics) | Should | Phase 4. |
| Advanced tier full word list (3,001–9,000) | Should | MVP shipped a subset. |

## Window 3: Post-Launch Content Drops (Phase 6, Week 22+)

Monthly cadence; order may shift on conversion data.

| Feature | MoSCoW | Notes |
| --- | --- | --- |
| GRE Vocabulary | Should | Week 22 target; included in Premium Pass. |
| GMAT Vocabulary | Should | Week 26 target; included in Premium Pass. |
| Idioms & Expressions | Should | Week 30; fills WordUp blindspot; included in Premium Pass. |
| Phrasal Verbs | Should | Week 34; fills WordUp blindspot; included in Premium Pass. |
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
