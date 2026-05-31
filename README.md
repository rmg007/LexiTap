# LexiTap

> **⚠️ Phase 1 in progress.** Content sourcing + device testing pending. Do not ship.

Offline-first ESL vocabulary mobile app for global non-native English learners (13+). Build spaced-repetition mastery with real Foundation words (3,000 target), adaptive diagnostics, and premium exam packs (TOEFL, IELTS, GRE, GMAT, Business English).

## Project

**Technology**
- **Mobile:** React Native (Expo), TypeScript, SQLite (expo-sqlite)
- **Backend/Auth:** Supabase (auth + encrypted blob backup + storage)
- **Content Tool:** Node.js, TypeScript → bundled read-only `words.db`
- **Database:** Two SQLite instances — bundled read-only `words.db` (content) + on-device read-write `user.db` (progress)
- **Payments:** RevenueCat (one-time exam packs, no subscriptions)

**Architecture:** See [AGENTS.md](AGENTS.md) for design rules, schema, and high-risk paths. [SYSTEM_ARCHITECTURE.md](lexitap-docs/04-technical-architecture/SYSTEM_ARCHITECTURE.md) covers the full stack.

## Phase 1 — Make the app real

**Current state (2026-05-31):** ~30% to launch. C0 (words.db delivery) proven on iOS simulator; physical device confirmation pending. Onboarding complete (O-1 thru O-5: goal, diagnostic, knowledge map all wired). Home shows real daily progress. Analytics + Sentry env-gated and verified. All core domain logic (SRS, scheduling, mastery, quiz session, schema) is shipped + tested (163 tests green).

**Remaining P1 work:** Prove C0 on physical devices (iOS + low-end Android) · complete Foundation content pipeline (C3–C8: sourcing → enrichment → QA → validate → export) · build infra (EAS init, Apple/Google enrollment, signing, CI) · analytics/Sentry event emissions verified in beta (A4–A5, B2).

**P1 Exit Gate:** App cold-launches on real iOS + Android, loads real Foundation words (3,000+), completes onboarding→quiz→progress, emits retention events to PostHog.

**Critical path (unchanged from RELEASE_PLAN.md §4):**
1. ◐ C0 prove on physical iOS + low-end Android (fresh EAS build in flight; current `0324f457` is stale)
2. ☐ Foundation content (3,000 words): sourcing → OpenAI enrichment → sampled QA → validate → export (the long pole)
3. ✅ Onboarding complete (goal/diagnostic/knowledge map done; no typing, no sync)
4. ☐ Build infra: EAS init, app.config.ts, Apple/Google enrollment (start day 1), signing, CI
5. ☐ Analytics (PostHog) + crash reporting (Sentry) event emissions verified in beta

