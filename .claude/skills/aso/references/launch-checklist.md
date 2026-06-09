# Pre-Submission Launch Checklist — LexiTap (Apple, iOS-first)

Run top-to-bottom before any App Store submission. Check against the live repo, not memory. Don't fabricate completion — if unknown, mark `?` and find out.

## Metadata (all from keyword research, every field within limits)
- [ ] **Title** ≤30, brand + #1 keyword phrase, char count recorded
- [ ] **Subtitle** ≤30, second phrase, no title repeats
- [ ] **Keyword field** ≤100, comma-separated, **no spaces**, no plurals/dupes/brands, no title-subtitle repeats
- [ ] **Promotional text** ≤170 (launch hook; remember it's editable post-release)
- [ ] **Description** ≤4000, hook in first 2–3 lines, B1-readable, no American-K12 framing
- [ ] **What's New** written (even v1 — "Welcome to LexiTap" hook)
- [ ] **IAP display names** keyword-rich (e.g. "TOEFL Vocabulary Pack") — they're indexed
- [ ] All copy written into `website/assets/STORE_COPY.md`

## Visual assets
- [ ] **App icon** final, legible at small size, Ryan-approved, shipped as vector (see `scripts/README.md`) — NOT an AI PNG
- [ ] **Screenshots** for required device sizes, first 2 carry hook + mechanism, each captioned (drive from `SCREENSHOTS_SPEC.md`)
- [ ] Screenshots optimized (`npm run optimize -- <dir>`)
- [ ] (Optional) App preview video, loop shown in first 5s

## Listing config
- [ ] **Primary category** = Education; secondary chosen deliberately
- [ ] **Age rating** questionnaire completed (ESL vocab ≈ 4+; confirm against actual content)
- [ ] **Localization:** at minimum localize keyword field + subtitle for top ESL storefronts (es, pt-BR, ja, ko, zh-Hans, ar, tr, vi, id, fr) — highest-ROI lever
- [ ] Support URL + marketing URL = lexitap.app; **Privacy Policy URL** live (it is — Cloudflare Pages)
- [ ] **App Privacy "nutrition label"** matches reality: data collected = email (auth), anon analytics (PostHog, opt-out), crash (Sentry, scrubbed); **no tracking/IDFA**, no data sold — must mirror the privacy policy + the forbidden-patterns rules in CLAUDE.md

## Build & compliance (cross-check AGENTS.md / release rules)
- [ ] Version in `mobile/app.config.ts` correct
- [ ] Secrets via EAS, none committed (the guardrail hook enforces this)
- [ ] Analytics env-gated (Noop if unset), `anon_id`-only, EU host, opt-out present
- [ ] Crash (Sentry) env-gated + PII-scrubbed
- [ ] `delete-account` flow works (Edge Function deployed) — required for App Store account-deletion policy
- [ ] Offline path proven on a real device (core promise is "works offline")
- [ ] `cd mobile && npm run check` green

## Post-submit
- [ ] Review-response plan ready (`review-management.md`)
- [ ] In-app rating prompt gated behind a positive moment, respects 3/365 limit
- [ ] Plan first `What's New` / promotional-text refresh (no app update needed for those two fields)
