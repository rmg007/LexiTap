#!/usr/bin/env bash
# SessionStart context injector for LexiTap.
# Automates two CLAUDE.md rules: "start a session by reading open issues" and
# "never end a session with unpushed commits". Injects the work queue + git
# sync state into the model's context at session start.
#
# IMPORTANT: plain stdout is NOT fed to the model on SessionStart — context must
# be returned as JSON hookSpecificOutput.additionalContext (verified against
# code.claude.com/docs/en/hooks). Fails open: any error → empty JSON, never blocks.
set -uo pipefail

root="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
cd "$root" 2>/dev/null || { printf '{}'; exit 0; }

ctx=""

# --- Git sync state (the never-lose-work signal) ---
if git rev-parse --git-dir >/dev/null 2>&1; then
  branch="$(git branch --show-current 2>/dev/null)"
  ctx+="Git: on '${branch}'"
  if ab="$(git rev-list --left-right --count '@{u}...HEAD' 2>/dev/null)"; then
    behind="$(printf '%s' "$ab" | awk '{print $1}')"
    ahead="$(printf '%s' "$ab" | awk '{print $2}')"
    [ "${ahead:-0}" != "0" ] && ctx+=" — ⚠️ ${ahead} UNPUSHED commit(s); push before /clear"
    [ "${behind:-0}" != "0" ] && ctx+=" — ${behind} behind upstream (pull)"
    [ "${ahead:-0}" = "0" ] && [ "${behind:-0}" = "0" ] && ctx+=" — in sync with upstream"
  else
    ctx+=" — no upstream tracking branch"
  fi
  dirty="$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')"
  [ "${dirty:-0}" != "0" ] && ctx+="; ${dirty} uncommitted change(s) in working tree"
  ctx+=$'\n'

  # --- Litter + stranded-work report (2026-06-11 hardening: the recurring "super messy" state) ---
  # Worktrees besides this one — dirty ones may be ACTIVE parallel sessions.
  wt_report=""
  while IFS= read -r wt; do
    [ -n "$wt" ] && [ "$wt" != "$root" ] && [ -d "$wt" ] || continue
    wb="$(git -C "$wt" branch --show-current 2>/dev/null)"
    wd="$(git -C "$wt" status --porcelain 2>/dev/null | wc -l | tr -d ' ')"
    wt_report+="  ${wt} [${wb:-detached}]"
    [ "${wd:-0}" != "0" ] && wt_report+=" — ${wd} uncommitted change(s) (possibly an ACTIVE parallel session — do not touch)"
    wt_report+=$'\n'
  done < <(git worktree list --porcelain 2>/dev/null | awk '/^worktree /{print $2}')
  [ -n "$wt_report" ] && ctx+=$'Other worktrees:\n'"$wt_report"
  # Branches with commits NOT in main = possibly stranded real work (descriptive only — never auto-delete).
  unmerged="$(git for-each-ref refs/heads --no-merged main \
    --format='  %(refname:short) — last commit %(committerdate:short)%(if)%(upstream)%(then), pushed%(else), LOCAL-ONLY (unbacked-up)%(end)' 2>/dev/null)"
  [ -n "$unmerged" ] && ctx+=$'⚠️ Branches with commits NOT in main (possible stranded work — triage, never force-delete):\n'"$unmerged"$'\n'
  # Merged litter count (reaped by the /orchestrate sync cleanup step).
  merged_n="$(git branch --merged main 2>/dev/null | grep -cvE '^\*|^\+|^\s*main$' | tr -d ' ')"
  [ "${merged_n:-0}" != "0" ] && ctx+="Merged-into-main local branches: ${merged_n} (reap via /orchestrate sync step 8)"$'\n'
  # Stashes are invisible, per-worktree, and die with pruned worktrees.
  stash_n="$(git stash list 2>/dev/null | wc -l | tr -d ' ')"
  [ "${stash_n:-0}" != "0" ] && ctx+="⚠️ ${stash_n} git stash entr(ies) — stashes die with worktrees; commit to a branch instead"$'\n'
  # Push-race protocol depends on this per-clone config (CLAUDE.md New Machine Setup).
  [ "$(git config pull.rebase 2>/dev/null)" != "true" ] && ctx+="Note: git config pull.rebase is unset — run: git config pull.rebase true (push-race protocol, CLAUDE.md)"$'\n'
fi

# --- Open GitHub issues (the work queue) + CI health on main ---
if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  issues="$(gh issue list --state open --limit 15 \
    --json number,title --jq '.[] | "  #\(.number) \(.title)"' 2>/dev/null)"
  if [ -n "$issues" ]; then
    ctx+=$'Open GitHub issues (the work queue — start here):\n'"$issues"$'\n'
  else
    ctx+=$'No open GitHub issues — active plan is ROADMAP.md.\n'
  fi

  # CI health (2026-06-11 hardening: CI was silently dead/red TWICE — make it visible).
  ci_json="$(gh run list --workflow=ci.yml --branch main --limit 1 \
    --json conclusion,createdAt --jq '.[0]' 2>/dev/null)"
  if [ -n "$ci_json" ] && [ "$ci_json" != "null" ]; then
    ci_concl="$(printf '%s' "$ci_json" | jq -r '.conclusion // "in_progress"' 2>/dev/null)"
    [ "$ci_concl" = "failure" ] && ctx+=$'🔴 CI on main is RED — check `gh run list --workflow=ci.yml --branch main` before building on top.\n'
    # Dead-trigger detection: newest main commit touching CI-covered paths vs the last run.
    code_ts="$(git log -1 --format=%ct origin/main -- mobile content-tool .github/workflows/ci.yml 2>/dev/null)"
    ci_iso="$(printf '%s' "$ci_json" | jq -r '.createdAt' 2>/dev/null)"
    ci_ts="$(date -j -f '%Y-%m-%dT%H:%M:%SZ' "$ci_iso" +%s 2>/dev/null || date -d "$ci_iso" +%s 2>/dev/null)"
    if [ -n "${code_ts:-}" ] && [ -n "${ci_ts:-}" ] && [ "$code_ts" -gt "$ci_ts" ] 2>/dev/null; then
      ctx+=$'⚠️ CI may be DEAD: a mobile/content-tool commit on main is newer than the last ci.yml run — check triggers/paths.\n'
    fi
  else
    ctx+=$'⚠️ ci.yml has no runs on main (dead trigger?) — verify CI is alive: gh run list --workflow=ci.yml\n'
  fi
fi

[ -z "$ctx" ] && { printf '{}'; exit 0; }

# Emit as JSON additionalContext (the only channel the model actually reads).
jq -cn --arg c "$ctx" \
  '{hookSpecificOutput:{hookEventName:"SessionStart",additionalContext:$c}}' 2>/dev/null \
  || printf '{}'
