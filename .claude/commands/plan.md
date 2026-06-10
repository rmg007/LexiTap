Create an implementation plan for: $ARGUMENTS

If no argument given: pull the task from open GitHub issues (work queue) or ask Ryan one line — "plan for what?" — and stop.

**This command produces a PLAN ONLY. Zero code changes. Zero commits to source. The plan file is the deliverable.**

---

## Step 1 — Ground the plan (read before writing)

Never plan blind. In order:

1. **Search `plans/` for an existing plan** covering this task (incl. `plans/archive/`). If one exists → update/extend it, don't fork a duplicate.
2. **Read `memory/MEMORY.md` entries** touching the same area — prior decisions, gotchas, deferred work. A plan that re-litigates a settled decision or re-trips a documented gotcha is a failed plan.
3. **Read the actual code** the plan touches (entry points, types, tests). List files by path. No hand-waving like "update the relevant screen."
4. **Check `ROADMAP.md` + open issues** — does this task already have a number/priority? Reference it.
5. **Check AGENTS.md hard rules + CLAUDE.md High-Risk Paths** — flag every guarded path the plan will touch (`infrastructure/db|srs|iap|storage|crash|analytics`, `app.json`). These need Ryan's confirmation at execution time; say so in the plan.

## Step 2 — Pressure-test the brief

Before writing a single phase: is the task right? If the brief is wrong, weak, or solving a non-problem → say so FIRST, propose the better cut, and only plan what survives. (Global rule: push back before executing, not after.)

## Step 3 — Write the plan

File: `plans/<UPPER_SNAKE_SLUG>_PLAN.md` (match existing: `RICH_WORD_DETAIL_PLAN.md`, `P3_AUTH_PLAN.md`).

Caveman mode. Terse, fragments, arrow notation. Structure (mirror `RICH_WORD_DETAIL_PLAN.md`):

```markdown
# <Title> — <one-line essence>

**Status:** draft (<date>) — pending Ryan's accept.
**Goal:** what changes for the user/learner, 2–3 sentences max.
**Issue:** #N (if any)

**Decisions (Ryan, <date>):** | **Decisions needed from Ryan:**
- locked calls vs open questions — separate them. Open questions get a recommendation, not a menu.

---

## Core design principle — <the de-risk>
The one constraint that keeps this safe. LexiTap house style: ADDITIVE over
mutating; words.db = bundled read-only → new tables = new reads, no user.db
migration; domain/srs untouched unless the task IS srs.

## Out of scope
Explicit. What this plan deliberately does NOT do.

## Phases
### Phase 1 — <name> (smallest shippable, cheapest risk first)
1. Concrete steps w/ real file paths as markdown links.
2. ...
**Done means:** `npm run check` GREEN in affected project(s) + the phase's
observable outcome. Per AGENTS.md: local-green ≠ CI-green — confirm CI.

### Phase N — ...
(Each phase independently committable + pushable. Gate paid/irreversible
steps — API spend, store submission, schema in shipped DB — behind an
explicit Ryan checkpoint, same as Phase-2-gated-on-20-word-sample pattern.)

## Risks / gotchas
Known fragile areas from memory/, high-risk paths touched, concurrency
hazards (no git add -A; shared files like container.ts need one owner).

## Docs to update on completion
Per CLAUDE.md Documentation Rule: which of CLAUDE.md / AGENTS.md /
ROADMAP.md / memory/ each phase must touch — or "none" with reason.
```

Rules:
- **Phases ordered by risk-retirement**, not by layer. Cheapest validation of the scariest assumption first.
- **Every step names real files** (clickable relative links).
- **Quiz/assessment phases:** passive recognition only — NO TextInput (guardrail-enforced).
- **SQL:** parameterized only, ever.
- **No invented scope.** If a step needs a decision Ryan hasn't made, it goes in "Decisions needed," not silently assumed.

## Step 4 — Report

Output:

```
## /plan results

**Plan:** plans/<FILE>.md (created / updated)
**Status:** draft — needs Ryan accept
**High-risk paths touched:** <list or none>
**Decisions needed from Ryan:** <list or none>
**First phase, one line:** <what executes first once accepted>
```

Do NOT start executing. Plan file may be committed (`git add plans/<FILE>.md` — never `-A`) + pushed if Ryan says commit; otherwise leave in working tree and say so.
