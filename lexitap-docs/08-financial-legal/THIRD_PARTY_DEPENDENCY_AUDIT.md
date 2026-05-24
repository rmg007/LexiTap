---
title: Third-Party Dependency Audit
category: financial-legal
status: active
updated: 2026-05-24
priority: P1
tags: [dependencies, licenses, vendor-risk, lock-in, budget, expo, supabase, elevenlabs, openai, unsplash, paypal, content-licensing]
---

# Third-Party Dependency Audit

Every external service and key library LexiTap depends on, with its cost, license, lock-in risk, and failure exposure — mapped against the ~$144 Year 1 budget. The guiding constraint: keep everything on free tiers except the three unavoidable paid items (Apple, Google, audio). Pairs with [REVENUE_MODEL_PRICING.md](./REVENUE_MODEL_PRICING.md) and the tech stack in [../01-discovery-strategy/VISION_PROBLEM_STATEMENT.md](../01-discovery-strategy/VISION_PROBLEM_STATEMENT.md).

## Contents

- [Year 1 Budget Map](#year-1-budget-map)
- [Service Audit](#service-audit)
- [Key npm / Library Audit](#key-npm--library-audit)
- [Content and Word-List Licensing](#content-and-word-list-licensing)
- [Lock-In Summary](#lock-in-summary)
- [Open Questions](#open-questions)

## Year 1 Budget Map

| Item | Cost | Type | Notes |
|------|------|------|-------|
| Apple Developer Program | $99 | Annual | Required for App Store + TestFlight |
| Google Play Developer | $25 | One-time | Lifetime registration |
| ElevenLabs audio (TOEFL) | ~$50 | One-off / month-of | Premium TTS; generate, cache, cancel |
| Domain (lexitap.app) | ~$20 | Annual | Registrar varies; project docs cite ~$20/yr |
| **Subtotal** | **~$194** | | Exceeds the ~$144 target |
| Everything else | $0 | Free tier | Expo/EAS, Supabase, RevenueCat (free to ~$2.5k MRR), Unsplash, PayPal, OpenAI free credits, Vercel |

**Budget note / source inconsistency:** the strict line items above sum to ~$194, while the locked Year 1 budget is "~$144 total." The ~$144 figure holds only if (a) Google's $25 is treated as a one-time, not annual, cost and excluded from a recurring view, (b) ElevenLabs audio comes in at the low end and is a single non-recurring generation, and (c) the domain is the cheapest first-year promo. Treat ~$144 as the aspirational floor and ~$194 as the realistic first-year cash outlay. Either way, even the conservative Year 1 revenue ($3,600) covers it many times over. This gap is flagged as an Open Question, not silently reconciled.

## Service Audit

| Service | Role | Cost | License / Terms | Lock-in | Risk |
|---------|------|------|-----------------|---------|------|
| **Expo / EAS** | RN framework + cloud build/submit | Free tier | Expo OSS = MIT; EAS = commercial SaaS | Medium — RN code is portable, but EAS Build/Submit and OTA updates are Expo-specific | Low. Mature, widely used. Free build queue is slow but sufficient solo. |
| **Supabase** | Auth + Postgres + cloud sync + teacher/referral/promo backend | Free until ~50K users, then ~$25/mo | Apache-2.0 core (self-hostable); hosted = commercial | Medium-low — it's Postgres; data is exportable and Supabase is self-hostable | Low-medium. Single backend for sync + business logic = concentration risk, mitigated by Postgres portability. |
| **ElevenLabs** | Premium TTS for TOEFL (and later pronunciation tiers) | ~$50 one-off | Commercial; check audio-usage/redistribution rights in plan tier | Low — audio is generated, cached, and bundled; no runtime dependency | Medium. Confirm the license permits redistributing generated audio inside a paid app. Generate-and-cancel keeps cost one-off. |
| **OpenAI** | Content enrichment (definitions, synonyms, example sentences) at build time | Free credits / minimal | Commercial API; usage-based | None at runtime — build-time only, output is stored | Low cost; medium content risk (review AI output for accuracy before shipping). |
| **Unsplash** | Imagery for word cards (dual-coding) | Free | Unsplash License (free commercial use, no attribution required, cannot sell unmodified photos as-is) | Low — images cached/bundled | Low-medium. License permits app use; verify no per-image restrictions and avoid building a competing image service. |
| **PayPal** | Teacher commission payouts | Free to send; transaction fees on payout | Commercial ToS | Low — just a payout rail; swappable | Low. Cross-border payout fees and country availability are the real concern for global teachers. |
| **Apple App Store** | iOS distribution + IAP | $99/yr + 15% commission | Apple Developer Agreement | High — required channel for iOS; IAP mandatory for digital goods | Structural, unavoidable. See compliance doc. |
| **Google Play** | Android distribution + IAP | $25 once + 15% commission | Play Developer Distribution Agreement | High — required channel for Play | Structural, unavoidable. |
| **RevenueCat** | IAP + subscription entitlements, server-side receipt validation | Free up to ~$2.5k MRR | Commercial SaaS (SDK is MIT) | Medium — entitlement logic flows through its SDK, but it sits behind the `IapService` port so a swap is bounded | Low-medium. Wiring deferred to Phase 3; free tier covers the projection horizon. |
| **Vercel** | Static website + teacher portal hosting | Free tier | Commercial SaaS | Low — static HTML, trivially movable | Low. |

## Key npm / Library Audit

| Library | Role | License | Risk / Note |
|---------|------|---------|-------------|
| react-native / react | Core | MIT | Foundational; low risk. |
| expo (SDK 52) | Framework | MIT | See Expo lock-in above. |
| expo-sqlite | Bundled words.db + local progress | MIT | Core offline store; low risk. |
| react-native-purchases (RevenueCat) | IAP | MIT | Locked IAP vendor — chosen over `expo-iap` and the deprecated `expo-in-app-purchases`. Native SDK install deferred to Phase 3 (`StubIapService` bound until then). Adds a native config plugin; see RevenueCat service row. |
| expo-router | Navigation | MIT | Low risk. |
| @tanstack/react-query v5 | Server state / sync | MIT | Low risk. |
| zustand | Local state | MIT | Low risk. |
| @supabase/supabase-js | Backend client | MIT | Low risk. |
| commander.js (content tool) | CLI | MIT | Build-time only; low risk. |
| Jest + Testing Library | Tests | MIT | Dev-only. |

All core libraries are MIT/permissive — no copyleft (GPL) exposure in the runtime dependency tree. The previously-flagged library risk (`expo-in-app-purchases` being unmaintained) is retired: the deprecated package is not used, and RevenueCat (`react-native-purchases`) is the locked replacement.

## Content and Word-List Licensing

This is the highest legal-risk dependency category and the founder's primary IP exposure.

- **Frequency word lists** (top 3,000 / 9,000 most-used words): frequency rankings derived from corpora can carry licensing terms. The founder's existing corpora must be confirmed as public-domain or properly licensed before shipping Foundation/Advanced. The strategy risk register already flags "word list copyright issues" with mitigation "use public domain; legal review before TOEFL."
- **TOEFL / IELTS / GRE / GMAT word lists:** test names are trademarks (ETS owns TOEFL and GRE; GMAC owns GMAT; IELTS is jointly owned). LexiTap may describe tiers as "TOEFL vocabulary" (nominative fair use / preparation), but must **not** imply endorsement or affiliation, and must not reproduce official test content. Vocabulary itself (words + definitions LexiTap authors) is not protected; copied official materials are. Legal review required before the TOEFL tier ships.
- **Definitions / example sentences:** author original or AI-generate-then-review; do not copy a dictionary's proprietary definitions verbatim.
- **Audio:** ElevenLabs-generated; confirm redistribution rights (above).
- **Imagery:** Unsplash License covers app use.

## Lock-In Summary

| Severity | Dependencies | Why |
|----------|--------------|-----|
| High (structural) | Apple, Google | Required distribution channels; cannot ship mobile without them. |
| Medium | Expo/EAS, Supabase, RevenueCat | Portable underneath (RN code, Postgres data) or port-isolated (RevenueCat behind `IapService`), but tooling/workflow is vendor-shaped. |
| Low | ElevenLabs, OpenAI, Unsplash, Vercel, PayPal | Outputs cached or trivially swappable; no runtime coupling. |

Net: lock-in is concentrated where it is unavoidable (app stores) and deliberately minimized everywhere else via cache-and-bundle and Postgres-portability choices.

## Open Questions

- **Budget reconciliation:** confirm whether the ~$144 target excludes Google's one-time $25 and assumes the lowest ElevenLabs/domain costs; otherwise realistic first-year outlay is ~$194. Update the locked budget figure or document the accounting basis.
- **ElevenLabs license:** verify the plan tier permits redistributing generated audio inside a paid commercial app.
- **IAP vendor — resolved:** RevenueCat (`react-native-purchases`) is locked, replacing the deprecated `expo-in-app-purchases`; native wiring lands in Phase 3 (see [APP_STORE_DISTRIBUTION_STRATEGY.md](./APP_STORE_DISTRIBUTION_STRATEGY.md) and [../05-engineering-process/DEPLOYMENT_RELEASE_RUNBOOK.md](../05-engineering-process/DEPLOYMENT_RELEASE_RUNBOOK.md#9-revenuecat-payments-and-iap)). Confirm RevenueCat's free tier (up to ~$2.5k MRR) covers the projection horizon.
- **Word-list provenance:** document the exact source and license of each sourced corpus (P0 backlog #41 content sourcing).
- **Supabase paid-tier trigger:** $25/mo kicks in around 50K users — model it into the Year 2 cost base when it arrives.
