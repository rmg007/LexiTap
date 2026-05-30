---
title: Analytics Plan
category: operations-compliance
status: active
updated: 2026-05-24
priority: P1
tags: [analytics, events, tracking, retention, conversion, funnel, event-schema, privacy, offline-first]
---

# Analytics Plan

> Phase-0 planning document. Defines what LexiTap measures, the event taxonomy, the
> privacy-respecting tooling on a solo-founder budget, and what we deliberately do NOT track.
> Privacy posture aligns with [GDPR_COPPA_COMPLIANCE.md](./GDPR_COPPA_COMPLIANCE.md).

## Table of Contents

- [Goals and Constraints](#goals-and-constraints)
- [Key Metrics](#key-metrics)
- [Event Taxonomy](#event-taxonomy)
- [Event Schema](#event-schema)
- [Funnels](#funnels)
- [Tooling on a Budget](#tooling-on-a-budget)
- [Offline-First Pipeline](#offline-first-pipeline)
- [What We Do Not Track](#what-we-do-not-track)
- [Open Questions](#open-questions)

## Goals and Constraints

Analytics exists to answer the validation questions in
[../02-product-definition/PRODUCT_REQUIREMENTS_DOCUMENT.md](../02-product-definition/PRODUCT_REQUIREMENTS_DOCUMENT.md): is the core loop
retentive (D7 > 30% go-target, kill below 20% at Week 10), and does the free→paid conversion work? Constraints: ~$194 realistic first-year
cash outlay (free tiers where possible), offline-first (events must survive being offline for days), privacy-first
(pseudonymous, no ad trackers, opt-out), and solo-founder (low maintenance, few dashboards that
matter).

## Key Metrics

| Metric | Definition | Target / Use |
|--------|------------|--------------|
| D1 / D7 / D30 retention | % of new users active 1 / 7 / 30 days after install | D7 > 30% Phase-1 go-target (kill if < 20% at Week 10); D1 > 50%, D30 > 15% |
| Session length | Median active seconds per session | > 3 min (engagement health) |
| Sessions / DAU | Daily sessions per active user | Habit-formation signal |
| Streak adherence | % of active users with streak >= 7; streak break rate | Validates streak-as-product thesis |
| Lesson completion rate | Completed quiz sessions / started | Core-loop friction |
| New→review balance | Ratio of new-word vs. review attempts | SRS backlog health (forgiveness mechanics) |
| Free→paid conversion | % of active free users who buy any paid tier | Target 5% (15% optimistic TOEFL) |
| Paywall view→purchase | Purchases / paywall views | Pricing/paywall effectiveness |
| Tier mix | Distribution across TOEFL/IELTS/Business/Common3K/Premium Pass | Informs post-launch drop order |
| Teacher-code attach rate | % of purchases using a teacher code | GTM channel health |
| Crash-free sessions | From error monitoring (release health) | See [ERROR_MONITORING_PLAN.md](./ERROR_MONITORING_PLAN.md) |

## Event Taxonomy

Naming: `object_action`, snake_case, past-tense action. Reuse the on-device `event_log` table
(`event_type`, `payload`, `occurred_at`) defined in
[../04-technical-architecture/DATABASE_SCHEMA.md](../04-technical-architecture/DATABASE_SCHEMA.md).

**Status key:** `implemented-local` = written to on-device `event_log` today; `planned-local` = planned `event_log` write, not yet emitted; `planned-off-device` = intended for PostHog/Amplitude when opted-in; `phase3+` = deferred with feature.

| Event | When | Key properties | Status |
|-------|------|----------------|--------|
| `app_opened` | App foregrounded | `is_first_open`, `days_since_install` | `planned-off-device` |
| `session_started` | Quiz/learning session begins | `tier_id`, `quiz_mode` | `planned-local` |
| `session_completed` | Session finishes | `tier_id`, `total_questions`, `total_correct`, `duration_seconds` | `planned-local` |
| `session_abandoned` | App closed mid-session | `tier_id`, `questions_answered` | `planned-off-device` |
| `answer_recorded` | A review attempt recorded (physical DB row write) | `is_correct`, `pre_mastery_level`, `assessment_type` | `implemented-local` |
| `srs_backlog_reanchored` | Overdue backlog redistributed | `count`, `lapse_days`, `drain_days` | `planned-local` |
| `content_error_reported` | Word content issue flagged | `word_id`, `issue_type`, `note` | `planned-local` (requires `content_errors` table + off-device sync) |
| `streak_incremented` | Daily streak advances | `current_streak` | `planned-local` |
| `streak_broken` | Streak resets to 0 | `previous_streak` | `planned-local` |
| `tier_unlocked` | Free or purchased tier becomes available | `tier_id`, `is_free` | `planned-local` |
| `paywall_viewed` | Paywall screen shown | `tier_id`, `entry_point` | `planned-off-device` |
| `teacher_code_applied` | Valid teacher code entered | `tier_id` (code hashed/omitted) | `phase3+` |
| `purchase_started` | IAP flow initiated | `tier_id` | `planned-off-device` |
| `purchase_completed` | IAP succeeds (RevenueCat callback) | `tier_id` | `planned-off-device` |
| `purchase_failed` | IAP cancelled/failed | `tier_id`, `reason` | `planned-off-device` |
| `account_created` | Signup completes | `auth_provider` | `planned-off-device` |
| `backup_completed` | Cloud backup upload succeeds | — | `phase3+` |
| `analytics_opt_out` | User toggles analytics off | — | `planned-local` |

## Event Schema

```json
{
  "event_type": "purchase_completed",
  "occurred_at": 1748044800000,
  "payload": {
    "anon_id": "uuid-v4-device-scoped",
    "session_id": "uuid-v4",
    "app_version": "1.0.0",
    "platform": "ios",
    "tier_id": "toefl"
  }
}
```

Rules: `occurred_at` is JS `Date.now()` (not SQL time, per schema clock-skew guidance);
`anon_id` is a device-scoped random UUID, never the email or Supabase user id; payloads carry no PII
and no raw teacher/promo codes; properties are a flat, typed key set per event.

## Funnels

- **Activation:** `app_opened` (first) → `account_created` → `session_completed` (first) →
  `streak_incremented` (day 2).
- **Monetization:** `paywall_viewed` → `purchase_started` → `purchase_completed` (segment by
  `had_teacher_code`).
- **Habit:** `session_completed` per day over the first 14 days → D7/D30 retention cohorts.

## Tooling on a Budget

- **Primary (recommended): PostHog** — generous free tier, open-source, EU-hosting option,
  reverse-proxy-able, autocapture-off (explicit events only). Fits privacy posture.
- **Lowest-cost / zero-vendor fallback:** the on-device `event_log` is the source of truth.
  Periodically roll up aggregate counts and `upsert` them to a Supabase `metrics_daily` table; query
  with SQL. No third party at all, $0, but manual dashboards.
- **Avoid:** Firebase/Google Analytics for Firebase and any ad-SDK-coupled analytics (tracking
  classification, heavier privacy disclosures, ad-identifier surface).
- **Cost target:** $0/month at the 1,000-user goal; re-evaluate at scale.

## Offline-First Pipeline

1. Events are written synchronously to local `event_log` (works offline, pre-auth).
2. A lightweight flush batches un-sent events to the analytics sink on `sync_completed` / app close,
   with retry; nothing is lost if the user is offline for days.
3. Only aggregates and pseudonymous events leave the device; raw per-word history stays local unless
   needed for a metric.
4. Idempotency: each event carries a client-generated id so retries do not double-count.

## What We Do Not Track

- No precise location, contacts, photos, microphone/audio.
- No cross-app or advertising tracking; no ad SDKs; no IDFA/AAID use → "Tracking: No" on store
  labels.
- No raw email/name/teacher-code in event payloads (use `anon_id`).
- No keystroke/text capture (the app has no quiz typing anyway — no-typing UX).
- No selling or sharing of analytics data.
- Honor `analytics_opt_out`: local logging may continue for app function, but no off-device send.

## Open Questions

- `unresolved` — PostHog vs. pure Supabase-rollup for v1. Lean PostHog for funnels; confirm free-tier event volume headroom at 1,000 users before wiring.
- `requires-external-validation` — Consent gating: opt-out (legitimate interest) vs. opt-in in GDPR regions. Align with [GDPR_COPPA_COMPLIANCE.md](./GDPR_COPPA_COMPLIANCE.md) and counsel.
- `deferred` — Retention-cohort computation: in-tool vs. SQL rollup. Decide when analytics sink is chosen.
