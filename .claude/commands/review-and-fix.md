Comprehensive review, fix, and prevention. Covers code review of the current diff AND direct bug/error fixes. For every finding: fix the code, then prevent recurrence by updating rules, docs, guardrails, and memory so the same class of mistake cannot happen again.

---

## Entry points

**Mode A — Review diff (default):** triggered by "review your work", "review your code", "check your work", "review and fix", "self-review". Run Phases 0–5 against the current branch diff.

**Mode B — Fix a bug/error:** triggered by "fix this bug", "fix this error", "search for bugs", "fix bugs", "fix errors", or when the user pastes a stack trace / error message. Skip Phases 0–2 (no diff to review). Start at Phase 3 using the reported bug as the finding, then continue through Phase 5.

---

## Phase 0 — Gather the diff (Mode A only)

Run `git diff @{upstream}...HEAD`. If no upstream, use `git diff main...HEAD` or `git diff HEAD~1`. If uncommitted changes exist, also include `git diff HEAD`. This is the full review scope.

---

## Phase 1 — Find candidates (Mode A only, 7 angles in parallel)

Run all 7 finder angles via the Agent tool in a single parallel call:

**A — Line-by-line diff scan.** Read every hunk + enclosing functions. What input/state/timing makes this wrong? Inverted conditions, off-by-one, null deref, missing await, falsy-zero, wrong-variable copy-paste, swallowed errors, unescaped regex.

**B — Removed-behavior auditor.** Every deleted/replaced line — what invariant did it enforce? Is it re-established? Missing guard, dropped error path, narrowed validation, deleted meaningful test = candidate.

**C — Cross-file tracer.** For each changed function, grep callers. Does the change break a call site? Changed return shape, new precondition, new exception, new timing dependency?

**D — Reuse.** New code that re-implements something the codebase already has. Grep shared utils, name the existing helper.

**E — Simplification.** Redundant/derivable state, copy-paste with slight variation, deep nesting, dead code. Name the simpler form.

**F — Efficiency.** Redundant computation, repeated I/O, blocking work in hot paths, long-lived closures keeping large scopes alive. Name the cheaper alternative.

**G — Altitude.** Special-case bandaids on shared infra. Prefer generalizing the mechanism over adding cases.

Each finder returns up to 6 candidates: `[{file, line, summary, failure_scenario}]`.

---

## Phase 2 — Verify (Mode A only, 1-vote per candidate)

Dedup candidates pointing at the same line/mechanism. For each remaining candidate, run one verifier Agent. Returns exactly:

- **CONFIRMED** — names inputs/state that trigger it, quotes the line.
- **PLAUSIBLE** — mechanism real, trigger uncertain. State what would confirm.
- **REFUTED** — quotes the line that disproves it.

Keep CONFIRMED and PLAUSIBLE.

---

## Phase 3 — Fix everything

Fix every CONFIRMED and PLAUSIBLE finding (Mode A), or the reported bug (Mode B). Highest-severity first.

1. Read the relevant file(s) before editing.
2. Make the targeted fix — no scope creep beyond what the finding requires.
3. After all fixes, run `npm run check` in affected projects (`mobile/`, `content-tool/`). All checks must pass green.
4. If a fix breaks something, diagnose and correct before moving on.
5. Do not skip a finding because it is "low severity" or "cleanup only." Fix it or state explicitly why it is not actionable (requires Ryan's product decision, genuinely out of scope, etc.).

---

## Phase 4 — Prevent recurrence

This is mandatory. For every finding fixed (or bug resolved), ask: **"What would have prevented this from being written in the first place?"**

Work through each root cause and apply the appropriate prevention:

### 4a — CLAUDE.md rule
If the finding reveals a pattern that future agents should never repeat — a wrong approach, a missing validation, a dangerous assumption — add a rule to the relevant section of `CLAUDE.md`. Use the "never do X" / "always do Y" form. Be specific: name the file/function/pattern, not just a vague principle.

### 4b — AGENTS.md code pattern or invariant
If the finding reveals a code-level invariant that agents must respect (a query pattern, a schema constraint, a call order, a safety property), add it to `AGENTS.md` in the relevant section. Include the file path and the invariant in concrete terms.

### 4c — guardrails.mjs enforcement
If the finding is something that should be hard-blocked at the edit boundary (not just documented), add a rule to `.claude/hooks/guardrails.mjs`. Use the existing pattern: scan the Bash command string for the forbidden literal and block with a clear error message. Re-run the self-test pattern to confirm it works. Only block things that are unambiguously always wrong.

### 4d — Test coverage
If the finding was a logic bug that tests would have caught, add or strengthen the test. The test should go red on the original broken state and green after the fix. Name it so its intent is obvious.

### 4e — Memory note
Write or update a file in `memory/` documenting:
- What the root cause was
- What the fix was
- What the prevention is
- Any gotcha a future agent needs to know about this area

Update the index entry in `memory/MEMORY.md`. Use the existing session-note format.

### What NOT to prevent
Do not add rules for one-off accidents with no recurrence pattern. Do not add docs that describe the obvious. If prevention is already documented accurately, say so and skip. Quality over volume — one precise rule beats five vague ones.

---

## Phase 5 — Report

After all fixes and prevention steps, output:

```
## Review + Fix + Prevent results

**Mode:** A (diff review) | B (bug fix)

**Findings fixed: N**
**Findings skipped: N** (with reason for each)

| # | File | Line | Summary | Fix applied |
|---|------|------|---------|-------------|
| 1 | ...  | ...  | ...     | ...         |

**Prevention applied:**
- CLAUDE.md: <what rule was added/updated, or "unchanged">
- AGENTS.md: <what invariant was added, or "unchanged">
- guardrails.mjs: <what was blocked, or "unchanged">
- Tests: <what was added/strengthened, or "none needed">
- memory/: <note created/updated, or "unchanged">

**Check status:** mobile ✅ / content-tool ✅ (or relevant subset)
```

Terse. Caveman mode. No throat-clearing.

---

## Trigger phrases (auto-invoke this command)

Invoke immediately — do not ask for confirmation — when the user says:

**Review triggers:**
- "review your work"
- "review your code"
- "review and fix"
- "check your work"
- "self-review"

**Bug/error fix triggers:**
- "fix this bug" / "fix the bug" / "fix bugs" / "search for bugs"
- "fix this error" / "fix the error" / "fix errors" / "fix this issue"
- User pastes a stack trace, error log, or test failure output
- "what's wrong with this" / "something is broken"
