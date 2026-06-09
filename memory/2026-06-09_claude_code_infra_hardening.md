# Claude Code Infra Hardening — 2026-06-09

Audited the actual Claude Code setup (not generic advice) and fixed real defects + automated stated-but-manual workflow rules. All repo-committed (travels to next laptop).

## 🔴 Bugs found + fixed

- **CI was DEAD since the `master → main` rename.** `.github/workflows/ci.yml` triggered only on `branches: [master]`; default branch is `main`. → **CI ran on ZERO pushes/PRs since the rename** — the automated backstop for "false green handoff" claims (a repeated memory lesson) was silently absent. **Fixed:** both `push` + `pull_request` triggers → `[main]`. `deploy.yml` is tag-based (`v*`), unaffected.
- **4.5 GB of stale agent worktrees** in `.claude/worktrees/` (7 × ~774 MB, all `locked`). Verified every tip was already merged into `main` (`in-main=1`) → zero unique work. Locking pids (83555, 77077) were DEAD (crashed sessions) → stale locks. **Pruned** via `git worktree remove -f -f` + `git worktree prune` + deleted dangling `worktree-agent-*` branches. Dir is gitignored (never hit GitHub) but ate disk on a frequently-switched laptop. **4.5 GB reclaimed.**

## 🟠 Workflow rules automated (were manual / honor-system)

- **SessionStart context injector** — `.claude/hooks/session-context.sh`. Injects open GitHub issues (the work queue) + git ahead/behind + dirty-tree count into the model's context at session start. Automates CLAUDE.md's "start by reading open issues" + "never end unpushed" rules. **Key gotcha (verified against docs):** plain stdout is NOT fed to the model on SessionStart — context MUST be returned as JSON `{hookSpecificOutput:{hookEventName:"SessionStart",additionalContext:"…"}}`. The old hook just `echo`'d "git repo ready" (visible to user, invisible to model) → replaced.
- **Status line** — `.claude/statusline.sh` + `statusLine` in settings.json. Shows live **model · branch · ↑unpushed/↓behind · PR# · context%**. Makes the never-lose-work state (unpushed commits) visible at all times, and surfaces which model the session is on. Session JSON carries NO git fields → script shells out (`git branch --show-current`, `git rev-list --left-right --count @{u}...HEAD`). Color thresholds: ctx ≥60% yellow, ≥85% red; dirty branch yellow.
- Both scripts `chmod +x`, fail-soft (missing piece omitted, never errors), smoke-tested with simulated + real input.

## 🟡 Config decisions

- **`autoMemoryEnabled: false`** added to settings.json. Claude Code's home-folder auto-memory (`~/.claude/projects/.../memory/`) is ON by default and writes to exactly the path CLAUDE.md **bans** (doesn't travel across laptops). Verified the unique facts it held are all already in the repo (**Apple Team ID `W8FZGT253G`** → `app.config.ts` + `eas.json`; IAP/RevenueCat → CLAUDE.md + docs) → disabling loses nothing. Curated committed `memory/` stays the single source. ⚠️ `autoMemoryEnabled` is a real settings key per docs but its exact behavior is under-documented — if home-memory keeps growing, re-check.
- **Model pin left at `sonnet`** (committed default). Deliberately NOT flipped to opus: forcing every fresh session to Opus burns tokens silently. Better fix = **visibility** (statusline now shows the live model) → `/model` up per-session when warranted. Senior call: surface the choice, don't hardcode the expensive default.

## ❌ Verified NOT real (don't attempt)

- **`.claude/rules/` with `paths:` frontmatter** — NOT a documented Claude Code feature (checked official docs). Path-scoped instruction loading does not exist; use CLAUDE.md / hooks instead. (Had been tempted to move the parameterized-SQL rule there — would've created a dead dir.)

## Fixing CI also caught a real latent bug (the whole point)

Once CI actually ran on `main`, it immediately went red on **content-tool**: `Cannot find module '@anthropic-ai/sdk'`. Root cause = a **2nd "false-green-handoff" instance**: `@anthropic-ai/sdk` is imported by `anthropicDefinitionProvider.ts` / `qa/sample.ts` / `commands/enrich.ts` but was **never in `content-tool/package.json`** — it lived only as an `extraneous` hoisted entry in local `node_modules`, so local `npm run check` passed while clean `npm ci` failed. **Red since ≥2026-06-01, invisible because CI wasn't triggering.** Fixed: pinned `@anthropic-ai/sdk@0.100.1` (commit `92e6c39`). Confirmed `openai` is only a provider *name* string (fetch to OpenAI-compatible endpoints, no SDK) → no sibling fix. **CI now fully GREEN** (both Mobile + Content-Tool jobs, verified via `gh run watch`).

⚠️ Follow-up (non-blocking): CI uses `actions/checkout@v4` + `actions/setup-node@v4` on Node 20 — GitHub forces Node 24 on 2026-06-16. Bump the action versions.

## Verification

- settings.json valid JSON (`jq empty` ✓). Guardrail hook still allows normal writes (exit 0 ✓). Both new scripts smoke-tested. Content-tool `npm run check` GREEN (9 files / 99 tests). End-to-end: CI fix → ran → found missing dep → fixed → CI green (both jobs).

## Meta-lesson

The highest-value "improve Claude" work was NOT importing skills (11 repo surveys → ~1 note each) — it was **auditing the existing harness config**, which surfaced two real bugs (dead CI, 4.5 GB cruft) and three honor-system rules that could be automated. Audit your own setup before hunting external tooling.
