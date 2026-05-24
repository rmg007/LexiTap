---
title: Error Monitoring Plan
category: operations-compliance
status: active
updated: 2026-05-24
priority: P2
tags: [error-monitoring, sentry, crash-reporting, alerting, release-health, offline-queue, solo-founder]
---

# Error Monitoring Plan

> Phase-0 planning document. Defines how a solo founder catches crashes and errors cheaply, what to
> capture (and scrub), alerting that does not cause fatigue, release health, and offline error
> queueing. Privacy posture aligns with
> [GDPR_COPPA_COMPLIANCE.md](./GDPR_COPPA_COMPLIANCE.md).

## Table of Contents

- [Goals and Constraints](#goals-and-constraints)
- [Tooling Choice](#tooling-choice)
- [What to Capture](#what-to-capture)
- [What to Scrub](#what-to-scrub)
- [Release Health](#release-health)
- [Alerting for a Solo Founder](#alerting-for-a-solo-founder)
- [Offline Error Queueing](#offline-error-queueing)
- [Triage Workflow](#triage-workflow)
- [Open Questions](#open-questions)

## Goals and Constraints

Detect and fix crashes/errors before they drive uninstalls — especially around the failure modes
that matter most for LexiTap: cloud sync, IAP/receipt validation, and SRS state corruption. Cloud
sync reliability is a stated competitive differentiator (vs. WordUp's documented sync failures), so
sync errors are P0 to observe. Constraints: free tier only, offline-first (errors offline must reach
us later), and one person (alerting must be quiet and high-signal).

## Tooling Choice

- **Primary: Sentry** — free Developer tier (~5k errors/month), first-class Expo / React Native SDK,
  source maps, release health, breadcrumbs, and offline caching built in. Fits budget and stack.
- **Considered:** Firebase Crashlytics (free, but couples to the Google/Firebase SDK surface and adds
  data-disclosure weight we are avoiding) — not chosen.
- **DPA:** execute Sentry's DPA; enable PII scrubbing server-side as defense-in-depth.

## What to Capture

- Native + JS crashes, unhandled promise rejections, and explicitly captured handled exceptions.
- Breadcrumbs: recent navigation, last DB operation type, sync phase, IAP step.
- Context: app version + build, release channel, OS/version, device model, free-vs-paid (boolean),
  locale, online/offline at time of error.
- Pseudonymous `anon_id` + `session_id` (same device-scoped UUID as analytics) — never the email or
  Supabase user id.
- Tagged error domains for fast filtering: `sync`, `iap`, `srs`, `db`, `auth`, `ui`.

Explicitly instrument these high-value paths with handled-exception capture:

- Sync push/pull failures and conflict-resolution anomalies.
- IAP purchase failures and server-side receipt-validation rejections.
- SQLite migration failures and SRS state read/write errors.
- Auth (email + Google Sign-In) failures.

## What to Scrub

- No email, display name, password, OAuth/receipt tokens, or raw teacher/promo codes in any event,
  breadcrumb, tag, or message.
- Enable Sentry server-side data scrubbing + `beforeSend` client filter as belt-and-suspenders.
- Strip request bodies; keep only error class, domain tag, and minimal pseudonymous context.

## Release Health

- Track **crash-free sessions** and **crash-free users** per release; gate wider rollout on a
  healthy first cohort.
- Associate errors with the `release` (app version + build) and use staged rollout on the stores so
  a bad build is caught on a small population.
- Feed crash-free-sessions into the analytics dashboard ([ANALYTICS_PLAN.md](./ANALYTICS_PLAN.md)) as
  a release-quality metric.

## Alerting for a Solo Founder

High-signal only, to email (and optionally a personal phone push) — avoid fatigue:

| Trigger | Severity | Channel |
|---------|----------|---------|
| New crash-type in latest release | High | Email immediately |
| Crash-free sessions drop below 99% in a release | High | Email immediately |
| Spike: error volume > 3x trailing-7-day baseline | High | Email immediately |
| New `iap` or `sync`-tagged error after a release | High | Email immediately |
| Any other new issue | Normal | Daily digest |

Use issue grouping + a digest so routine noise is batched once a day, with only release-regression
and money/sync errors paging in real time.

## Offline Error Queueing

- Sentry's SDK caches events on disk when offline and flushes on reconnect; verify this is enabled
  for Expo.
- Because LexiTap is offline-first, an error can occur days before it is reported — preserve the
  original `occurred_at` timestamp so timelines stay accurate.
- Bound the local queue (cap event count / TTL) so a long-offline device does not balloon storage.

## Triage Workflow

1. Alert arrives → check error domain tag + release.
2. Reproduce via breadcrumbs (sync phase / IAP step / last DB op).
3. Classify: blocker (sync/IAP/data-loss) → hotfix; cosmetic → backlog.
4. Money/data-loss errors (failed purchase, lost progress) link to the support runbook
   ([SUPPORT_ESCALATION_RUNBOOK.md](./SUPPORT_ESCALATION_RUNBOOK.md)) since affected users may also
   write in.
5. Ship fix on a staged rollout; watch crash-free rate recover before full release.

## Open Questions

- Sentry free-tier event quota vs. expected volume at 1,000 users — confirm headroom; add sampling
  if needed.
- Whether to enable Sentry session replay (likely no — extra privacy surface, low value for a
  no-typing tap UI).
- Personal push alerting channel (email-only vs. a free push relay).
