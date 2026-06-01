---
title: Sub-processor DPA Checklist (LEGAL-3)
status: pending
phase: P5 (pre-launch)
updated: 2026-05-31
---

# Sub-processor DPA Checklist

Three sub-processors require signed Data Processing Agreements before launch. All are mandatory for GDPR compliance (user data flows through each).

---

## 1. Supabase — auth + encrypted backups

**Role:** Auth identity store, encrypted `user.db` backup storage.  
**Data processed:** Email address (auth), encrypted binary backup blob (no plaintext PII).  
**Region:** Pick EU (`eu-west-1` or `eu-central-1`) unless latency forces otherwise.

**Action:**
1. Log in to [supabase.com](https://supabase.com) → Organization → Settings → Legal
2. Accept the DPA (self-serve click-through under "Data Processing Agreement")
3. Confirm data region is EU in Project Settings → Infrastructure
4. Download/save the signed DPA PDF for your records

**Status:** ☐ DPA signed · ☐ EU region confirmed

---

## 2. PostHog — pseudonymous analytics

**Role:** App improvement analytics only. `anon_id` pseudonym, no email/Supabase ID, autocapture off.  
**Data processed:** `anon_id` (UUID), event names, app version, platform.  
**Region:** EU cloud (`eu.posthog.com`) — already enforced in code at `infrastructure/analytics/PostHogAnalyticsService.ts`.

**Action:**
1. Log in to [app.posthog.com](https://app.posthog.com) → Organization → Settings → Privacy
2. Download the DPA (PDF, self-serve)
3. Sign and return (or accept click-through if available)
4. Confirm project host is `https://eu.i.posthog.com` — matches `PostHogAnalyticsService.ts:12`

**⚠️ Known bug:** `PostHogAnalyticsService.ts:12` may still point to US host — verify before signing DPA as "EU processing."

**Status:** ☐ DPA signed · ☐ EU host confirmed in code

---

## 3. Sentry — crash reporting (PII-scrubbed)

**Role:** Crash + error reporting. `beforeSend`/`beforeBreadcrumb` strip all PII before upload.  
**Data processed:** Sanitized stack traces, device OS/version, app version. No user ID, no email, no IPs.  
**Region:** Sentry SaaS (US-based). PII scrub in `infrastructure/crash/` means no personal data leaves device.

**Action:**
1. Log in to [sentry.io](https://sentry.io) → Settings → Legal → Data Processing Agreement
2. Accept DPA (click-through available on paid plans; free tier uses standard ToS)
3. If on free plan: standard ToS is sufficient since no personal data is processed (scrubbed before send)
4. Document scrub config location for audit trail: `mobile/src/infrastructure/crash/`

**Status:** ☐ DPA accepted/noted · ☐ Scrub config referenced in privacy policy ✓

---

## 4. RevenueCat — payment entitlements

**Role:** IAP receipt validation, entitlement management. No payment card data (Apple/Google handle that).  
**Data processed:** App-user-id (anonymous until auth wired), purchase receipts, entitlement state.  
**DPA:** Available at [revenuecat.com/dpa](https://www.revenuecat.com/dpa)

**Action:**
1. Log in to RevenueCat dashboard → Account → Legal
2. Download + sign DPA
3. Note: RevenueCat is a US-based processor — add to privacy policy sub-processor list (already disclosed)

**Status:** ☐ DPA signed

---

## 5. Apple / Google — platform processors

**Role:** App distribution, IAP processing, push notifications.  
**DPA status:** Covered by their standard developer agreements (Apple Developer Program License, Google Play Developer Distribution Agreement). No separate DPA needed.

**Action:** None — already agreed when enrolling developer accounts.

**Status:** ✅ Covered by developer account enrollment

---

## Summary

| Processor | DPA Required | Self-serve | Priority |
|-----------|-------------|------------|---------|
| Supabase | ✅ Yes | ✅ Click-through | High — handles auth data |
| PostHog | ✅ Yes | ✅ Click-through | Medium — pseudonymous only |
| Sentry | ✅ (or ToS) | ✅ Click-through | Low — no PII after scrub |
| RevenueCat | ✅ Yes | ✅ Download + sign | Medium — purchase data |
| Apple/Google | ✅ Via dev agreement | N/A | ✅ Done |

**Do all four before submitting to App Store.** Apple review doesn't check DPAs, but GDPR exposure is real if an EU user complains to a DPA authority.

---

## Privacy Policy Sub-processor Section

The privacy policy at `website/public/privacy.html` must list all four processors. Verify these appear:

- Supabase (auth, backup) — region: EU
- PostHog (analytics, pseudonymous) — region: EU
- Sentry (crash reporting, PII-scrubbed) — region: US
- RevenueCat (payments) — region: US
- Apple / Google (platform) — region: varies

**Last updated:** 2026-05-31
