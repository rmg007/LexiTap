---
title: Third-Party Dependency Audit
category: financial-legal
status: active
updated: 2026-05-24
priority: P1
tags: [dependencies, licenses, vendor-risk, lock-in, budget, expo, supabase, elevenlabs, openai, unsplash, paypal, content-licensing]
---

# Third-Party Dependency Audit

Every external service and key library LexiTap depends on, with its cost, license, lock-in risk, and failure exposure — mapped against the ~$194 realistic Year 1 cash outlay. The guiding constraint: keep everything on free tiers except the unavoidable paid items (Apple, Google, domain, audio). Pairs with [REVENUE_MODEL_PRICING.md](./REVENUE_MODEL_PRICING.md) and the tech stack in [../01-discovery-strategy/VISION_PROBLEM_STATEMENT.md](../01-discovery-strategy/VISION_PROBLEM_STATEMENT.md).

## Contents

- [Year 1 Budget Map](#year-1-budget-map)
- [Service Audit](#service-audit)
- [Key npm / Library Audit](#key-npm--library-audit)
- [Content and Word-List Licensing](#content-and-word-list-licensing)
- [Lock-In Summary](#lock-in-summary)
- [Decision Notes](#decision-notes)
- [Official Source Currentness](#official-source-currentness)
- [Open Questions](#open-questions)

## Year 1 Budget Map

| Item | Cost | Type | Notes |
|------|------|------|-------|
| Apple Developer Program | $99 | Annual | Required for App Store + TestFlight |
| Google Play Developer | $25 | One-time | Lifetime registration |
| ElevenLabs audio (TOEFL) | ~$50 | One-off / month-of | Premium TTS; generate, cache, cancel |
| Domain (lexitap.app) | ~$20 | Annual | Registrar varies; project docs cite ~$20/yr |
| **Subtotal** | **~$194** | | Realistic first-year cash outlay |
| Everything else | $0 | Free tier | Expo/EAS, Supabase within quotas, RevenueCat (free to $2.5k monthly tracked revenue), Unsplash, OpenAI free credits, Vercel |

**Budget note:** treat ~$194 as the realistic first-year cash outlay. Lower legacy estimates should not drive planning because they undercount Google Play registration, domain, and audio-enrichment costs. Even the conservative Year 1 revenue model (~$3,600 net) covers the realistic cost base many times over.

## Service Audit

| Service | Role | Cost | License / Terms | Lock-in | Risk |
|---------|------|------|-----------------|---------|------|
| **Expo / EAS** | RN framework + cloud build/submit | Free tier | Expo OSS = MIT; EAS = commercial SaaS | Medium — RN code is portable, but EAS Build/Submit and OTA updates are Expo-specific | Low. Mature, widely used. Free build queue is slow but sufficient solo. |
| **Supabase** | Auth + Postgres + cloud sync + teacher/referral/promo backend | Free within quotas: 50K auth MAU, 500 MB DB, 5 GB egress, 1 GB storage, 500K Edge Function invocations; paid plan when quotas/production needs require | Apache-2.0 core (self-hostable); hosted = commercial | Medium-low — it's Postgres; data is exportable and Supabase is self-hostable | Low-medium. Single backend for sync + business logic = concentration risk, mitigated by Postgres portability. Watch quota usage and free-project inactivity. |
| **ElevenLabs** | Premium TTS for TOEFL (and later pronunciation tiers) | ~$50 one-off | Commercial; check audio-usage/redistribution rights in plan tier | Low — audio is generated, cached, and bundled; no runtime dependency | Medium. Confirm the license permits redistributing generated audio inside a paid app. Generate-and-cancel keeps cost one-off. |
| **OpenAI** | Content enrichment (definitions, synonyms, example sentences) at build time | Free credits / minimal | Commercial API; usage-based | None at runtime — build-time only, output is stored | Low cost; medium content risk (review AI output for accuracy before shipping). |
| **Unsplash** | Imagery for word cards (dual-coding) | Free | Unsplash License (free commercial use, no attribution required, cannot sell unmodified photos as-is) | Low — images cached/bundled | Low-medium. License permits app use; verify no per-image restrictions and avoid building a competing image service. |
| **PayPal / Wise** | Historical teacher cash-payout option, not in current plan | $0 because unused | Commercial ToS | Low — not a runtime dependency | Retired by the non-cash advocate model. Revisit only if cash commissions return. |
| **Apple App Store** | iOS distribution + IAP | $99/yr + 15% commission | Apple Developer Agreement | High — required channel for iOS; IAP mandatory for digital goods | Structural, unavoidable. See compliance doc. |
| **Google Play** | Android distribution + IAP | $25 once + 15% commission | Play Developer Distribution Agreement | High — required channel for Play | Structural, unavoidable. |
| **RevenueCat** | IAP + subscription entitlements, server-side receipt validation | Free up to $2.5k monthly tracked revenue (MTR), then usage-based | Commercial SaaS (SDK is MIT) | Medium — entitlement logic flows through its SDK, but it sits behind the `IapService` port so a swap is bounded | Low-medium. Wiring deferred to Phase 3; free tier covers the projection horizon. |
| **Vercel** | Static website + teacher portal hosting | Free tier | Commercial SaaS | Low — static HTML, trivially movable | Low. |

## Key npm / Library Audit

| Library | Status | Role | License | Risk / Note |
|---------|--------|------|---------|-------------|
| react-native / react | Installed | Core | MIT | Foundational; low risk. |
| expo (SDK 52 repo pin) | Installed | Framework | MIT | Current repo pin is SDK 52. Latest Expo docs list SDK 56; evaluate upgrade with `npx expo-doctor` before submission. |
| expo-sqlite | Installed | Bundled words.db + local progress | MIT | Core offline store; low risk. |
| expo-router | Installed | Navigation | MIT | Low risk. |
| @supabase/supabase-js | Installed | Backend client | MIT | Low risk. |
| better-sqlite3 | Installed | Content CLI SQLite export | MIT | Build-time only; low risk. |
| csv-parse | Installed | Content CLI CSV import | MIT | Build-time only; low risk. |
| Jest / Vitest | Installed / dev | Tests | MIT | Dev-only. `@testing-library/react-native` is not currently installed. |
| react-native-purchases (RevenueCat) | Planned Phase 3 | IAP | MIT | Locked IAP vendor — chosen over `expo-iap` and the deprecated `expo-in-app-purchases`. Native SDK install deferred to Phase 3 (`StubIapService` bound until then). Adds a native config plugin; see RevenueCat service row. |
| @tanstack/react-query v5 | Planned | Server state / sync | MIT | Not currently installed. Add only when sync complexity needs it. |
| zustand | Planned | Local state | MIT | Not currently installed. Add only when global UI state exceeds simple React state. |

Installed core libraries are MIT/permissive — no copyleft (GPL) exposure in the runtime dependency tree. The previously-flagged library risk (`expo-in-app-purchases` being unmaintained) is retired: the deprecated package is not used, and RevenueCat (`react-native-purchases`) is the locked Phase 3 replacement.

## Content and Word-List Licensing

This is the highest legal-risk dependency category and the founder's primary IP exposure.

- **Frequency word lists** (top 3,000 / 9,000 most-used words): frequency rankings derived from corpora can carry licensing terms. The founder's existing corpora must be confirmed as public-domain or properly licensed before shipping Foundation/Advanced. The strategy risk register already flags "word list copyright issues" with mitigation "use public domain; legal review before TOEFL."
- **TOEFL / IELTS / GRE / GMAT word lists:** test names are trademarks (ETS owns TOEFL and GRE; GMAC owns GMAT; IELTS is jointly owned). LexiTap may describe tiers as "TOEFL vocabulary" (nominative fair use / preparation), but must **not** imply endorsement or affiliation, and must not reproduce official test content. Vocabulary itself (words + definitions LexiTap authors) is not protected; copied official materials are. Legal review required before the TOEFL tier ships.
- **Definitions / example sentences:** author original or AI-generate-then-review; do not copy a dictionary's proprietary definitions verbatim.
- **Audio:** ElevenLabs-generated; confirm redistribution rights (above).
- **Imagery:** Unsplash License covers app use.

## Media Licensing & Provenance Registry

To protect LexiTap from copyright claims and platform takedowns, the following registry documents the exact commercial rights, limits, and verification requirements for every third-party asset bundled with the mobile binary:

| Asset Category | Source | License / Tier | Commercial Rights | Launch Verification Gate |
|---|---|---|---|---|
| **Pronunciation Audio** | ElevenLabs | Creator/Independent Publisher ($22/mo tier) | Commercial distribution permitted for downloaded/cached audio. | **Paid Tier Gate:** Confirm founder's account is in a paid tier *during the generation run*. Free tier audio does NOT permit commercial app distribution. |
| **Word Card Imagery** | Unsplash | Unsplash License | Permitted for commercial app packaging. No attribution required. | **No Hot-Linking Gate:** Content pipeline must download and bundle images locally. Streaming/hot-linking Unsplash URLs at runtime is forbidden (violates offline-first and API limits). |
| **Frequency Wordlists** | Open Corpus / Wikipedia | Public Domain (derived from GSL & open corpus ranks) | Permitted to order and tier learning paths. | **No-Prep-Book Gate:** Verify frequency rankings are synthesized from open corpora and do not copy proprietary TOEFL/IELTS preparatory publishers verbatim. |

## Lock-In Summary

| Severity | Dependencies | Why |
|----------|--------------|-----|
| High (structural) | Apple, Google | Required distribution channels; cannot ship mobile without them. |
| Medium | Expo/EAS, Supabase, RevenueCat | Portable underneath (RN code, Postgres data) or port-isolated (RevenueCat behind `IapService`), but tooling/workflow is vendor-shaped. |
| Low | ElevenLabs, OpenAI, Unsplash, Vercel; PayPal/Wise retired | Outputs cached or trivially swappable; no runtime coupling. |

Net: lock-in is concentrated where it is unavoidable (app stores) and deliberately minimized everywhere else via cache-and-bundle and Postgres-portability choices.

## Decision Notes

- **Budget reconciliation — resolved:** use ~$194 as realistic first-year cash outlay; do not use lower legacy budget estimates for planning.
- **IAP vendor — resolved:** RevenueCat (`react-native-purchases`) is locked, replacing the deprecated `expo-in-app-purchases`; native wiring lands in Phase 3 (see [APP_STORE_DISTRIBUTION_STRATEGY.md](./APP_STORE_DISTRIBUTION_STRATEGY.md) and [../05-engineering-process/DEPLOYMENT_RELEASE_RUNBOOK.md](../05-engineering-process/DEPLOYMENT_RELEASE_RUNBOOK.md#9-revenuecat-payments-and-iap)). RevenueCat's free threshold is $2.5k MTR / monthly tracked revenue, not recurring-revenue-only semantics.

## Official Source Currentness

Checked on 2026-05-24:
- Supabase billing docs: <https://supabase.com/docs/guides/platform/billing-on-supabase>
- RevenueCat pricing: <https://www.revenuecat.com/pricing>
- Expo SDK reference: <https://docs.expo.dev/versions/latest/>

---

## Compliance Currentness Registry

External sources that are time-sensitive and must be re-verified before launch (and at each major platform/SDK update).

| External Source | Docs Depending On It | Last Verified | Next Verification Trigger | Pre-Launch Required? |
|----------------|---------------------|---------------|--------------------------|----------------------|
| Apple App Review Guidelines | `APP_STORE_DISTRIBUTION_STRATEGY.md`, `REVENUE_MODEL_PRICING.md` | 2026-05-24 | App Review rejection; every major iOS release | Yes — re-check before submission |
| Google Play Payments Policy | `APP_STORE_DISTRIBUTION_STRATEGY.md`, `REVENUE_MODEL_PRICING.md` | 2026-05-24 | Policy update email from Google; before Android submission | Yes |
| RevenueCat pricing ($2.5k MTR free tier) | `THIRD_PARTY_DEPENDENCY_AUDIT.md`, root `ROADMAP.md` | 2026-05-24 | Any RevenueCat pricing-page change | Yes — verify free-tier limit still applies at launch |
| Supabase free-tier quotas (auth MAU, DB size, egress, storage, Edge Functions) | `THIRD_PARTY_DEPENDENCY_AUDIT.md` | 2026-05-24 | Supabase billing announcement; Year 2 cost modelling | Yes — confirm headroom before Phase 3 |
| Expo SDK version (currently 52) | `ENVIRONMENT_SETUP.md`, `TECH_STACK_DECISIONS.md` | 2026-05-24 | SDK deprecation notice; next major Expo release | Yes — pin to latest stable before submission |
| ElevenLabs redistribution rights | `CONTENT_PIPELINE_ARCHITECTURE.md`, `THIRD_PARTY_DEPENDENCY_AUDIT.md` | not yet | Before generating any commercial audio | **Launch gate** — must be confirmed before TOEFL/paid audio ships |
| Unsplash API terms (offline redistribution) | `CONTENT_PIPELINE_ARCHITECTURE.md` | not yet | Before bundling any images in a paid build | **Launch gate** — must be confirmed before paid tiers ship |
| GDPR/UK GDPR regulatory guidance (age thresholds, consent requirements) | `GDPR_COPPA_COMPLIANCE.md`, `PRIVACY_POLICY_TERMS_OF_SERVICE.md` | 2026-05-24 | Any material ICO/DPC guidance update | Yes — review before EU launch |

## Open Questions

- `requires-external-validation` — **ElevenLabs license:** verify plan tier permits redistributing generated audio in a paid commercial app (launch gate for audio tiers).
- `unresolved` — **Word-list provenance:** document the exact source and license of each sourced corpus (P0 backlog #41 content sourcing — required before shipping Foundation/Advanced).
- `deferred` — **Supabase paid-tier trigger:** model paid plan into Year 2 cost base when free-tier limits are approached.
