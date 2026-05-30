---
title: GDPR COPPA and Regional Compliance
category: operations-compliance
status: active
updated: 2026-05-24
priority: P0
tags: [gdpr, coppa, compliance, data-handling, regional, data-inventory, age-gating, dpa, draft]
---

# GDPR, COPPA, and Regional Compliance Plan (Draft)

> DRAFT — planning document by a non-lawyer founder. Review by qualified counsel is required before
> launch. Not legal advice. Pairs with the draft
> [PRIVACY_POLICY_TERMS_OF_SERVICE.md](./PRIVACY_POLICY_TERMS_OF_SERVICE.md).

## Table of Contents

- [Compliance Posture](#compliance-posture)
- [Data Inventory](#data-inventory)
- [Data Flow](#data-flow)
- [GDPR Lawful Basis Mapping](#gdpr-lawful-basis-mapping)
- [Data Subject Rights Mechanisms](#data-subject-rights-mechanisms)
- [COPPA and Age-Gating Approach](#coppa-and-age-gating-approach)
- [App Store Data-Safety Label Mapping](#app-store-data-safety-label-mapping)
- [DPA and Sub-Processor Considerations](#dpa-and-sub-processor-considerations)
- [Pre-Launch Compliance Checklist](#pre-launch-compliance-checklist)
- [Open Questions](#open-questions)

## Compliance Posture

LexiTap distributes globally, so it must satisfy GDPR/UK GDPR (EU/UK), US privacy law (COPPA +
CCPA/CPRA), and App Store / Play data-disclosure rules. The architecture is privacy-favorable by
default: offline-first, most data on-device, no ads, no third-party advertising trackers, no data
sale. This reduces but does not eliminate obligations — cloud sync, accounts, purchases, and the
teacher backend all process personal data.

Guiding principles: data minimization, purpose limitation, on-device-first, and provable deletion
(account deletion cascades cloud data per
[../04-technical-architecture/DATABASE_SCHEMA.md](../04-technical-architecture/DATABASE_SCHEMA.md) sync edge cases).

## Data Inventory

| ID | Data element | Category | PII? | Location | Controller/Processor | Retention |
|----|--------------|----------|------|----------|----------------------|-----------|
| D1 | Email | Account | Yes | Supabase + device | Controller; Supabase processor | Until deletion |
| D2 | Display name | Account | Yes (low) | Supabase + device | Controller; Supabase processor | Until deletion |
| D3 | Auth provider / OAuth token / password hash | Auth | Yes | Supabase Auth | Supabase processor | Until deletion |
| D4 | Timezone (IANA) | Account | No (low) | Device (source) + Supabase | Controller | Until deletion |
| D5 | SRS progress / mastery / review dates | Learning | Pseudonymous | Device SQLite (encrypted blob backup to Supabase Storage, Phase 3+) | Controller | Until deletion |
| D6 | Quiz attempt log | Learning | Pseudonymous | Device (`quiz_attempts`) | Controller (on-device) | Until uninstall |
| D7 | Purchase receipts | Commercial | Yes (linked) | RevenueCat (external) | Processor; Apple/Google | Tax-record term |
| D8 | Streak / gamification stats | Learning | Pseudonymous | Device SQLite (encrypted blob backup to Supabase Storage, Phase 3+) | Controller | Until deletion |
| D9 | Usage analytics events | Analytics | Pseudonymous | Device `event_log`; aggregates only leave | Controller | Aggregates only |
| D10 | Crash / error diagnostics | Diagnostics | Pseudonymous | Error provider | Controller; provider processor | ~90 days |
| D11 | Teacher email + display name | Teacher | Yes (low) | Supabase `teachers` | Controller; Supabase processor | Until account deletion |
| D12 | Referral / advocate credit records | Teacher | Pseudonymous (linked to D11) | Supabase `referrals` | Controller | Until account deletion |

## Data Flow

1. **On-device (default):** SQLite holds words, progress, attempts, stats, and the
   append-only `event_log`. Fully functional offline and pre-auth.
2. **Auth + sync:** On sign-in, Supabase Auth authenticates; sync pushes/pulls the mirror tables.
   Cloud is mirror, not authority. Row-Level Security scopes each user to their own rows.
3. **Purchases:** IAP via Apple/Google; receipts validated server-side by RevenueCat; entitlement cached in memory only
   and mirrored.
4. **Teacher portal (separate surface):** Teacher signup writes `teachers`; referred purchases write
   `referrals`; teacher advocates receive in-app Premium credits only — no cash payout, no third-party payment processor.
5. **Analytics/diagnostics:** Events logged locally; only pseudonymous aggregates and crash traces
   leave the device.

## GDPR Lawful Basis Mapping

| Data | Purpose | Lawful basis |
|------|---------|--------------|
| D1–D4 | Account + sync (deliver the service) | Contract (6(1)(b)) |
| D5–D8 | Progress, gamification | Contract (6(1)(b)) |
| D7 | Tax/accounting retention | Legal obligation (6(1)(c)) |
| D9 | Aggregate product analytics | Legitimate interests (6(1)(f)); consent where required |
| D10 | Crash diagnostics, security | Legitimate interests (6(1)(f)) |
| D11–D12 | Teacher advocate program (in-app credit rewards only; no cash payout) | Contract (6(1)(b)) |

A short Legitimate Interests Assessment (LIA) backs D9/D10: minimal pseudonymous data, clear benefit
(stability and product improvement), low impact, opt-out available.

## Data Subject Rights Mechanisms

- **Access / portability:** In-app "Export my data" produces machine-readable JSON of progress and
  stats; cloud-side export of account rows on email request.
- **Erasure:** In-app "Delete account" cascades all cloud mirror tables; on-device data cleared on
  uninstall (offer export first). Legally retained purchase/tax records survive in minimized form.
- **Rectification:** Editable display name/email/timezone in Settings.
- **Restriction / objection / consent withdrawal:** Analytics toggle in Settings; email
  `{{PRIVACY_EMAIL}}` for the rest.
- **Response SLA:** 30 days, extendable 60 days for complex requests with notice. Logged in the
  support runbook.

## COPPA and Age-Gating Approach

LexiTap is **not directed to children** (target audience is adult ESL learners), but a global
audience means minors may attempt to use it. Approach:

- **Neutral age gate at signup** (date-of-birth or age-band entry, not "are you 13?"). Neutral
  collection avoids encouraging false answers.
- **Below-threshold block:** users below the applicable minimum (13 US / up to 16 EU, evaluated by
  region) are not permitted to create an account. No alternate child-data path exists — the app does
  not build a child product or seek verifiable parental consent.
- **No targeting of children:** no child-directed content, no behavioral ads (none at all), no social
  features.
- **Discovery handling:** if we learn a sub-threshold child created an account, delete the account
  and cloud data promptly.
- **Store category:** rate the app for a general/teen+ audience, not "Made for Kids" / "Kids"
  category (which would impose COPPA-heavy obligations we are explicitly avoiding).

## App Store Data-Safety Label Mapping

Both stores require disclosure. Draft mapping (confirm against final SDK behavior):

| Data type | Collected | Linked to identity | Used for tracking | Purpose |
|-----------|-----------|--------------------|--------------------|---------|
| Email address | Yes | Yes | No | Account, app functionality |
| Name (display) | Yes | Yes | No | App functionality |
| Purchase history | Yes | Yes | No | App functionality |
| App interactions / usage | Yes | No (pseudonymous) | No | Analytics, app functionality |
| Crash logs / diagnostics | Yes | No | No | App functionality |
| User ID (account) | Yes | Yes | No | Account |

"Tracking" (cross-app/advertising) = **No** across the board — a meaningful differentiator. Apple
Privacy Nutrition Label and Google Play Data Safety form must reflect this table. No App Tracking
Transparency prompt is needed because we do not track.

## DPA and Sub-Processor Considerations

- **Supabase:** Execute Supabase's Data Processing Addendum; record SCCs for any non-EU region;
  document storage region; rely on Supabase RLS + managed Auth. Primary sub-processor.
- **Apple / Google:** Merchants of record for IAP; their payment terms and DPAs govern transaction
  data — we receive only validated receipts, not card data.
- **Error-monitoring provider (e.g. Sentry):** DPA in place; scrub PII from payloads; minimal
  retention. See [ERROR_MONITORING_PLAN.md](./ERROR_MONITORING_PLAN.md).
- **ElevenLabs:** Build-time only; no end-user personal data sent, so not a runtime sub-processor.
- Maintain a **sub-processor list** (this table) and update the privacy policy on change.

## Pre-Launch Compliance Checklist

- [ ] Publish privacy policy at a stable URL; link in both store listings.
- [ ] Implement neutral age gate + below-threshold block.
- [ ] Implement in-app export and account-deletion (cascade verified).
- [ ] Add analytics opt-out toggle (consent where required).
- [ ] Execute Supabase DPA; record SCCs + storage region.
- [ ] Execute error-monitoring DPA; enable PII scrubbing.
- [ ] Complete Apple Privacy Nutrition + Play Data Safety forms per mapping above.
- [ ] Write LIA for analytics + diagnostics.
- [ ] Legal review of privacy policy + ToS.

## Open Questions

- `requires-product-decision` — Per-region age thresholds: hard-code 16 (simpler/stricter) or vary by detected region (accurate/complex). Lean 16 for MVP.
- `requires-external-validation` — Supabase storage region (EU vs. US) and data-transfer implications. Decide before Phase 3 backup feature.
- `requires-external-validation` — Analytics consent gating: global opt-out vs. GDPR/UK only. Align with counsel and [ANALYTICS_PLAN.md](./ANALYTICS_PLAN.md).
- `requires-external-validation` — CCPA/CPRA "Do Not Sell/Share" confirming disclosure — confirm with counsel.
