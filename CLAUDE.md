# LexiTap — CLAUDE.md

**COMMUNICATION MODE: Caveman (default).** Terse, fragments, no articles/filler/hedging. Full technical accuracy + code. Arrow notation (X → Y) for causality. ~75% token reduction. Toggle to "normal mode" if needed.

---

**LexiTap** is an offline-first ESL vocabulary mobile app for global non-native English learners (13+). See [AGENTS.md](AGENTS.md) for architecture and hard rules.

| Directory | Purpose |
|-----------|---------|
| `mobile/` | Expo + React Native app (source of truth: local SQLite) |
| `content-tool/` | Node + TS CLI that builds bundled read-only `words.db` |
| `lexitap-docs/` | Full product + research documentation (8 categories) |
| `website/` | Static marketing + legal site for lexitap.app (Cloudflare Pages; plain HTML/CSS, theme mirrors app) |
| `memory/`, `plans/` | Project memory, ADRs, implementation plans |

---

## Root Commands

```bash
# No root package.json — run scripts inside each sub-project:
cd mobile       && npm run check   # lint + typecheck + test (mobile)
cd content-tool && npm run check   # lint + typecheck + test (content-tool)
cd mobile       && npm run start   # Expo dev server
```

Each sub-project has its own `package.json` + scripts. "Done" = `npm run check` passes in the affected project (see [AGENTS.md](AGENTS.md)).

---

## Asset Operations (designs, CSS, images, icons)

**Any agent creating/updating/deleting a visual asset → read [`scripts/README.md`](scripts/README.md) first.** It is the canonical map: which tool, which canonical home, CRUD workflow, guardrails.

| Asset | Tool | Home |
|---|---|---|
| **CSS** | edit files | `website/public/styles.css` (web); app = RN/nativewind, no CSS |
| **Designs / UI** (vector) | **Figma MCP** (load `/figma-use` first) | Figma + `.design-specs/html/screens/` |
| **Images** (raster) | `node scripts/generate-image.js "<prompt>" --out <path>` (OpenAI `gpt-image-1`) | `website/public/`, `mobile/assets/vocab/`, `scripts/out/` (scratch) |
| **Icons** (deterministic) | `node scripts/generate-icon.js` (SVG→PNG) | `website/assets/` (web), `mobile/assets/` (app) |

**Hard rules:** edit *sources* (SVG/tokens/Figma), regenerate derivatives — never hand-edit a generated PNG. `OPENAI_API_KEY` is a build-tooling secret (root `.env`, gitignored, never bundled). **Generate freely for og-images / marketing / content illustration; the final store icon + primary logo get Ryan's explicit sign-off and ship as vectors, never AI PNGs.** Don't AI-gen what should be a vector (icons, UI mockups → Figma).

---

## Configuration Philosophy

- **All config lives in the repo.** `.claude/settings.json`, any `.mcp.json` — everything travels with the codebase so switching laptops requires only `git clone` + `npm install`.
- **Avoid user/global config (`~/.claude/`).** Only use global config for truly machine-specific secrets (e.g. personal API key that must never be committed). Prefer project-level equivalents for everything else.

## New Machine Setup

`git clone` + `npm install` is all you need. All Claude Code config is in the repo:

| File | What it provides |
|------|-----------------|
| `.claude/settings.json` | Model, effort level, hooks, statusLine, `autoMemoryEnabled:false` (home-folder auto-memory off — repo `memory/` is the only memory), deny-list permissions |
| `.claude/commands/` | Project slash commands (`/snip`, `/gen-image`) |
| `.claude/skills/` | Project skills (`aso` — App Store Optimization for LexiTap) |
| `.claude/hooks/` | `guardrails.mjs` (PreToolUse enforcement) + `session-context.sh` (SessionStart — injects open GitHub issues + git ahead/behind into context) |
| `.claude/statusline.sh` | Status line: live model · branch · ↑unpushed/↓behind · PR# · context% (makes the never-lose-work state always visible) |
| `.mcp.json` | Project MCP servers — **Supabase** (read-only; needs `SUPABASE_ACCESS_TOKEN` in env, see `.env.example`). Figma MCP is connected at the app level. |
| `package.json` (root) | Asset tooling deps (`sharp`, `svgo`) + `npm run gen:image` / `gen:icon` / `optimize`. |

---

## Agent Workflow

These rules govern how Claude Code should operate on this project. Read before starting any session.

