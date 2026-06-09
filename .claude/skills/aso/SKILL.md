---
name: aso
description: App Store Optimization for LexiTap — keyword research, store metadata (title/subtitle/keyword-field/description), screenshots/icon conversion, review management, and a pre-submission launch checklist. Use when preparing the App Store / Play listing, choosing keywords, writing or auditing store copy, planning screenshots, responding to reviews, or building the launch checklist. Tailored to LexiTap (ESL vocabulary, 13+, Education category, iOS-first). Vetted, no third-party scripts.
---

# ASO — App Store Optimization for LexiTap

Vetted, LexiTap-specific ASO. Authored in-repo — **no external scripts, no scraping, no API calls.** Where market data is needed (keyword volume, competitor ranks, live reviews), this skill tells you *what* to gather and *how to reason about it*, and uses `WebSearch`/`WebFetch` for public data — it never runs untrusted code.

## LexiTap context (bake this into every recommendation)

- **App:** offline-first ESL vocabulary trainer. Adaptive diagnostic → frontier-rank → spaced repetition (SRS), passive-recognition UX, CEFR-aligned + frequency-ranked words, exam packs.
- **Audience:** global **non-native English learners, 13+**. Not American-student vocab (that's a separate future product — never blend audiences).
- **Category:** Education (primary). Reference / secondary candidates evaluated in `references/keyword-strategy.md`.
- **Platform:** **iOS-first** (Android on hold — optimize Apple App Store now; Play later).
- **Monetization:** free frequency/CEFR content + audio; one-time **exam packs** ($9.99) + **All-Exams bundle** ($29.99). No subscription — a conversion-copy angle ("no subscription, pay once").
- **Differentiators to lead with:** works **offline**, **adaptive** placement (no rote level-picking), **spaced repetition**, **exam-targeted** packs (TOEFL/IELTS/etc.), **CEFR + frequency** ranking.
- **Existing repo assets to drive (don't duplicate):** `website/assets/STORE_COPY.md` (canonical store copy), `website/assets/SCREENSHOTS_SPEC.md` (screenshot plan), `website/assets/INDEX.md`. Version: `mobile/app.config.ts`.

## Workflow — pick the task

1. **Keyword research** → read `references/keyword-strategy.md`. Produce a ranked keyword set (high relevance × reachable difficulty), the competitor map, and the Apple 100-char keyword field (comma-separated, NO spaces).
2. **Metadata (title / subtitle / description / What's New)** → read `references/metadata-templates.md`. Fill the templates, respect every character limit in `references/platform-rules.md`, then write results into `website/assets/STORE_COPY.md`.
3. **Visual assets (icon / screenshots / preview)** → conversion guidance in `references/metadata-templates.md` (Visual section) + drive `website/assets/SCREENSHOTS_SPEC.md`. Icon files follow the asset system (`scripts/README.md`) — **final icon still needs Ryan's sign-off, ships as vector.**
4. **Review management** → read `references/review-management.md`. Monitor themes, draft responses, feed feature-requests back to the roadmap.
5. **Pre-submission launch** → run `references/launch-checklist.md` top to bottom before any store submit.

## Hard rules (ASO-specific)

- **Apple keyword field:** exactly the **100-char** comma-separated list, **no spaces after commas**, **no plurals when singular is present** (Apple stems), **no words already in the title/subtitle** (wasted — they're already indexed), **no competitor brand names** (rejection risk).
- **Title = the single highest-value keyword phrase**, not just "LexiTap". e.g. `LexiTap: Learn English Words` (≤30 chars). Brand + benefit + top keyword.
- **Never invent metrics.** If you don't have real keyword volume / competitor data, say so and gather it via `WebSearch` — don't fabricate scores. (The community ASO skills fabricate scores; we don't.)
- **Audience fidelity:** copy speaks to ESL learners (clear, simple English, B1-readable). Never American-K12 framing.
- **Localization is high-leverage** for a global ESL app — see `references/keyword-strategy.md` (localize the Apple keyword field per storefront even with English UI).
- Respect the repo: store copy lives in `website/assets/STORE_COPY.md`; this skill updates it, doesn't fork it.

## Output

Always produce concrete, paste-ready artifacts (the actual title string, the actual 100-char keyword field, the actual description) with a character count next to each field, not abstract advice.
