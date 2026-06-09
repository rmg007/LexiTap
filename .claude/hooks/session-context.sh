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
fi

# --- Open GitHub issues (the work queue) ---
if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  issues="$(gh issue list --state open --limit 15 \
    --json number,title --jq '.[] | "  #\(.number) \(.title)"' 2>/dev/null)"
  if [ -n "$issues" ]; then
    ctx+=$'Open GitHub issues (the work queue — start here):\n'"$issues"$'\n'
  else
    ctx+=$'No open GitHub issues — active plan is ROADMAP.md.\n'
  fi
fi

[ -z "$ctx" ] && { printf '{}'; exit 0; }

# Emit as JSON additionalContext (the only channel the model actually reads).
jq -cn --arg c "$ctx" \
  '{hookSpecificOutput:{hookEventName:"SessionStart",additionalContext:$c}}' 2>/dev/null \
  || printf '{}'