**See [plans/RELEASE_PLAN.md §4](plans/RELEASE_PLAN.md#4-critical-path--long-poles) for full ordering + risk.**

**P1 does not include:** Auth (P3), premium exam packs (P3), RevenueCat (P3), device sync (deferred post-launch).

### Setup

No root `package.json` — each sub-project is independent:

```bash
# Install all sub-projects
npm install

# This installs:
# - mobile/package.json (Expo + React Native)
# - content-tool/package.json (Node + TS)
```

**Environment variables:**

```bash
# Copy the template and fill in your credentials
cp .env.example .env

# Required (app will fail without these):
# - EXPO_PUBLIC_SUPABASE_URL
# - EXPO_PUBLIC_SUPABASE_ANON_KEY
#
# Optional (noop if unset):
# - EXPO_PUBLIC_POSTHOG_API_KEY (analytics)
# - EXPO_PUBLIC_SENTRY_DSN (crash reporting)
# - EXPO_PUBLIC_REVENUCAT_API_KEY (payments — Phase 3)
# - ANTHROPIC_API_KEY (content-tool enrichment only)
#
# See .env.example for detailed documentation and where to get each key.
```

### Run

```bash
# Start Expo dev server (metro bundler)
cd mobile && npm run start

# Press 'i' for iOS simulator, 'a' for Android emulator, 'w' for web (limited)
```

### Test & Validate

```bash
# Type-check, lint, and run all tests (both projects)
cd mobile && npm run check       # 163 tests, 18 suites
cd content-tool && npm run check # 59 tests, 6 suites

# iOS cold-launch smoke test (simulator)
cd mobile && npm run smoke

# Device testing: TBD (physical iOS + low-end Android)
```

**Test gate:** All PRs must pass `npm run check`. Push to any branch; require status check on `master`.

### Build Content

```bash
# Build the content-tool binary (generates words.db)
cd content-tool && npm run build

# Import CSV → enrich via OpenAI → validate → export to bundled asset
cd content-tool && npm run import -- --source ./data/foundation.csv
cd content-tool && npm run enrich -- --provider openai --add-definitions
cd content-tool && npm run validate -- --strict
cd content-tool && npm run export -- --output ../mobile/assets/vocab/words.db
```

This pipeline is currently stubbed (no OpenAI adapter, no definitions). See RELEASE_PLAN.md §B (C3–C8).

## Build & Release

**In-repo config:** All build configuration lives in `/Users/ryan/Desktop/LexiTap/`, committed to git. No global `~/.claude/` config required. See [CLAUDE.md](CLAUDE.md).

| File | What |
|------|------|
| `.claude/settings.json` | Claude Code model, effort level, hooks, deny-list (high-risk paths) |
| `CLAUDE.md` | Project conventions, communication style, architecture rules |
| `AGENTS.md` | Code patterns, database schema, hard constraints for AI agents |
| `plans/RELEASE_PLAN.md` | Source of truth for phase plan, critical path, task-level execution |

**Build flow (not yet live):**

1. `eas init` + `app.config.ts` (env injection, `expo-updates` channels)
2. Apple + Google Developer enrollment (start immediately — 24-48h + 14d gate)
3. EAS signing profiles (`development`, `preview`, `production`)
4. CI: two GitHub jobs (`mobile-check`, `content-tool-check`), required status on `master`
5. Internal build → TestFlight + Play Internal (for device-verify of C0)
6. External beta (TestFlight + Play Closed) with PostHog + Sentry instrumentation
7. Store submission (iOS + Android) — gated on auth + SIWA + account deletion

See [RELEASE_PLAN.md §C](plans/RELEASE_PLAN.md#c-build-signing-release--cicd) for the full 18-task build sequence.

## Documentation

**Canonical sources** (in priority order):

- [plans/RELEASE_PLAN.md](plans/RELEASE_PLAN.md) — Phase 1–6 plan, critical path, 5 things that move the date, risk register, immediate actions
- [AGENTS.md](AGENTS.md) — Code patterns, schema, SRS algorithm, high-risk paths (database, IAP, crash/analytics, state persistence)
- [CLAUDE.md](CLAUDE.md) — Architecture decisions, tech stack, communication style, documentation rules, never-lose-work defense
- [lexitap-docs/](lexitap-docs/) — Full product specification: UX flows, content pipeline, revenue model, privacy/legal, analytics, crash reporting
- [memory/](memory/) — Session notes and lessons learned (e.g., words.db 43-vs-216 regression analysis, monetization rethink, PostHog policy)

**Key specs:**
- [Product definition + roadmap](lexitap-docs/02-product-definition/ROADMAP.md)
- [System architecture](lexitap-docs/04-technical-architecture/SYSTEM_ARCHITECTURE.md)
- [Revenue model & pricing](lexitap-docs/08-financial-legal/REVENUE_MODEL_PRICING.md)
- [Security & privacy](lexitap-docs/07-operations-compliance/)

## Contributing

**One session = one task.** When you start, read [RELEASE_PLAN.md](plans/RELEASE_PLAN.md) for the current phase + critical path. If GitHub Issues is empty, follow the plan's "Immediate next actions" or [ROADMAP.md](lexitap-docs/02-product-definition/ROADMAP.md).

**Workflow:**

1. Create a feature branch from `master`
2. Make changes; commit frequently
3. Run `npm run check` locally before pushing (both projects if touched)
4. Push and open a PR
5. Merge when CI (required status check) passes
6. **After merging, sync before `/clear` session** — unpushed commits are the #1 way work vanishes

**Never commit:**
- Secrets (`.env` lives in `.gitignore`)
- Configuration outside the repo (use `.claude/settings.json` instead of `~/.claude/`)
- Database schema changes without updating docs or confirming with the team

**When you're done with a task:**
- Verify docs are accurate (see [CLAUDE.md](CLAUDE.md) Documentation Rule)
- Update [RELEASE_PLAN.md](plans/RELEASE_PLAN.md) if phase/dependency changed
- Update [memory/](memory/) if you found a lesson (regression, tricky bug, clarified decision)
- Push commits + `/clear` session

## Recent Work (Latest Sessions)

- **2026-05-31:** C0 proven on iOS simulator (words.db bundled, Metro shim for dual-React, absolute-path ATTACH). O-2/O-4/O-5 onboarding complete. Monetization rethink: exam packs, no subscriptions. Sentry + PostHog env-gated + policies finalized.
- **2026-05-30:** Audit + fix cycle: words.db delivery, tiers.ts new exam-pack model, onboarding flow reconciliation, D1–D8 decisions resolved.
- **2026-05-28:** Content schema many-to-many + tier refactor; `tiers.ts` rebuilt; `word_tiers` junction added.

Full session index: [memory/](memory/).

## Quick Links

- **App Store:** Not live (Phase 1)
- **Website:** [lexitap.app](https://lexitap.app)
- **GitHub:** [Issues](https://github.com/rmg007/LexiTap/issues), [Discussions](https://github.com/rmg007/LexiTap/discussions)

---

**Last updated:** 2026-05-31  
**Phase:** 1 of 6 (make the app real)  
**Status:** ~30% to launch — C0 simulator-proven, onboarding complete, content pipeline building
