#!/usr/bin/env bash
# LexiTap status line — model · branch · ahead/behind · PR · context%
# Reads Claude Code session JSON on stdin (see code.claude.com/docs/en/statusline).
# Git branch / ahead-behind are NOT in the JSON — shell out for them.
# Fails soft: any missing piece is simply omitted, never errors the line.
set -uo pipefail

json="$(cat)"
field() { printf '%s' "$json" | jq -r "$1 // empty" 2>/dev/null; }

model="$(field '.model.display_name')"
ctx="$(field '.context_window.used_percentage')"
pr="$(field '.pr.number')"
cwd="$(field '.workspace.current_dir')"
[ -z "$cwd" ] && cwd="$(field '.cwd')"

# Git state (shell out; the session JSON carries none of this).
branch="" ahead="" behind="" dirty=""
if [ -n "$cwd" ] && git -C "$cwd" rev-parse --git-dir >/dev/null 2>&1; then
  branch="$(git -C "$cwd" branch --show-current 2>/dev/null)"
  if ab="$(git -C "$cwd" rev-list --left-right --count '@{u}...HEAD' 2>/dev/null)"; then
    behind="$(printf '%s' "$ab" | awk '{print $1}')"
    ahead="$(printf '%s' "$ab" | awk '{print $2}')"
  fi
  git -C "$cwd" diff --quiet 2>/dev/null && git -C "$cwd" diff --cached --quiet 2>/dev/null || dirty="*"
fi

# ANSI colors.
dim=$'\e[2m'; cyan=$'\e[36m'; green=$'\e[32m'; yellow=$'\e[33m'; red=$'\e[31m'; reset=$'\e[0m'

out=""
[ -n "$model" ] && out="${dim}${model}${reset}"

if [ -n "$branch" ]; then
  bcol="$green"; [ -n "$dirty" ] && bcol="$yellow"
  out="${out}${out:+ ${dim}·${reset} }${bcol}${branch}${dirty}${reset}"
  # ahead/behind vs upstream — the never-lose-work signal.
  if [ -n "${ahead:-}" ] && [ "$ahead" != "0" ]; then out="${out} ${red}↑${ahead}${reset}"; fi
  if [ -n "${behind:-}" ] && [ "$behind" != "0" ]; then out="${out} ${yellow}↓${behind}${reset}"; fi
else
  out="${out}${out:+ ${dim}·${reset} }${dim}(no upstream)${reset}"
fi

[ -n "$pr" ] && out="${out} ${dim}·${reset} ${cyan}PR#${pr}${reset}"

if [ -n "$ctx" ]; then
  pct="${ctx%.*}"; ccol="$dim"
  [ "${pct:-0}" -ge 60 ] 2>/dev/null && ccol="$yellow"
  [ "${pct:-0}" -ge 85 ] 2>/dev/null && ccol="$red"
  out="${out} ${dim}·${reset} ${ccol}${pct}% ctx${reset}"
fi

printf '%s' "$out"
