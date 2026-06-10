Comprehensive review, fix, and prevention. Covers code review of the current diff AND direct bug/error fixes. For every finding: fix the code, then prevent recurrence by updating rules, docs, guardrails, and memory so the same class of mistake cannot happen again.

---

## Entry points

**Mode A — Review diff:** triggered by "review your work", "review your code", "check your work", "review and fix", "self-review", "search for bugs". Run all phases against the current branch diff.

**Mode B — Fix a known bug/error:** triggered by "fix this bug", "fix the bug", "fix bugs", "fix this error", "fix the error", "fix errors", "fix this issue", "what's wrong with this", "something is broken", or when the user pastes a stack trace / error log / test failure output. Skip Phases 0–2. Treat the reported bug as a CONFIRMED finding and jump to Phase 3, then continue through Phase 5.

---

## Phase 0 — Gather the diff (Mode A only)

Run `git diff @{upstream}...HEAD`. If no upstream, try `git diff main...HEAD`, then `git diff HEAD~1`. If uncommitted changes also exist, include them separately: `git diff --cached` (staged) and `git diff` (unstaged). Do not use `git diff HEAD` for the uncommitted portion — it overlaps with the committed range and creates duplicate hunks. This is the full review scope.

---

## Phase 1 — Find candidates (Mode A only — 7 angles, all in parallel)

Run all 7 finder angles via the Agent tool in a single message (parallel). Each angle is independent.

**A — Line-by-line diff scan.** Read every hunk + enclosing functions. What input/state/timing makes this wrong? Inverted conditions, off-by-one, null deref, missing await, falsy-zero, wrong-variable copy-paste, swallowed errors, unescaped regex.

**B — Removed-behavior auditor.** Every deleted/replaced line — what invariant did it enforce? Is it re-established in the new code? Missing guard, dropped error path, narrowed validation, deleted meaningful test = candidate.

**C — Cross-file tracer.** For each changed function, grep callers. Does the change break a call site? Changed return shape, new precondition, new exception, new timing dependency? Check callees too.

**D — Reuse.** New code that re-implements something the codebase already has. Grep shared utils, name the existing helper.

**E — Simplification.** Redundant/derivable state, copy-paste with slight variation, deep nesting, dead code. Name the simpler form.

**F — Efficiency.** Redundant computation, repeated I/O, blocking work in hot paths, long-lived closures keeping large scopes alive. Name the cheaper alternative.

**G — Altitude.** Special-case bandaids layered on shared infra. Prefer generalizing the mechanism over adding cases.

Each finder returns up to 6 candidates: `[{file, line, summary, failure_scenario}]`.

---

## Phase 2 — Verify (Mode A only — 1 verifier Agent per candidate)

Dedup candidates pointing at the same line/mechanism — keep the one with the most concrete failure scenario. For each remaining candidate, spawn one verifier Agent with this prompt template:

> "You are verifying a code review candidate. Diff: [paste diff]. Candidate: [file, line, summary, failure_scenario]. Read the file at [path] and return exactly one verdict:
> - **CONFIRMED** — name the exact inputs/state that trigger it and quote the line.
> - **PLAUSIBLE** — mechanism is real but trigger is uncertain. State what would confirm it.
> - **REFUTED** — quote the line that proves the candidate is wrong."

Keep CONFIRMED and PLAUSIBLE. Drop REFUTED.

---

## Phase 3 — Fix everything

**Never stop at a findings table. All phases must complete before reporting.**

Fix every CONFIRMED and PLAUSIBLE finding (Mode A), or the reported bug (Mode B). Work sequentially, highest-severity first — do not attempt parallel edits (concurrent edits to the same or related files cause conflicts).

1. Read the relevant file(s) before editing.
2. Make the targeted fix — no scope creep beyond what the finding requires.
3. After all fixes, run `npm run check` in the affected project(s):
   - Changed files under `mobile/` → `cd mobile && npm run check`
   - Changed files under `content-tool/` → `cd content-tool && npm run check`
   - Changed files in both, or project unclear → run check in **both**
   - Changed files outside both (e.g. `.claude/`, `website/`) → no automated check; manually verify the change is self-consistent
   - All checks must pass green before continuing.
