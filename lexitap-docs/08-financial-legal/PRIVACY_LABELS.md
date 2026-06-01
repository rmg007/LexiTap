---
title: Privacy Nutrition Labels (LEGAL-5)
status: pending
phase: P5 (pre-launch)
updated: 2026-05-31
---

# Privacy Nutrition Labels

Exact values to enter in App Store Connect (iOS) and Google Play Data Safety (Android) before submission. Both must match each other and the runtime SDK behavior exactly — mismatch = rejection or removal.

---

## iOS — App Store Privacy Nutrition Label

Enter at: **App Store Connect → App → App Privacy**

### Data Not Collected

Set "Do you collect data from this app?" to **Yes** (we collect some data), then declare:

---

### Data Linked to the User

| Category | Data Type | Use | Linked to Identity | Tracking |
|----------|-----------|-----|-------------------|---------|
| **Contact Info** | Email Address | App Functionality (account login + backup) | ✅ Yes | ❌ No |

> Source: Supabase auth — user provides email for magic-link login. Used only for account access + backup key.

---

### Data Not Linked to the User

| Category | Data Type | Use | Linked to Identity | Tracking |
|----------|-----------|-----|-------------------|---------|
| **Identifiers** | Device ID / User ID | Analytics | ❌ No (`anon_id` pseudonym only) | ❌ No |
| **Usage Data** | App Interactions | Analytics | ❌ No | ❌ No |
| **Diagnostics** | Crash Data | App Stability | ❌ No (PII-scrubbed by Sentry) | ❌ No |

> Identifiers: PostHog `anon_id` (UUID, never linked to email/Supabase ID).  
> Usage Data: PostHog events (screen views, quiz completions, feature usage — no content data).  
> Diagnostics: Sentry crash reports, PII stripped in `beforeSend`/`beforeBreadcrumb`.

---

### Data NOT Collected (leave unchecked)

- Location
- Health & Fitness
- Financial Info (IAP receipts handled by Apple, not transmitted to our servers)
- Sensitive Info
- Contacts
- Browsing History
- Search History
- Photos or Videos
- Audio Data
- Gameplay Content
- Other Data

---

### Tracking

**"Do you use data from this app to track users?"** → **No**

Rationale: PostHog uses `anon_id` (pseudonymous). No IDFA, no AAID, no cross-app tracking, no ad networks. Autocapture is off. Purpose is limited to app improvement only.

---

### Privacy Policy URL

`https://lexitap.app/privacy`

---

## Google Play — Data Safety Section

Enter at: **Google Play Console → App Content → Data Safety**

### Does your app collect or share any of the required user data types?

**Yes** — declare the following:

---

### Data Collected

| Data Type | Collected | Shared | Processed Ephemerally | Required or Optional | Purpose |
|-----------|-----------|--------|----------------------|---------------------|---------|
| **Email address** | ✅ Yes | ❌ No | ❌ No (stored in Supabase) | Optional (required for backup/sync feature) | Account management |
| **User IDs** | ✅ Yes | ❌ No | ❌ No | Optional | Analytics (anon_id only) |
| **App interactions** | ✅ Yes | ❌ No | ❌ No | Optional | Analytics |
| **Crash logs** | ✅ Yes | ❌ No | ❌ No | Required | App stability |
| **App info and performance** | ✅ Yes | ❌ No | ❌ No | Required | App stability |

---

### Data Shared

**None.** No data is sold or shared with third parties for advertising. Sub-processors (Supabase, PostHog, Sentry, RevenueCat) are service providers acting on our behalf, not data buyers.

---

### Security Practices

| Practice | Enabled |
|---------|---------|
| Data is encrypted in transit | ✅ Yes (HTTPS/TLS for all network calls) |
| Data is encrypted at rest | ✅ Yes (`user.db` backups encrypted before upload) |
| Users can request data deletion | ✅ Yes (Settings → Delete Account; email support@lexitap.app) |
| App follows Play Families Policy | ❌ No (app is 13+, not designed for children) |

---

### Is this app designed for children under 13?

**No** — age gate enforces 16+ in onboarding.

---

## Cross-check: Labels vs. Runtime Behavior

Before submitting, verify each label against the actual SDK config:

| Claim | Where to verify | Status |
|-------|----------------|--------|
| Email collected only for account/backup | Supabase auth call in `infrastructure/auth/` | ☐ |
| Analytics = pseudonymous `anon_id`, no email | `infrastructure/analytics/PostHogAnalyticsService.ts` | ☐ |
| Crash data = PII-scrubbed | `infrastructure/crash/SentryCrashService.ts` `beforeSend` | ☐ |
| No tracking (no IDFA/AAID) | No `expo-tracking-transparency` import anywhere | ☐ |
| EU host for PostHog | `PostHogAnalyticsService.ts:12` — must be `eu.i.posthog.com` | ☐ ⚠️ bug noted |
| No data shared with ad networks | No ad SDK imports in `package.json` | ☐ |
| User deletion reachable in app | Settings → Delete Account (currently placeholder — needs LEGAL-4 full flow) | ☐ |

---

## Known Gaps Before Labels Can Be Finalized

1. **PostHog EU host bug** (`PostHogAnalyticsService.ts:12`) — must be fixed before declaring EU-region analytics in the label. Declaring EU processing when the SDK sends to US = false label = rejection risk.

2. **LEGAL-4 account deletion full flow** — Apple 5.1.1(v) requires the in-app deletion path to actually work, not just be a placeholder. Can't truthfully check "users can request data deletion" until the Settings button does something.

3. **RevenueCat** — IAP receipts flow through RevenueCat. Apple categorizes this under "Financial Info → Purchase History." Verify whether this needs to be declared (Apple's guidance: if you don't store/process it, just transmit to RevenueCat as processor, it may be exempt under "service provider" carve-out). Check current Apple guidelines at submission time.

---

**Last updated:** 2026-05-31
