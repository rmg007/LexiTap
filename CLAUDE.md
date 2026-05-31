# LexiTap — CLAUDE.md

**COMMUNICATION MODE: Caveman (default).** Terse, fragments, no articles/filler/hedging. Full technical accuracy + code. Arrow notation (X → Y) for causality. ~75% token reduction. Toggle to "normal mode" if needed.

---

**LexiTap** is an offline-first ESL vocabulary mobile app for global non-native English learners (13+). See [AGENTS.md](AGENTS.md) for architecture and hard rules.

| Directory | Purpose |
|-----------|---------|
| `mobile/` | Expo + React Native app (source of truth: local SQLite) |
| `content-tool/` | Node + TS CLI that builds bundled read-only `words.db` |
| `lexitap-docs/` | Full product + research documentation (8 categories) |
| `memory/`, `docs/`, `plans/` | Project memory, ADRs, implementation plans |

---

## Root Commands

```bash
npm run check              # lint + typecheck + test (all projects)
npm run dev                # Start dev server for mobile
npm run build              # Build mobile app
```

Each sub-project has its own npm scripts. See `mobile/CLAUDE.md` and `content-tool/CLAUDE.md` for details.

---

## Configuration Philosophy

- **All config lives in the repo.** `.claude/settings.json`, any `.mcp.json` — everything travels with the codebase so switching laptops requires only `git clone` + `npm install`.
- **Avoid user/global config (`~/.claude/`).** Only use global config for truly machine-specific secrets (e.g. personal API key that must never be committed). Prefer project-level equivalents for everything else.

## New Machine Setup

`git clone` + `npm install` is all you need. All Claude Code config is in the repo:

| File | What it provides |
|------|-----------------|
| `.claude/settings.json` | Model, effort level, hooks, deny-list permissions |
| `.claude/commands/` | Any project slash commands (if created) |

---

## Agent Workflow

These rules govern how Claude Code should operate on this project. Read before starting any session.

- **One session = one task.** `/clear` after every completed task. Never accumulate multi-feature context in a single session — context bloat causes hallucinations and references to stale code.
- **Repo is memory, not chat.** Every decision made in a session must be committed to the relevant file before `/clear`. If it isn't in the repo, it doesn't exist.
- **Project memory lives in the committed `memory/` dir — never in home-folder auto-memory.** Lightweight session-handoff notes go in `memory/` (auto-loaded via the `@memory/MEMORY.md` import at the bottom of this file). Do **not** write project knowledge to `~/.claude/projects/.../memory/`: that path is outside the repo, never reaches GitHub, and never reaches the next laptop — same reason config belongs in the repo.
- **Feed raw data, not summaries.** When debugging, paste stack traces and error logs directly — do not paraphrase the problem. Summaries lose signal.
- **Read `plans/` docs first** when starting release-planning or feature sessions. Read relevant troubleshooting docs first when touching a known fragile area.
- **GitHub Issues is the work queue.** Start a session by reading open issues, not by asking Ryan what to do.

---

## High-Risk Paths (Confirmation Required)

These files can still be edited, but Claude Code **pauses and asks for explicit confirmation** before modifying them. The denial list is in `.claude/settings.json`.

| Path | Why | Consequence |
|------|-----|------------|
| `mobile/src/infrastructure/db/` | Raw SQL, database schema | Wrong changes break data integrity or app startup |
| `mobile/src/domain/srs/` | SRS scheduling logic | Wrong changes break spaced repetition algorithm or learner progress |
| `mobile/src/application/paywall/` | Entitlement/paywall logic | Wrong changes lock users out of premium or leak trial state |
| `mobile/src/utils/storage.ts` | Encryption, state persistence | Wrong changes expose sensitive data or lose user progress |
| `mobile/app.config.ts` | EAS config, permissions, secrets | Wrong changes break EAS builds or expose secrets |
| `.env*` files | Secrets | Never commit; never log |

---

## Documentation Rule (read before every commit)

Every change to this repo must leave the relevant documentation accurate. This is not optional — stale docs are the primary cause of agent hallucination and repeated bugs.

**Update the right doc when what it describes has changed:**

| What you changed | What to update |
|---|---|
| Architecture decision, new pattern, "never do X" rule | CLAUDE.md or AGENTS.md |
| Bug that was hard to fix or revealed a fragile area | `plans/LESSONS_LEARNED.md` (if it exists) or add a memory note |
| Completed a roadmap/feature item | `plans/ROADMAP.md` or issue milestone |
| New high-risk path or forbidden edit | High-Risk Paths section above + `.claude/settings.json` deny list |
| Database schema or query pattern changed | `mobile/CLAUDE.md` |
| Payment/entitlement behavior changed | AGENTS.md + paywall application code comments |
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
| Commits made locally but never pushed | The **`Stop` hook** in `.claude/settings.json` warns when `HEAD` is ahead of its upstream |

**Hard rules:**
- **Never close a PR without confirming its work is either merged into `main` or intentionally discarded.** If in doubt, recover it: `git checkout <pr-head-sha> -- <path>`.
- **Never end a session with unpushed commits.** Push before `/clear`. Unpushed commits are the #1 way work vanishes.
- **Never commit locally for long stretches without pushing.** Sync early, sync often.

---

## Forbidden Patterns (never add these)

| Pattern | Reason |
|---|---|
| Analytics SDKs (Mixpanel, Amplitude, PostHog, etc.) in production | Privacy commitment — offline-first, no tracking. (Dev/test only with env gating.) |
| Any external crash SDK in production | Privacy: on-device reporter only. Dev tools (Sentry, etc.) are OK if gated by env var. |
| `console.log` persistent writes in production | Logger must no-op in production |
| Hardcoded secrets or `.env` committed to git | Use EAS secrets for production; local `.env` only (in `.gitignore`) |

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

- **JS/TypeScript-only fixes, UI changes, logic:** Ship via EAS Update immediately (same day).
- **Native changes, new permissions, build config, version bumps:** Store release required (5–6 weeks lead time for app store review).
- **Versioning:** Patch-only (`0.0.1`, `0.0.2`, …) — match app.config.ts.

---

*Last updated: 2026-05-31 — Integrated AsterKit rules and patterns*

---

## Project Memory (auto-loaded)

@memory/MEMORY.md