- **One session = one task.** `/clear` after every completed task. Never accumulate multi-feature context in a single session — context bloat causes hallucinations and references to stale code.
- **Repo is memory, not chat.** Every decision made in a session must be committed to the relevant file before `/clear`. If it isn't in the repo, it doesn't exist.
- **Project memory lives in the committed `memory/` dir — never in home-folder auto-memory.** Lightweight session-handoff notes go in `memory/` (auto-loaded via the `@memory/MEMORY.md` import at the bottom of this file). Do **not** write project knowledge to `~/.claude/projects/.../memory/`: that path is outside the repo, never reaches GitHub, and never reaches the next laptop — same reason config belongs in the repo.
- **Feed raw data, not summaries.** When debugging, paste stack traces and error logs directly — do not paraphrase the problem. Summaries lose signal.
- **Read `plans/` docs first** when starting release-planning or feature sessions. Read relevant troubleshooting docs first when touching a known fragile area.
- **GitHub Issues is the work queue.** Start a session by reading open issues, not by asking Ryan what to do. If Issues is empty, the active plan is `ROADMAP.md` (root) → canonical `lexitap-docs/02-product-definition/ROADMAP.md`. *(Open issues + git sync state are auto-injected at session start by `.claude/hooks/session-context.sh` — you'll see them without asking.)*

---

## High-Risk Paths (Confirmation Required)

These files can still be edited, but Claude Code **pauses and asks for explicit confirmation** before modifying them. The denial list is in `.claude/settings.json`.

| Path | Why | Consequence |
|------|-----|------------|
| `mobile/src/infrastructure/db/` | Raw SQL, database schema | Wrong changes break data integrity or app startup |
| `mobile/src/domain/srs/` | SRS scheduling logic | Wrong changes break spaced repetition algorithm or learner progress |
| `mobile/src/infrastructure/iap/` | IAP/entitlement adapter (StubIapService) | Wrong changes lock users out of premium or leak trial state |
| `mobile/src/infrastructure/storage/` | State persistence (AsyncStorage adapter) | Wrong changes lose user progress |
| `mobile/src/infrastructure/crash/` | Sentry PII scrub (`beforeSend`/`beforeBreadcrumb`) | Wrong changes leak user PII (email/tokens/URLs/device name) off-device |
| `mobile/src/infrastructure/analytics/` | PostHog adapter, `anon_id`, env-gate (PII boundary; prod-allowed) | Wrong changes leak identity/PII off-device (email/Supabase-id misuse, autocapture-on, ungated send, non-EU host) |
| `mobile/app.json` | Expo/EAS config, permissions, secrets | Wrong changes break builds or expose secrets. **Note:** active config is `app.config.ts`, which is intentionally NOT confirmation-gated (frequent EAS/plugin edits) — review its diffs carefully since it carries no guardrail. |
| `.env*` files | Secrets | Never commit; never log |

### Enforced at the tool boundary (PreToolUse hook)

Beyond the confirmation gates above, `.claude/hooks/guardrails.mjs` (registered as a `PreToolUse` hook) **hard-blocks** these — the agent cannot proceed, even with confirmation. They encode AGENTS.md hard rules + hard-won session lessons so they're enforced, not just documented:

| Blocked action | Rule it enforces |
|---|---|
| `git add` of a `.env` file | Secrets never committed |
| `git add -A` / `git add .` / `git commit -a` | No broad-add (entangles concurrent sessions, risks staging secrets) — repeated memory lesson |
| `TextInput` written into `QuizScreen.tsx` / `quiz/` / `components/assessments/` | Passive-recognition UX only |
| `${...}` interpolation in SQL under `infrastructure/db/` | Parameterized SQL only |

Hook fails **open** (any internal error → allow), so a hook bug never blocks real work. To add/relax a rule, edit `guardrails.mjs` (and re-run its self-test pattern).

---

## Documentation Rule (read before every commit)

Every change to this repo must leave the relevant documentation accurate. This is not optional — stale docs are the primary cause of agent hallucination and repeated bugs.

**Update the right doc when what it describes has changed:**

| What you changed | What to update |
|---|---|
| Architecture decision, new pattern, "never do X" rule | CLAUDE.md or AGENTS.md |
| Bug that was hard to fix or revealed a fragile area | add a note in `memory/` |
| Completed a roadmap/feature item | `ROADMAP.md` (root) + `lexitap-docs/02-product-definition/ROADMAP.md` |
| New high-risk path or forbidden edit | High-Risk Paths section above + `.claude/settings.json` deny list |
| Database schema or query pattern changed | AGENTS.md + `mobile/src/infrastructure/db/` comments |
| Payment/entitlement behavior changed | AGENTS.md + `mobile/src/infrastructure/iap/` comments |
| New slash command created | Add it to `.claude/commands/` + reference in `plans/` |

**Do NOT update docs when:**
- A routine bug fix changed nothing architectural
- A style or polish change affected no rules or decisions
- The relevant doc already accurately describes the current state

**The test:** After finishing your change, ask: "If a new agent read only the repo files — no chat history — would it have the correct understanding to work in this area?" If no, update the doc. If yes, move on.

---

## Never Lose Work

These rules + automations exist so work doesn't vanish between sessions. **All three failure modes must stay defended:**

| Failure mode | Defense (do not remove) |
|---|---|
| Merged branches pile up and look like lost work | GitHub **auto-delete head branch on merge** should be enabled at the repo level |
| A PR is closed without merging, discarding real work | Weekly audit or manual check before closing any PR |
| Commits made locally but never pushed | The **`Stop` hook** warns when `HEAD` is ahead of upstream; the **`SessionStart` hook** (`session-context.sh`) re-warns at the next session start; the **status line** shows `↑N` unpushed at all times |

**Hard rules:**
- **Never close a PR without confirming its work is either merged into `main` or intentionally discarded.** If in doubt, recover it: `git checkout <pr-head-sha> -- <path>`.
- **Never end a session with unpushed commits.** Push before `/clear`. Unpushed commits are the #1 way work vanishes.
- **Never commit locally for long stretches without pushing.** Sync early, sync often.

---

## Forbidden Patterns (never add these)

| Pattern | Reason |
|---|---|
| Analytics SDK (PostHog, etc.) sending **PII/identity**, autocapture-on, or used for anything **beyond app improvement**, in production | Product analytics IS allowed in prod — but ONLY via `infrastructure/analytics/` with: env-gated key (`EXPO_PUBLIC_POSTHOG_API_KEY`, **Noop if unset**), **`anon_id` pseudonymity only** (never email/Supabase id), **no PII** in payloads, **autocapture off** (explicit events only), **EU host**, in-Settings **opt-out**, and privacy-policy sub-processor disclosure. **Purpose-limited to app improvement** (retention/conversion/funnel health) — never advertising, ad-SDK coupling, cross-app tracking, IDFA/AAID, or selling data. Any analytics SDK that sends identity/PII, autocaptures, tracks for ads, or serves a non-improvement purpose is forbidden. |
| Crash SDK (Sentry) **unscrubbed**, or sending identity, in production | Crash reporting IS allowed in prod — but ONLY via `infrastructure/crash/` with: env-gated DSN (inert if unset), `beforeSend`/`beforeBreadcrumb` PII scrub (strip user id/email/ip/server-name/tokens/URLs; drop network + `sync` breadcrumbs), no tracing/replay/screenshots, privacy-policy disclosure. Any crash SDK that skips the scrub or sends identity is forbidden. |
| `console.log` persistent writes in production | Logger must no-op in production |
| Hardcoded secrets or `.env` committed to git | Local dev: `.env` (in .gitignore). Production builds: configure EAS secrets in eas.json. Never commit any secrets. |

---

## Tech Stack & Dependencies

| Layer | Tech |
|-------|------|
| **Mobile** | React Native, Expo (managed), TypeScript, SQLite (expo-sqlite) |
| **Backend/Auth** | Supabase (auth + storage + encrypted blob backups) |
| **Content Tool** | Node.js, TypeScript |
| **Database** | SQLite (two databases: bundled read-only `words.db` + on-device read-write `user.db`) |
| **Payments** | TBD (IAP via Supabase, RevenueCat, or stub) — see AGENTS.md |

---

## Storage Model

| Store | Data | Persistence | Used by |
|-------|------|---|---|
| **user.db (SQLite, device)** | Quiz attempts, SRS state, streaks, preferences | On-device + encrypted backup to Supabase Storage | Mobile app |
| **words.db (bundled, read-only)** | Dictionary, vocabulary, images, audio | Bundled in app binary | Mobile app |
| **Supabase Auth** | User ID, email, session token | Cloud + device | Mobile app |
| **Supabase Storage** | Encrypted `user.db` backups | Cloud | Recovery/device switch |

**Backup policy:** User data (user.db) is encrypted and backed up to Supabase Storage; never synced live.

---

## Release Process

**Pre-release (before first app store launch):**
- All changes → store review (5–6 weeks lead time).

**Post-release (after first store launch):**
- **JS/TypeScript-only fixes, UI changes, logic:** Ship via EAS Update immediately (same day).
- **Native changes, new permissions, build config, version bumps:** Store release required (5–6 weeks lead time for app store review).

**Versioning:** match `mobile/app.config.ts` `version` (currently `0.1.0`).

---

*Last updated: 2026-06-09 — Claude Code infra hardening: fixed dead CI (`ci.yml` `master`→`main` after the branch rename — had run 0 times since), pruned 4.5 GB stale agent worktrees, added SessionStart context hook (`session-context.sh` — injects open issues + git sync state) + status line (`statusline.sh`) + `autoMemoryEnabled:false` (home-folder memory off, matches the committed-`memory/`-only policy). New Machine Setup table + Never-Lose-Work + work-queue rows updated. Prior: 2026-05-31 — `app.config.ts` removed from High-Risk confirmation table (Ryan's call: frequent EAS/Sentry/plugin edits; it was never actually in the settings.json deny list, so the table overstated the guardrail — doc now matches enforcement). B3 Sentry source-map plugin wired here. Prior: Analytics policy reconciled: PostHog **allowed in production**, env-gated + `anon_id`-only + no-PII + autocapture-off + EU-host + opt-out + disclosed, **purpose-limited to app improvement** (Forbidden-Patterns analytics row rewritten from flat ban → conditional allow; `infrastructure/analytics/` added to high-risk paths). Prior: Sentry crash reporting (B1 + PII scrub) shipped; crash rule rewritten (scrubbed, env-gated, prod-allowed); `infrastructure/crash/` high-risk; app.json refs → app.config.ts*

---

## Project Memory (auto-loaded)

@memory/MEMORY.md
