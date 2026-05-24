---
title: Localization and i18n Strategy
category: content-data
status: active
updated: 2026-05-24
priority: P2
tags: [localization, i18n, app-store, aso, english-only, esl, plain-english, future-proofing]
---

# Localization and i18n Strategy

How LexiTap handles language at launch and what it deliberately defers. The short version:
**the UI and store listing are English-only at launch; the *content* is engineered for non-native
speakers.** This doc records that decision, its rationale, and the cheap hooks we keep so we never
paint ourselves into a corner.

Related: [./SEED_DATA_SPEC.md](./SEED_DATA_SPEC.md) (plain-English content rules),
[../../notion-docs/PRODUCT_STRATEGY.md](../../notion-docs/PRODUCT_STRATEGY.md) (ESL-only audience).

## Decision: English-Only UI and Store Listing at Launch

- **App UI:** English only. Buttons, menus, onboarding, settings — all English.
- **App Store / Play listing:** English only. No localized titles, descriptions, screenshots, or
  keywords (no ASO localization).
- **Content (definitions, example sentences):** authored in plain, simplified English for ESL
  learners — see the quality bar in `SEED_DATA_SPEC.md`. This is the localization that matters.

This is not a contradiction: LexiTap teaches English *to* non-native speakers. The product surface
being in English is consistent with — even helpful to — the learning goal. What we are deferring is
*translating* the chrome and the marketing, not dumbing down the content.

## Rationale

1. **Audience can read functional English.** The target learner is an intermediate ESL student
   (CEFR ~A2–C1) studying for TOEFL/IELTS or professional English. A learner at this level navigates
   an English UI; full immersion is pedagogically defensible, not a barrier.
2. **ASO localization is cost-prohibitive for a solo founder.** Quality localized store listings
   require native translators per locale, localized screenshots, and per-market keyword research,
   then ongoing maintenance as the app evolves. That cost is not justified pre-revenue.
3. **Content is where the i18n budget goes.** The pedagogically critical "localization" is writing
   definitions one CEFR band below the target word and disambiguating example sentences — both
   handled in `SEED_DATA_SPEC.md`. That is funded; UI/ASO translation is not.
4. **Scope discipline.** Phase 0/1 is about shipping the core loop. Translating chrome adds surface
   area and QA cost without moving the launch-validation metrics (retention, WTP).

## What Is Deferred (Not Cancelled)

| Item                         | Status   | Revisit trigger |
|------------------------------|----------|-----------------|
| Localized UI strings         | Deferred | A specific locale shows traction + revenue to fund translation + QA |
| Localized App Store listing (ASO) | Deferred | Same as above; ASO is high-ROI *once* a target market is identified |
| Right-to-left (RTL) layout   | Deferred | Only if an RTL-language market is prioritized |
| Per-locale content variants  | Deferred | Out of scope; content is English by design |
| In-app L1 (native-language) translations of definitions | Deferred | Possible premium feature if data shows demand |

Deferred means "not at launch," not "never." The hooks below keep these cheap to add later.

## Future i18n Hooks (Avoid Painting Into a Corner)

These are low-cost design choices to make now so a later localization effort is additive, not a
rewrite:

1. **No hardcoded UI strings.** Even though only `en` ships, route all user-facing strings through a
   single string module / `t('key')` lookup with an `en` catalog. Adding a locale later = adding a
   catalog, not hunting strings across components. This is the single most important hook.
2. **Locale-aware formatting from day one.** Use `Intl` for dates/numbers and the device locale for
   formatting, even while text stays English. (The timezone/streak logic in `DATABASE_SCHEMA.md`
   already respects the user's IANA timezone — same spirit.)
3. **Content schema is L1-agnostic but extensible.** The `words` table stores English `definition`,
   `example_sentence`, etc. If native-language glosses are ever added, they go in a *new* additive
   column or sidecar table keyed by `word_id` + locale — never by mutating existing English content.
   The stable `word_id` hashing in the content pipeline makes such a join safe.
4. **`app_id` + tier parameterization already exists.** The app-agnostic content pipeline (see
   `CONTENT_PIPELINE_ARCHITECTURE.md`) means a future locale- or market-specific content set is a
   config addition, not an architecture change.
5. **Keep ASO metadata in a data file, not buried in store config.** Title/subtitle/keywords/
   description live in a versioned file so a localized variant is a parallel file per locale when the
   time comes.

## Non-Goals

- We do **not** translate vocabulary definitions into learners' native languages at launch (English
  immersion is intentional; an L1-gloss feature is a deferred maybe, not a commitment).
- We do **not** build a translation-management pipeline or contract translators now.
- We do **not** localize legal/marketing copy.

## Open Questions

- **First localization target (if any).** No locale is prioritized. If post-launch analytics show a
  dominant non-English-speaking market, that locale becomes the candidate for ASO-first localization
  (listing before UI, since ASO has higher acquisition ROI).
- **L1 definition glosses as a feature.** Whether offering native-language translations of
  definitions is a future free feature, a premium add-on, or never — undecided; the additive-column
  hook keeps the option open.
