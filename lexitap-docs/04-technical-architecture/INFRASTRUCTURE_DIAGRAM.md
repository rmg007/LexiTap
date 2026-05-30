---
title: Infrastructure Diagram
category: technical
status: active
updated: 2026-05-24
priority: P2
tags: [infrastructure, supabase, eas, content-cli, referral-portal, budget, diagram]
---

# Infrastructure Diagram

How LexiTap's components connect: the mobile app, the bundled content DB, Supabase (auth/Postgres/storage), EAS Build/Submit, the content CLI tool, and the teacher referral portal. Designed for a solo founder with a realistic ~$194 first-year cash outlay and no custom server.

## Table of Contents

- [System Diagram](#system-diagram)
- [Components](#components)
- [Build and Release Pipeline](#build-and-release-pipeline)
- [Content Pipeline (Track A)](#content-pipeline-track-a)
- [Runtime Data Flow](#runtime-data-flow)
- [Budget Constraints](#budget-constraints)
- [Open Questions](#open-questions)

---

## System Diagram

```
                          BUILD TIME (developer machine)
   ┌──────────────────────────────────────────────────────────────────┐
   │  Track A: content CLI (lexitap-content-tool)                       │
   │   CSV/JSON ─▶ import ─▶ validate ─▶ enrich ─▶ export ─▶ words.db    │
   │   (TTS/image enrichment optional; assets bundled, not fetched)     │
   └───────────────────────────────┬──────────────────────────────────┘
                                    │ words.db + assets/
                                    ▼
   ┌──────────────────────────────────────────────────────────────────┐
   │  Track B: mobile app repo (React Native / Expo)                    │
   │   src/{domain,application,infrastructure,presentation,config}      │
   │   assets/words.db (bundled, read-only)                             │
   └───────────────────────────────┬──────────────────────────────────┘
                                    │ git push → EAS
                                    ▼
   ┌──────────────────────────────────────────────────────────────────┐
   │  EAS Build (cloud) ─▶ signed iOS/Android binaries                  │
   │  EAS Submit       ─▶ App Store Connect / Google Play               │
   │  secrets: EAS secrets (prod) / .env (dev)                          │
   └───────────────────────────────┬──────────────────────────────────┘
                                    │ install
                                    ▼
   RUNTIME (user device)            
   ┌───────────────────────────────┴──────────────────────────────────┐
   │  LexiTap app                                                       │
   │   ┌──────────────┐   ATTACH   ┌──────────────┐                     │
   │   │ words.db (RO)│◀──────────▶│ user.db (RW) │  ◀── source of truth│
   │   └──────────────┘            └──────┬───────┘                     │
   │            quiz/review = 100% local, offline-first                 │
   └───────────────────────────────┬──────────────────────────────────┘
        on open: pull │             │ on close: push   (best-effort)
                      ▼             ▼
   ┌──────────────────────────────────────────────────────────────────┐
   │  SUPABASE (managed — no custom server)                             │
   │   Auth (email + Google) │ Postgres (content_errors, user_db_backups) │
   │   RLS policies          │ Edge Functions (receipt validation Phase 3) │
   │   Storage (optional, post-launch assets)                           │
   └───────────────────────────────┬──────────────────────────────────┘

                                    ▼
   ┌──────────────────────────────────────────────────────────────────┐
   │  Teacher Advocate Portal (web)  → Supabase Postgres                │
   │   referral codes, reward credits, Premium-seat grants              │
   └──────────────────────────────────────────────────────────────────┘
```

## Components

| Component | Hosting | Role | Cost |
|-----------|---------|------|------|
| Mobile app | user device | Offline-first ESL app; SQLite source of truth | included in dev cost |
| `words.db` | bundled in binary | Read-only content (tiers, words, assets) | $0 runtime |
| `user.db` | user device | Read-write progress, SRS state, logs | $0 |
| Supabase | managed cloud | Auth, content_errors, user_db_backups (Phase 3), Edge Functions | free tier (target) |
| EAS Build/Submit | Expo cloud | Build + submit signed binaries | free/low tier |
| Content CLI (Track A) | dev machine | Generate/validate/enrich/export `words.db` | one-time enrichment $ |
| Teacher advocate portal | web (Supabase-backed) | Referral codes, non-cash reward credits, Premium-seat grants | minimal/free |

Detail references: content CLI in [../06-content-data/CONTENT_PIPELINE_ARCHITECTURE.md](../06-content-data/CONTENT_PIPELINE_ARCHITECTURE.md); referral portal in [../01-discovery-strategy/GO_TO_MARKET_STRATEGY.md](../01-discovery-strategy/GO_TO_MARKET_STRATEGY.md); API surface in [API_CONTRACT.md](./API_CONTRACT.md).

## Build and Release Pipeline

```
code change ─▶ npm run check (tsc + eslint + prettier + jest)
           ─▶ git commit (feat/fix/... conventional)
           ─▶ eas build --platform all   (reads EAS secrets)
           ─▶ eas submit                  (App Store Connect / Play)
```

Secrets never live in the repo or binary: `.env` for local dev, EAS secrets for production builds (see [SECURITY_MODEL.md](./SECURITY_MODEL.md)).

## Content Pipeline (Track A)

Runs entirely on the developer machine; produces the bundled `words.db` that ships to Track B. No runtime content fetching — keeps the app offline-first and keeps cloud cost at zero for content delivery.

```
data/input/*.csv|json ─▶ import ─▶ working SQLite
                      ─▶ validate (blocks bad data: missing blank, orphan assets)
                      ─▶ enrich  (synonyms via OpenAI; audio via TTS for TOEFL)
                      ─▶ export  ─▶ data/output/words.db + assets/
                      ─▶ copy to Track B: assets/words.db, assets/vocab/
```

## Runtime Data Flow

1. Launch: open `words.db` (RO) + `user.db` (RW), run forward-only migrations, `ATTACH`.
2. Learn/review: all local; writes go to `quiz_attempts` (append), `user_progress` (update), `event_log` (append) in one transaction.
3. App open: pull cloud mirrors (best-effort, non-blocking).
4. App close: push changed rows (idempotent upsert).
5. Purchase (Phase 3): RevenueCat validates receipt server-side; app caches entitlement in memory.

## Budget Constraints

Realistic Year-1 cash outlay is roughly ~$194. Dominant line items are Apple Developer Program ($99/yr), Google Play one-time registration ($25), domain (~$20/yr), and build-time premium audio generation (up to ~$50). The architecture is intentionally constrained by that ceiling:

- **No custom server** — Supabase free tier (managed Postgres/Auth/Edge Functions) absorbs cloud needs at the ~1,000-user target.
- **Cloud sync is dumb and sparse** — push on close / pull on open only; no realtime subscriptions, no background workers, no analytics pipeline (would add cost and operational load).
- **Content enrichment is one-time, offline** — TTS (~$10-50) and synonym generation are batch costs paid once at build, not recurring runtime spend.
- **EAS on free/low tier** — batch builds; avoid burning build minutes.
- **Storage minimal** — assets bundled in the binary, not served from Supabase Storage at launch.

If usage exceeds the Supabase free tier, the first paid step (Supabase Pro) is the planned escalation; nothing in the architecture requires a server before then.

## Open Questions

- `deferred` — Teacher referral portal design (Phase 3+) — leaning static site + Supabase JS client with RLS.
- `unresolved` — Whether to use Supabase Storage for post-launch audio drops vs continuing to bundle — bundling preferred while binary size allows.
