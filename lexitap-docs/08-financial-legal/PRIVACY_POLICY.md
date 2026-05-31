---
status: "complete"
last_updated: "2026-05-31"
audience: ["App Store reviewers", "users", "legal/compliance"]
purpose: "Privacy policy required for App Store submission (Apple 5.1.2). Canonical source: website/public/privacy.html. This markdown version is reference and audit."
---

# Privacy Policy

**Last updated:** 31 May 2026

LexiTap ("we", "us") is an offline-first English vocabulary app. We built it to collect as little about you as possible. This policy explains what we collect, why, and the choices you have.

## The short version

Your learning progress lives on your device. We don't sell your data, show ads, or track you across other apps. Analytics are anonymous and optional. Crash reports are stripped of personal information before they leave your phone.

---

## 1. What we collect

| Data | Why | Where it lives |
|------|-----|-----------------|
| Email & display name (if you create an account) | Sign-in and device-switch recovery | Supabase (auth provider) |
| Learning progress — review history, schedule, streaks | To run spaced repetition and show your stats | Your device. Optional encrypted backup to our storage. |
| Purchases (exam packs) | To unlock and restore what you bought | Apple / Google & our payments processor |
| Anonymous usage events — e.g. app opened, session completed | To understand which features help learners and fix drop-off | PostHog (EU). Pseudonymous ID only. Opt-out in Settings. |
| Crash diagnostics — error traces, app/OS version, device model | To find and fix bugs | Sentry. Personal data scrubbed on-device first. |

### What we never collect

Location, contacts, photos, microphone or voice, health data, government IDs, or advertising identifiers (IDFA/AAID).

---

## 2. Analytics

Usage analytics are **anonymous** — tied to a random device ID, never to your email or account. They contain no personal information, are hosted in the EU, and are used only to improve the app (retention, conversion, and finding broken flows). We never use them for advertising, cross-app tracking, or selling data. You can turn analytics off at any time in **Settings → Privacy**.

**Provider:** PostHog (EU host)  
**Data sent:** App opens, session completes, quiz attempts (events only, no identifiers or PII)  
**Retention:** As long as needed to understand app health (typically 90 days minimum)  
**Opt-out:** Settings → Privacy → Disable Analytics

---

## 3. Crash reporting

When the app crashes, a diagnostic report helps us fix it. Before any report leaves your device, we strip out identifying information — user IDs, email, IP address, device name, tokens, and URLs. We do not record your screen or session.

**Provider:** Sentry  
**Data scrubbed:** User IDs, emails, tokens, IP, device names, URLs (via `beforeSend`/`beforeBreadcrumb` hooks)  
**Retention:** Only as long as needed to fix the reported issue  

---

## 4. Sub-processors

We rely on a small number of trusted providers to operate LexiTap:

- **Supabase** — Account authentication and encrypted backup storage
- **Apple App Store / Google Play** — App distribution and purchase processing
- **RevenueCat** — Purchase and entitlement management
- **PostHog (EU)** — Anonymous product analytics
- **Sentry** — Crash diagnostics (PII-scrubbed)
- **Text-to-speech provider** — Pronunciation audio (TBD; may be local or cloud-based)

---

## 5. Where your data is stored

Your learning data is stored locally on your device by default. If you sign in and enable backup, an **encrypted** copy is saved to our cloud storage so you can recover it on a new device. Some providers above may process data outside your country; where required, we rely on standard contractual safeguards.

---

## 6. Data retention

- **On-device data:** Stays until you delete it or uninstall the app
- **Account & backups:** Kept until you delete your account and backups (see Account Deletion)
- **Analytics:** Retained only as long as needed to improve the product (typically 90 days)
- **Crash reports:** Kept only as long as needed to fix the reported issue

---

## 7. Your rights (GDPR / CCPA)

Depending on where you live, you may have the right to:

- **Access** your personal data (user.db contents, account details, backup history)
- **Correct** inaccurate data
- **Export** your data in a portable format
- **Delete** your account and all associated data
- **Object** to certain processing (e.g., analytics)

Because most data lives on your device, you control it directly. For account data and backups, email **support@lexitap.app** and we will assist. We do not sell personal data.

---

## 8. Children

LexiTap is intended for users aged 13 and older. The app shows an age gate (16+) on first launch for COPPA/GDPR compliance.

- **Under 13:** Parents must provide verifiable consent if data collection is required.
- **13–15:** The app collects minimal data and requires age verification.
- **16+:** Full access without parental consent (legal age of digital consent in EU).

If you believe a child under 13 has provided us data without parental consent, contact us immediately and we will remove it.

---

## 9. Changes to this policy

We may update this policy as the app evolves. Material changes will be reflected here with a new "last updated" date, and where appropriate, in the app.

---

## 10. Contact

- **Privacy questions:** privacy@lexitap.app
- **Support & data requests:** support@lexitap.app
- **Account deletion:** See [ACCOUNT_DELETION.md](ACCOUNT_DELETION.md)

---

## Compliance notes

**App Store requirements met:**
- ✓ Apple 5.1.2: Privacy policy present and accurate
- ✓ Clear explanation of data collected, why, and where
- ✓ Third-party processing disclosed (Supabase, PostHog, Sentry, RevenueCat)
- ✓ Analytics with opt-out
- ✓ Crash reporting with PII scrub
- ✓ No false claims (e.g., "no data collection" — we do collect some)
- ✓ Age-appropriate privacy protections (13+ app with 16+ age gate)

**Policy reflects actual app behavior:**
- PostHog: Env-gated (`EXPO_PUBLIC_POSTHOG_API_KEY`), anon_id only, autocapture off, EU host
- Sentry: Env-gated DSN, beforeSend/beforeBreadcrumb PII scrub (fail-closed)
- Supabase: Auth (email) + encrypted backups only (no live sync)
- RevenueCat: Purchase/entitlement management (chosen over expo-iap in Phase 3)
- No IDFA/AAID collection
- No cross-app tracking
- No re-targeting ads or ad SDKs
