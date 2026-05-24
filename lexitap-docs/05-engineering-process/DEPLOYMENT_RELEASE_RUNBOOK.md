---
title: Deployment and Release Runbook
category: engineering-process
status: active
updated: 2026-05-24
priority: P1
tags: [deployment, release, app-store, google-play, eas, eas-update, ota, expo, certificates, provisioning, keystore, push-notifications, apns, fcm, revenuecat, iap, testflight, submission, api-keys, renewals, sign-in-with-apple]
---

# Deployment and Release Runbook

The hands-on setup runbook for shipping LexiTap to the iOS App Store and Google Play: every account, console, certificate, signing key, and command, in the order you need them. This is the operational "what to click and run" layer. The strategy layer — ASO, pricing, review-guideline risk mitigation, phased rollout — lives in [../08-financial-legal/APP_STORE_DISTRIBUTION_STRATEGY.md](../08-financial-legal/APP_STORE_DISTRIBUTION_STRATEGY.md). The Day-1 development environment (separate from release setup) is in [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md).

## Table of Contents

- [LexiTap-Specific Values](#lexitap-specific-values)
- [1. Accounts to Create](#1-accounts-to-create)
- [2. Apple Developer Program](#2-apple-developer-program)
- [3. App Store Connect](#3-app-store-connect)
- [4. iOS Certificates and Provisioning](#4-ios-certificates-and-provisioning)
- [5. Google Play Console](#5-google-play-console)
- [6. Android Signing (Keystore)](#6-android-signing-keystore)
- [7. Expo and EAS](#7-expo-and-eas)
- [8. Push Notifications](#8-push-notifications)
- [9. RevenueCat (Payments and IAP)](#9-revenuecat-payments-and-iap)
- [10. TestFlight](#10-testflight)
- [11. Submitting to the App Store](#11-submitting-to-the-app-store)
- [12. Submitting to Google Play](#12-submitting-to-google-play)
- [13. API Keys Master List](#13-api-keys-master-list)
- [14. Renewal and Expiry Calendar](#14-renewal-and-expiry-calendar)
- [15. OTA Updates vs Store Builds (EAS Update)](#15-ota-updates-vs-store-builds-eas-update)
- [Reconciliations](#reconciliations)

## LexiTap-Specific Values

Use these concrete values, not the generic placeholders that float around setup tutorials:

- **Bundle ID / Android package:** `com.lexitap.app` — confirm against `app.config.ts` before registering; both are **permanent** once published.
- **IAP product SKUs:** `com.lexitap.*` per [../04-technical-architecture/DATABASE_SCHEMA.md](../04-technical-architecture/DATABASE_SCHEMA.md) and the product table in [../08-financial-legal/APP_STORE_DISTRIBUTION_STRATEGY.md](../08-financial-legal/APP_STORE_DISTRIBUTION_STRATEGY.md#iap-product-setup).
- **IAP vendor:** RevenueCat (locked). Native SDK install + `RevenueCatIapService` are deferred to Phase 3; `StubIapService` stays bound in the composition root until then. See [../08-financial-legal/MONETIZATION_COMPLIANCE.md](../08-financial-legal/MONETIZATION_COMPLIANCE.md).
- **Secrets:** `.env` in dev, EAS secrets in production — never committed or hardcoded (see [CI_CD_PIPELINE.md](./CI_CD_PIPELINE.md)).

## 1. Accounts to Create

Do these first; everything else depends on them.

| Account | URL | Cost | Notes |
|---------|-----|------|-------|
| Apple Developer | developer.apple.com | $99/yr | Required to ship on iOS |
| Google Play Console | play.google.com/console | $25 one-time | Required to ship on Android |
| Expo / EAS | expo.dev | Free tier | Required for EAS Build/Submit/Update |
| RevenueCat | revenuecat.com | Free up to $2.5k MRR | IAP + subscriptions |

The Apple + Google fees ($99 + $25) are the largest single line in the ~$144 Year 1 budget — see [../08-financial-legal/THIRD_PARTY_DEPENDENCY_AUDIT.md](../08-financial-legal/THIRD_PARTY_DEPENDENCY_AUDIT.md).

## 2. Apple Developer Program

Enroll at developer.apple.com/programs/enroll with a dedicated Apple ID, choose Individual, pay $99/yr (auto-renews), wait 24–48h for approval.

After enrollment, capture: **Team ID** (10 chars, e.g. `ABC123XYZ9`, under Membership Details), the enrollment **Apple ID email**, and an **App-Specific Password** (for EAS Submit).

Register the Bundle ID: Identifiers → + → App IDs → App → `com.lexitap.app` → enable capabilities (Push Notifications, In-App Purchase, Associated Domains as needed) → Save. Permanent.

## 3. App Store Connect

appstoreconnect.apple.com → My Apps → + → New App. Fill Platform iOS, Name (≤30 chars, unique on store), Primary Language, Bundle ID from §2, SKU (internal, never public).

Capture after creation: **Apple ID (App)** numeric (e.g. `6772702192`) — used as `ascAppId` in `eas.json`; confirm Bundle ID matches `app.config.ts`.

Listing assets: name (30) · subtitle (30) · description (4000) · keywords (100) · support URL · marketing URL (optional) · **Privacy Policy URL (required)** · icon 1024×1024 PNG (no alpha, no rounded corners) · age rating · category · screenshots.

**Screenshot sizes (2025):** only the 6.9" iPhone size (1320×2868) is mandatory; Apple auto-scales down. 6.5" (1284×2778) and 5.5" (1242×2208) optional; iPad Pro 12.9" (2048×2732) only if iPad is supported. Max 10 per size. LexiTap leans iPhone-only at launch.

## 4. iOS Certificates and Provisioning

EAS creates and stores the Distribution Certificate, Provisioning Profiles (per build profile), and the push key automatically — you normally never touch these.

```bash
eas credentials                              # view stored credentials
eas build --platform ios --clear-credentials # force-regenerate
```

Apple caps active distribution certificates at **3 per team**; revoke old ones at developer.apple.com → Certificates if you hit it.

## 5. Google Play Console

play.google.com/console → register with a dedicated Google account → pay $25 one-time → fill developer profile → wait 1–3 days for verification.

Create app: All apps → Create app → name, default language, App/Game, Free/Paid, accept declarations.

Listing assets: short description (80) · full description (4000) · phone screenshots (min 2; min 320px / max 3840px, 16:9 or 9:16) · feature graphic 1024×500 (required) · icon 512×512 PNG · **Privacy Policy URL (required)**.

Capture: Package name `com.lexitap.app` (permanent after first publish) · numeric App ID (dashboard URL).

Content rating: Policy → App content → Content rating (IARC) → Everyone. **Data safety form (required):** declare account email + progress sync, no sharing, no selling — must match the iOS App Privacy label exactly.

## 6. Android Signing (Keystore)

Option A (recommended) — EAS manages it:

```bash
eas build --platform android --profile production   # prompts to generate a keystore → Yes
eas credentials --platform android                  # download a backup
```

Option B — self-managed:

```bash
keytool -genkey -v -keystore your-app.keystore -alias your-alias -keyalg RSA -keysize 2048 -validity 10000
eas credentials --platform android   # register
```

Losing the keystore means you can never update the app on Play — you would have to publish a brand-new listing. EAS storage is the safest default. Google Play App Signing re-signs with Google's key after upload; note the App signing key SHA-1 (Setup → App signing) if you add Google Sign-In / Maps.

## 7. Expo and EAS

```bash
npm install -g eas-cli
eas login
eas init   # creates the expo.dev project, writes extra.eas.projectId into app.config.ts
```

Free EAS tier = 30 builds/month, sufficient for a solo founder. Secrets:

```bash
eas secret:create --name SECRET_NAME --value "the_value"
eas secret:list
eas secret:delete --name SECRET_NAME
```

Reference in `app.config.ts` via `extra: { MY_KEY: process.env.MY_KEY || '' }` and in `eas.json` build profiles via `"env": { "MY_KEY": "@env MY_KEY" }`.

## 8. Push Notifications

**iOS — APNs Auth Key (recommended, never expires):** developer.apple.com → Keys → + → check APNs → download the `.p8` (**one-time download only**) → note Key ID (10 chars) + Team ID → `eas credentials --platform ios` → Push Notifications → Add Auth Key. (Avoid the certificate path; it expires yearly.)

**Android — FCM:** console.firebase.google.com → create/use a project → add Android app with `com.lexitap.app` → download `google-services.json` to `android/app/` → get Server Key (legacy) or Service Account JSON (v1) from Project Settings → Cloud Messaging → `eas credentials --platform android` → Push Notifications → Add FCM Key.

## 9. RevenueCat (Payments and IAP)

RevenueCat is the locked vendor; wiring is deferred to Phase 3 but the store/console setup can be staged earlier.

1. **Create project** at app.revenuecat.com → add iOS app (Bundle ID + ASC API key) + Android app (Package Name + Play service credentials).
2. **ASC API key for RevenueCat:** App Store Connect → Users and Access → Integrations → In-App Purchase → generate → download `.p8` + Key ID + Issuer ID → paste into RevenueCat iOS settings.
3. **Play service credentials:** console.cloud.google.com → enable Google Play Android Developer API → create Service Account → grant Financial data viewer in Play Console (Setup → API access) → download JSON → upload to RevenueCat Android settings.
4. **Create products** in App Store Connect (Non-Consumable per one-time tier; one Auto-Renewable Subscription for Premium Pass) and Google Play (matching IDs), using the `com.lexitap.*` SKUs.
5. **Entitlements + Offerings:** create the `premium` entitlement, attach both stores' product IDs, create the `default` offering. App code reads it via `Purchases.getOfferings()`.
6. **API keys:** copy iOS (`appl_…`) and Android (`goog_…`) public SDK keys → store as EAS secrets `REVENUECAT_IOS_KEY` / `REVENUECAT_ANDROID_KEY`.

## 10. TestFlight

Internal testers (≤100): no review, available immediately after each upload (App Store Connect → TestFlight → Internal Testing). External testers (≤10,000): require Beta App Review (1–2 days). Maps onto the phased rollout in the distribution strategy doc.

```bash
eas build --platform ios --profile production
eas submit --platform ios
```

## 11. Submitting to the App Store

Pre-submission: 6.9" screenshots uploaded · listing text/URLs filled · privacy policy URL live · age rating done · IAP products approved · App Privacy questionnaire filled · build tested on TestFlight · Export Compliance answered.

```bash
eas build --platform ios --profile production
eas submit --platform ios                 # or: --id <build-id>
```

Recommended credential: an App Store Connect API Key (App Manager role) stored via `eas secret:create --name ASC_API_KEY --value "$(cat AuthKey_XXXXX.p8)"`, or the inline `eas.json` form:

```json
"submit": { "production": { "ios": {
  "appleId": "you@email.com", "ascAppId": "1234567890", "appleTeamId": "ABC123XYZ9"
} } }
```

Review timeline: first submit 1–3 days, updates ~24h, expedited review available for critical bugs.

## 12. Submitting to Google Play

Promote in order: Internal → Closed → Open → Production. Pre-submission: listing complete · content rating done · data safety submitted · privacy policy live · signing configured · target API level meets Play's current minimum (usually latest − 1).

```bash
eas build --platform android --profile production   # .aab
eas submit --platform android
```

```json
"submit": { "production": { "android": { "track": "internal" } } }
```

EAS Submit needs a Play Service Account (Play Console → Setup → API access → link Cloud project → create Service Account → Release Manager → download JSON), referenced via `"serviceAccountKeyPath"` in `eas.json`.

## 13. API Keys Master List

| Key | Source | Destination | Expires? |
|-----|--------|-------------|----------|
| RevenueCat iOS SDK Key | RevenueCat → API Keys | EAS secret `REVENUECAT_IOS_KEY` | No |
| RevenueCat Android SDK Key | RevenueCat → API Keys | EAS secret `REVENUECAT_ANDROID_KEY` | No |
| APNs Auth Key (.p8) | Apple Developer → Keys | EAS credentials | No |
| APNs Key ID | Apple Developer → Keys | EAS credentials | No |
| Apple Team ID | Apple Developer → Membership | `eas.json`, EAS credentials | No |
| App Store Connect App ID | ASC → App Information | `eas.json` `ascAppId` | No |
| App Store Connect API Key | ASC → Integrations | EAS or local `.p8` | No |
| FCM Server Key / Service Account | Firebase Console | EAS credentials | No |
| Google Play Service Account JSON | Google Cloud Console | EAS or `eas.json` | No |
| Expo Project ID | expo.dev → settings | `app.config.ts` `extra.eas.projectId` | No |

## 14. Renewal and Expiry Calendar

| Item | Expires | Action |
|------|---------|--------|
| Apple Developer Program | Yearly ($99) | Auto-renews — watch for failed payments |
| Distribution Certificate | Yearly | EAS renews on next build |
| APNs Certificate (if used) | Yearly | Switch to APNs Auth Key (.p8) — never expires |
| APNs Auth Key (.p8) | Never | — |
| Google Play Account | Never | One-time $25 |
| Android Keystore | ~Never (10,000-day) | Back up safely |

If Apple membership lapses: the app stays live but cannot be updated until renewed; TestFlight builds expire after 90 days regardless.

## 15. OTA Updates vs Store Builds (EAS Update)

EAS Update pushes JavaScript and asset changes over-the-air without a store review, so a JS-only bug fix can reach users in minutes. It is **not** a substitute for a store build, and for an offline-first app with a bundled SQLite database the boundary matters. Decide by what changed:

| Change | Channel | Why |
|--------|---------|-----|
| JS bug fix, copy tweak, small style/layout change | **OTA (EAS Update)** | No native or binary change; safe to ship instantly. |
| New native module (e.g. the RevenueCat SDK at Phase 3, any config-plugin change) | **Store build** | Native code cannot be hot-swapped; OTA cannot change the binary. |
| New paid content tier / content drop (Week 22+) | **Store build** | New IAP products + store listing metadata must be created and reviewed regardless; bundle the refreshed `words.db` in the same build. |
| `words.db` schema or large-content change | **Store build (default)** | The bundled DB is a multi-MB binary asset; shipping it OTA is heavy and risks partial downloads on poor connections. Reserve OTA for small asset fixes only. |
| Anything touching `app.config.ts` native config, permissions, or SDK upgrade | **Store build** | Changes the native binary. |

Rules:

- **Runtime version gating:** an OTA update only applies to builds whose `runtimeVersion` matches. Bump `runtimeVersion` on every native/store build so stale binaries never pull an incompatible JS bundle. Misconfiguring this is the classic way to brick installs — verify before the first production OTA.
- **Offline-first invariant:** updates download in the background and apply on next launch; the app must stay fully usable offline if an update never arrives. Never gate core quiz/review behind an update fetch (consistent with the offline-first rules in [CODING_STANDARDS.md](./CODING_STANDARDS.md)).
- **Channels mirror tracks:** map EAS Update channels to the rollout tracks in [../08-financial-legal/APP_STORE_DISTRIBUTION_STRATEGY.md](../08-financial-legal/APP_STORE_DISTRIBUTION_STRATEGY.md#phased-rollout) (e.g. `preview` for TestFlight/internal, `production` for live) so beta and production get independent update streams.
- **Store-policy guardrail:** OTA may fix bugs and adjust content, but must not materially change the app's purpose or bypass review for features that require it (both stores prohibit this). Content drops go through review because they add IAP products anyway.

```bash
npx expo install expo-updates           # add once
eas update --branch production --message "fix: …"   # ship an OTA bundle
```

## Reconciliations

- **Screenshot sizes:** this runbook's 6.9"-only requirement (2025) supersedes the older 6.7"/6.5" guidance in [../08-financial-legal/APP_STORE_DISTRIBUTION_STRATEGY.md](../08-financial-legal/APP_STORE_DISTRIBUTION_STRATEGY.md#apple-app-store-submission-requirements). Treat 6.9" as canonical.
- **IAP vendor:** the strategy doc's "Open Question" on `expo-in-app-purchases` vs RevenueCat is **resolved — RevenueCat is locked**. The maintenance-mode `expo-in-app-purchases` is not used.
- **Sign in with Apple:** if Google Sign-In ships, Apple Guideline 4.8 also requires Sign in with Apple — schedule that auth work before iOS submission (tracked in the distribution strategy doc's review-risk table).
