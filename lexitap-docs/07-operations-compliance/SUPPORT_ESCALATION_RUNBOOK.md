---
title: Support and Escalation Runbook
category: operations-compliance
status: active
updated: 2026-05-24
priority: P2
tags: [support, escalation, bug-triage, runbook, sync-conflicts, refunds, teacher-rewards, sla]
---

# Support and Escalation Runbook

> Phase-0 planning document. Defines realistic solo-founder support: one inbox, common-issue
> playbooks, triage/escalation, SLAs honest for one person, and teacher-reward disputes. Pairs with
> [ERROR_MONITORING_PLAN.md](./ERROR_MONITORING_PLAN.md) and the data model in
> [../04-technical-architecture/DATABASE_SCHEMA.md](../04-technical-architecture/DATABASE_SCHEMA.md).

## Table of Contents

- [Support Model](#support-model)
- [Channels and SLAs](#channels-and-slas)
- [Triage and Severity](#triage-and-severity)
- [Common Issue Playbooks](#common-issue-playbooks)
- [Teacher-Reward Disputes](#teacher-reward-disputes)
- [Escalation Path](#escalation-path)
- [Tooling](#tooling)
- [Open Questions](#open-questions)

## Support Model

One person handles all support, so the strategy is deflect-then-resolve: a small in-app FAQ and good
error messages prevent most tickets; a single support inbox handles the rest in batched daily
passes. Set expectations honestly rather than promising 24/7 response. Most issues are
self-resolvable (restore purchases, sign in to sync) and belong in the FAQ.

## Channels and SLAs

- **Primary channel:** `{{SUPPORT_EMAIL}}` (e.g. support@lexitap.app), linked in app Settings,
  store listings, and website.
- **Cadence:** checked once per business day (batched). No live chat, no phone.
- Privacy/data-rights requests route to `{{PRIVACY_EMAIL}}` with the 30-day GDPR SLA from
  [GDPR_COPPA_COMPLIANCE.md](./GDPR_COPPA_COMPLIANCE.md).

| Severity | First response | Target resolution |
|----------|----------------|-------------------|
| P0 — money lost / data loss / app unusable | 1 business day | 3 business days or store-side workaround |
| P1 — feature broken, workaround exists | 2 business days | Next release |
| P2 — question / minor bug | 3 business days | Backlog / FAQ |

These are realistic single-founder targets; the in-app message and auto-reply state them so users
are not surprised.

## Triage and Severity

1. Read ticket; tag domain (`sync`, `iap`, `streak`, `account`, `teacher`, `content`, `other`).
2. Cross-check error monitoring for a matching crash/error signature.
3. Assign severity per table above; P0s jump the daily queue.
4. Reproduce or request: app version, platform/OS, account email, and what they expected vs. saw.

## Common Issue Playbooks

### Sync conflict / "my progress looks wrong on another device"

Sync is last-write-wins on `last_reviewed_at`, so the most recently synced device wins (documented,
not a bug). Steps: confirm signed into the same account on both devices; open the device with the
correct progress last so its state wins on push; verify `sync_completed`. If progress appears lost,
check whether the user was offline on two devices (expected edge case). Reassure: cloud is a mirror;
on-device data is intact unless overwritten by a newer sync.

### Restore purchases / "I paid but a tier is locked"

Entitlements restore via Apple/Google receipt re-validation. Steps: have the user tap "Restore
Purchases" while signed into the same store account that bought it; confirm they are on the same app
account for cloud entitlement mirror. If still locked, request the store order id and check
server-side receipt validation logs. Note Premium Pass unlocks all paid tiers via a single
entitlement row.

### Streak disputes / "I lost my streak unfairly"

Streaks are evaluated in the user's IANA timezone with no retroactive re-anchoring (documented edge
case). Travel across timezones can shorten/lengthen a day. Explain the policy honestly. As a
one-time goodwill gesture for genuine bugs (not travel), a manual streak correction may be made;
log it. Do not promise routine streak restoration.

### Refund requests

Apple/Google are merchant of record — refunds are requested through the store, not us. Provide the
store refund link/instructions. A store-issued refund revokes the entitlement on next receipt
re-validation (expected). We do not process payments directly, so we cannot issue refunds ourselves;
say so clearly and point to the right store flow.

### Account deletion / data export

Direct to in-app "Export my data" then "Delete account" (cascades cloud data). For manual requests,
follow the data-subject-rights process in [GDPR_COPPA_COMPLIANCE.md](./GDPR_COPPA_COMPLIANCE.md).

### Sign-in problems (email / Google)

Confirm provider used at signup (`auth_provider`); a user who signed up with Google cannot sign in
with email/password and vice versa. Trigger password reset via Supabase Auth for email accounts.

## Teacher-Reward Disputes

Teachers receive non-cash Premium seats or credits while the advocate loop stays digital-only (per
[../01-discovery-strategy/GO_TO_MARKET_STRATEGY.md](../01-discovery-strategy/GO_TO_MARKET_STRATEGY.md)).
Dispute playbook:

1. Pull the teacher's `referrals` rows (code, referred account, reward status, qualifying activity,
   and source event id) and reconcile against the dashboard total.
2. Common cause: a referred account never completed the qualifying trial/activity threshold or was
   later flagged as fraudulent/self-referred; explain with the source event id.
3. Verify the reward tier matched the teacher's status at time of qualification; tiers are
   snapshotted per referral, not retroactively re-rated.
4. Confirm the Premium seat or credit destination before re-issuing a reward.
5. Honor genuine reconciliation errors in the next reward run; log the adjustment.

## Escalation Path

- **Bug confirmed reproducible** → create a fix issue; if P0 (money/data/sync) hotfix per
  [ERROR_MONITORING_PLAN.md](./ERROR_MONITORING_PLAN.md) staged rollout.
- **Privacy/legal** → privacy inbox + flag for counsel if a rights request is complex.
- **Payment/refund** → store support (Apple/Google) for the user; we cannot override.
- **Teacher reward** → manual non-cash reward reconciliation as above.
- **Out of scope (pronunciation, fluency claims)** → set expectations: LexiTap is a vocabulary tool,
  not a pronunciation or fluency product.

## Tooling

Start with a plain support inbox + a saved-replies/FAQ doc (zero cost). Graduate to a free-tier
help-desk only when daily volume exceeds a single batched pass. Maintain canned responses for each
playbook above to keep response time low.

## Open Questions

- Build a public FAQ/help page on the website for top-five deflections before launch?
- Threshold (tickets/day) at which a help-desk tool becomes worth the setup cost.
- Exact qualifying threshold and cadence for issuing teacher Premium-seat rewards.
