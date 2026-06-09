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

## Verification

- settings.json valid JSON (`jq empty` ✓). Guardrail hook still allows normal writes (exit 0 ✓). Both new scripts smoke-tested. ⚠️ Did NOT run full `mobile`/`content-tool` `npm run check` — no app source touched this wave (CI/config/docs only).

## Meta-lesson

The highest-value "improve Claude" work was NOT importing skills (11 repo surveys → ~1 note each) — it was **auditing the existing harness config**, which surfaced two real bugs (dead CI, 4.5 GB cruft) and three honor-system rules that could be automated. Audit your own setup before hunting external tooling.
