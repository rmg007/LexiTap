## Session: GitHub workflow hardening — "super messy" complaint → 21 confirmed findings fixed (2026-06-11)

**What happened:** Ryan: "our work with github is super messy and this happened plenty of times." Ran /review-and-fix Mode B via a 28-agent ultracode audit (5 finder lenses: memory incidents, repo litter, GitHub settings, hook wiring, CI coverage → adversarial verify per finding). 30 raw → 21 CONFIRMED/PLAUSIBLE, 5 already-defended, 1 refuted. Every recurring failure class now has a defense.

**Fixes applied (server-side, immediate):**
- **Ruleset `protect-main` (id 17545998):** blocks force-push + branch deletion on `main`, applies to admins, NO required PRs — direct-push parallel-agent workflow unchanged. Escape hatch for an emergency history rewrite (e.g. purging a committed secret): temporarily disable in repo Settings → Rules.
- **Secret scanning + push protection ENABLED** (were both OFF on a PUBLIC repo handling OpenAI/Supabase/Sentry/RevenueCat/Apple keys). Push protection = provider-pattern match on push, one-click admin bypass for false positives. Validity-checks toggle didn't stick via API (needs scanning initialized first) — Ryan: one click in Settings → Code security. **These settings do NOT travel with the repo — never disable.**

**Fixes applied (repo):**
- **Stop hook was BROKEN since creation:** `git diff --quiet HEAD` tests the dirty tree, NOT unpushed commits — the documented "#1 lost-work defense" never fired for its stated purpose. Rewritten: `git rev-list --count @{u}..HEAD` + explicit no-upstream warning (the worst-loss case: local-only branch) + accurately-labeled dirty-tree warning.
- **session-context.sh now reports:** other worktrees (+ dirty = "possibly ACTIVE parallel session — do not touch"), branches with commits not in main (pushed vs LOCAL-ONLY), merged-litter count, stash count, pull.rebase config, **CI health on main** (red latest run; dead-trigger detection = newest CI-covered commit newer than last ci.yml run — the exact signature of both historical CI deaths).
- **guardrails.mjs +6 destructive-git blocks:** force-push (`--force`/`-f`/`+refspec`; `--force-with-lease`/`-if-includes` allowed), main-ref deletion, `branch -D`, `worktree remove --force`, `stash clear`/`drop`. **NEW: `guardrails-selftest.mjs` (30 cases, exit-code asserted)** — runs in CI because the hook fails OPEN (a syntax error used to silently disable ALL enforcement).
- **CI coverage holes closed:** `supabase-ci.yml` (Deno tests for delete-account — 15 tests existed, NO CI ever ran them; 9963f33 landed +779 lines of GDPR-critical deletion code with zero checks) + `infra.yml` (hook syntax, guardrails self-test, website `_redirects` .html-alias loop check — the e5f0e3e bug class). Separate workflows because paths filters are workflow-level.
- **deploy.yml DELETED:** never ran once, broken as written (env `EAS_TOKEN` but eas-cli reads `EXPO_TOKEN`; `npx eas` resolves to a 2013 templating lib; auth failure masked by `|| true`; builds Android which is on hold; `gh secret list` is empty anyway). Real release path = local `eas build --auto-submit`. Resurrect from plans/RELEASE_PLAN.md item 16 only with a green workflow_dispatch run first.
- **/orchestrate SKILL.md:** SYNC step 1 now requires externally-visible verifies to run FRESH in-session (the false-"deployed" claim survived 10 days; Supabase silently auto-paused after a "done"); NEW step 8 = reap merged litter (worktrees/branches; guards: never --force/-D, clean+unlocked+stash-empty only, run from main checkout, remote delete only if ancestor of origin/main). Litter previously had NO owner — delete_branch_on_merge never fires for CLI merges; 4.5 GB + 12 branches accumulated twice in 2 days.
- **mobile/eas.json `cli.requireCommit: true`** — EAS builds from dirty trees made `gitCommitHash` unreliable as the binary→commit map.
- **CLAUDE.md/AGENTS.md:** Never-Lose-Work table rewritten (3 new rows, inert auto-delete row corrected), push-race protocol (`pull.rebase true` per clone; octopus-merge exception: `git pull --no-rebase`), merge-subject convention `chore(merge): <branch> → main`, AGENTS.md "Done means" now lists all 3 workflows + two rules: new test file ⇒ CI coverage same commit; new workflow ⇒ one proven green run before relying on it.

**Bugs / gotchas:**
- `git config user.email` is mhalim80@hotmail.com everywhere — VERIFIED FINE: linked to the rmg007 GitHub account (commits attribute correctly). Do not "fix".
- GitHub `delete_branch_on_merge` ONLY fires on PR merges — useless for CLI-merge workflows.
- Workflow paths filters are workflow-level, not job-level — bolting new paths onto ci.yml runs ALL its jobs on every touch.
- The destructive-git guardrails scan whole Bash command strings (same as broad-add) — commit messages quoting force-push commands must go through `git commit -F <file>`; test fixtures with forbidden literals must live in files (the self-test does this), never in echoed Bash strings.

**Deferred (Ryan decisions):**
- `feat/au1-bk1-consumer-wave` — 2 LOCAL-ONLY commits since June 1 (AU1/BK1 consumer wiring, likely superseded by dd104b9/7029bd2): merge-check or discard.
- `stash@{0}` (2026-05-28, 30 files, partly superseded) — `git stash show -p stash@{0}` then drop or recover; guardrail now requires confirmation.
- Builder.io webhook (id 634648939, live, fires on every push) — delete in repo Settings → Webhooks + check github.com/settings/installations & /applications (browser-only).
- Secret-scanning validity checks: one click in Settings → Code security.
- dependabot.yml SKIPPED deliberately: the failing-runs noise premise dissolved (0 open alerts post re-triage); ignore-entries now would silently skip future fixable vulns after the next SDK bump.
- Retroactive build tags: build 2 = 556606c verified; build 3's gitCommitHash needs `eas build:list` confirmation before tagging (see session report).
