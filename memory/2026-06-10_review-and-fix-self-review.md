## Session: /review-and-fix self-review — 9 gaps fixed (2026-06-10)

**What happened:** Ran `/review-and-fix` on its own diff immediately after creation. 9 confirmed logic gaps found and fixed.

**Bugs / gotchas:**
- `"search for bugs"` was listed as a Mode B trigger (skip diff, fix known bug) — but it's a discovery request with no known bug to start from. Mode B then had nothing for Phase 3. Moved to Mode A.
- `git diff HEAD` for uncommitted changes overlaps with the committed-range diff (`@{upstream}...HEAD`) and creates duplicate hunks. Correct commands: `git diff --cached` (staged) + `git diff` (unstaged).
- Phase 4c said "re-run the self-test pattern" with no description of what that is. guardrails.mjs has no automated self-test — the correct test is: `echo '{"tool_name":"Bash","tool_input":{"command":"<forbidden>"}}' | node .claude/hooks/guardrails.mjs; echo "exit: $?"`. Exit 2 = blocked, 0 = allowed.
- Phase 2 verifier had no prompt template — agents improvised inconsistently. Added concrete template.
- Phase 3 had no "fixes are sequential" instruction — agents could attempt parallel edits to the same file.
- Phase 3 Mode B had no heuristic for which project to check when the stack trace doesn't specify one. Added "if unclear, run both".
- "Never stop at the findings table" was only in CLAUDE.md, not in the command file itself. Added to Phase 3 preamble.
- Phase 4e had no rule for when a memory note file already exists (same date+topic). Added: append, don't overwrite.
- CLAUDE.md duplicated the trigger list from the command file — immediately diverged (missing 5 triggers). Fixed: CLAUDE.md now points to the command file as the canonical source; no list duplicated.

**Patterns / lessons:**
- Instruction files (skills, commands) have their own class of bugs: ambiguous mode routing, undefined references, missing fallbacks, duplicated state. Apply the same review discipline to doc/config as to code.
- Whenever a trigger list exists in two places, one will drift. Pick one source of truth and point the other at it.
- If a skill references an external "pattern" or "test", it must either inline the pattern or give the exact command to run. References to undefined artifacts are the doc equivalent of `undefined is not a function`.