4. If a fix breaks a check, diagnose and correct before moving on.
5. Do not skip a finding because it is "low severity" or "cleanup only." Fix it or state explicitly why it is not actionable (requires Ryan's product decision, genuinely out of scope, etc.).

---

## Phase 4 — Prevent recurrence

**Mandatory after every fix.** For each finding, ask: *"What would have prevented this from being written in the first place?"* Then apply the prevention:

### 4a — CLAUDE.md rule
If the finding reveals a pattern future agents should never repeat, add a rule to `CLAUDE.md`. Use "never do X" / "always do Y" form. Be specific: name the file, function, or pattern, not a vague principle.

### 4b — AGENTS.md invariant
If the finding reveals a code-level invariant agents must respect (query pattern, schema constraint, call order, safety property), add it to `AGENTS.md`. Include the file path and the invariant in concrete terms.

### 4c — guardrails.mjs enforcement
If the finding is something that should be hard-blocked at the edit boundary (not just documented), add a rule to `.claude/hooks/guardrails.mjs` following the existing pattern:

```js
// In checkBash(cmd): scan the command string
if (/forbidden-pattern/.test(cmd)) {
  block('Clear message explaining why this is blocked and what to do instead.');
}
// In checkFileWrite(file, text): scan the file path and new content
if (/target-file-pattern/.test(file) && /forbidden-content/.test(text)) {
  block('...');
}
```

**After adding a rule, verify it works** by piping a test event to the hook and checking the exit code:
```bash
# Should exit 2 (blocked):
echo '{"tool_name":"Bash","tool_input":{"command":"<the forbidden command>"}}' | node .claude/hooks/guardrails.mjs
echo "exit: $?"
# Should exit 0 (allowed):
echo '{"tool_name":"Bash","tool_input":{"command":"<a legitimate similar command>"}}' | node .claude/hooks/guardrails.mjs
echo "exit: $?"
```

Only block things that are unambiguously always wrong — the hook fails open (any error → exit 0) but a wrong block regex breaks legitimate work.

### 4d — Test coverage
If the finding was a logic bug that tests would have caught, add or strengthen the test. The test must fail on the original broken state and pass after the fix. Name it so the intent is obvious.

### 4e — Memory note
Create or update a file in `memory/` using the date-slug format: `memory/YYYY-MM-DD_<slug>.md`. Use today's date.

- If a note for this date and topic already exists, **append** to it — do not overwrite.
- If no note exists, create one following this exact format (matches the `/snip` command output):

```markdown
## Session: <Title> (<date>)

**What happened:** 1–3 sentence summary.

**Decisions:**
- …

**Bugs / gotchas:**
- …

**Patterns / lessons:**
- …

**Deferred:**
- …
```

Only include sections that have content. No empty sections.

Then add or update the index entry in `memory/MEMORY.md` at the **top** (below the header line), following the existing format:
```markdown
## ✅ Session: <Title> (<date>)

**[<Title> (<date>)](<filename>.md)** — one-line summary. Key outcomes. ✅/⚠️ as appropriate.
```

### What NOT to prevent
Do not add rules for one-off accidents with no recurrence pattern. Do not document the obvious. If prevention is already documented accurately, say so and skip. One precise rule beats five vague ones.

---

## Phase 5 — Report

After all fixes and prevention steps:

```
## Review + Fix + Prevent results

**Mode:** A (diff review) | B (bug fix)

**Findings fixed: N**
**Findings skipped: N** (reason for each)

| # | File | Line | Summary | Fix applied |
|---|------|------|---------|-------------|
| 1 | ...  | ...  | ...     | ...         |

**Prevention applied:**
- CLAUDE.md: <rule added/updated, or "unchanged">
- AGENTS.md: <invariant added, or "unchanged">
- guardrails.mjs: <rule added + verified, or "unchanged">
- Tests: <added/strengthened, or "none needed">
- memory/: <note created/updated, or "unchanged">

**Check status:** mobile ✅ / content-tool ✅ (or relevant subset)
```

Terse. Caveman mode. No throat-clearing.

---

## Trigger phrases

This is the canonical trigger list. CLAUDE.md points here — do not duplicate.

**Mode A (diff review):**
- "review your work" / "review your code" / "review and fix"
- "check your work" / "self-review"
- "search for bugs"

**Mode B (known bug/error fix):**
- "fix this bug" / "fix the bug" / "fix bugs"
- "fix this error" / "fix the error" / "fix errors" / "fix this issue"
- "what's wrong with this" / "something is broken"
- User pastes a stack trace, error log, or test failure output
