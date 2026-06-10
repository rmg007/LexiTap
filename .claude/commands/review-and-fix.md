Perform a comprehensive code review of the current branch diff and fix every confirmed finding. This is the command for "review your work" / "review your code" requests.

---

## Phase 0 — Gather the diff

Run `git diff @{upstream}...HEAD`. If no upstream, use `git diff main...HEAD` or `git diff HEAD~1`. If uncommitted changes exist, include `git diff HEAD` too. This is the full review scope.

---

## Phase 1 — Find candidates (7 angles, up to 6 each)

Run all 7 finder angles in parallel via the Agent tool:

**A — Line-by-line diff scan.** Read every hunk. Read enclosing functions. Ask: what input/state/timing makes this wrong? Look for inverted conditions, off-by-one, null deref, missing await, falsy-zero, wrong-variable copy-paste, swallowed errors, unescaped regex.

**B — Removed-behavior auditor.** Every deleted/replaced line — what invariant did it enforce? Is it re-established in the new code? Missing guard, dropped error path, narrowed validation, deleted test = candidate.

**C — Cross-file tracer.** For each changed function, find callers (Grep). Does the change break a call site? Changed return shape, new precondition, new exception? Check callees too.

**D — Reuse.** New code that re-implements something already in the codebase. Grep shared utils. Name the existing helper.

**E — Simplification.** Redundant/derivable state, copy-paste with slight variation, deep nesting, dead code. Name the simpler form.

**F — Efficiency.** Redundant computation, repeated I/O, blocking work in hot paths, long-lived closures that keep large scopes alive. Name the cheaper alternative.

**G — Altitude.** Special-case bandaids layered on shared infra. Prefer generalizing the mechanism over adding cases.

Each finder returns up to 6 candidates as `[{file, line, summary, failure_scenario}]`.

---

## Phase 2 — Verify (1-vote per candidate)

Dedup candidates pointing at the same line/mechanism. For each remaining candidate, run one verifier Agent. Give it the diff + relevant files + the candidate. It returns exactly one of:

- **CONFIRMED** — names inputs/state that trigger it, quotes the line
- **PLAUSIBLE** — mechanism real, trigger uncertain
- **REFUTED** — quotes the line that disproves it

Keep CONFIRMED and PLAUSIBLE.

---

## Phase 3 — Fix everything

**Fix every CONFIRMED and PLAUSIBLE finding.** Do not leave findings as a report. Work through them highest-severity first:

1. Read the relevant file(s) before editing.
2. Make the targeted fix — no scope creep, no refactors beyond what the finding requires.
3. After all fixes, run `npm run check` in the affected project(s) (`mobile/`, `content-tool/`). All checks must pass.
4. If a fix breaks something, diagnose and correct before moving on.

Do not skip a finding because it is "low severity" or "cleanup only." Fix it or explicitly state why it is not actionable (e.g. requires Ryan's product decision, out of scope for this diff).

---

## Phase 4 — Report

After all fixes and a green check, output:

```
## Review + Fix results

**Findings fixed: N**
**Findings skipped: N** (with reason for each)

| # | File | Line | Summary | Fix |
|---|------|------|---------|-----|
| 1 | ... | ... | ... | ... |
...

**Check status:** mobile ✅ / content-tool ✅ (or relevant subset)
```

Terse. Caveman mode. No throat-clearing.

---

## Trigger phrases (auto-invoke this command)

When the user says any of the following, invoke this command without being asked explicitly:
- "review your work"
- "review your code"
- "review and fix"
- "check your work"
- "self-review"
