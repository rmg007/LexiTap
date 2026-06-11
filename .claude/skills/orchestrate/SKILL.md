---
name: orchestrate
description: Maintain LexiTap's living orchestration system — the task graph that drives the project toward release. Use to (a) SYNC state after any task finishes (flip status, unblock dependents, regenerate downstream prompts whose assumptions changed, append a memory note, re-sync both roadmaps), (b) pick the NEXT task or compute a parallel-safe batch to run, or (c) EXPAND a stubbed far-phase task into a full grounded prompt once its dependencies land. Trigger after completing any unit of work, when asked "what's next" / "what can run in parallel", before /clear, or when ORCHESTRATION.md, ROADMAP.md, or plans/ have drifted from reality. Keeps glance→execution→detail altitudes consistent.
---

# /orchestrate — keep the project self-orchestrating

LexiTap drives itself toward release through three altitudes that must never drift apart:

| Altitude | File | Role |
|---|---|---|
| **Glance** | `ROADMAP.md` (root) + `lexitap-docs/02-product-definition/ROADMAP.md` (canonical) | phase/gate status |
| **Execution** | `ORCHESTRATION.md` | runnable prompts + dependency graph + parallel metadata |
| **Detail** | `plans/*.md` | why/how for risky pieces |

This skill is the **only** writer that keeps them in sync. Read `ORCHESTRATION.md`'s header (schema + parallel rules) before acting — it is the contract.

**First action, always:** read the live tree state — `git status --short`, `git log --oneline -8`, and `ORCHESTRATION.md`. Trust the repo over any claim in chat (handoff git claims have been false before). Then route to a mode.

---

## Mode: SYNC  (default — run after any task finishes, before /clear)

A task just completed. Reconcile every altitude to the new reality. Do these in order:

1. **Verify the task actually passed its `verify` condition.** Run the stated check (e.g. `npm run check` in the affected project). If it didn't pass, the task is NOT done — leave it `in-progress`, report what failed, stop. Do not mark green what isn't. **For externally-visible effects (deployed site, DNS, dashboard config, store status), the verify must be run fresh in THIS session — a `PASSED <date>` stamp in the task block is not evidence** (the false-"deployed to lexitap.app" claim survived 10 days; the Supabase project silently auto-paused after a "done" verify). Where the effect can't be checked by a command, record the observed evidence (pasted command output / API response / dashboard observation) in the sync note — never a bare assertion.
2. **Flip status** of the finished task to `done` in `ORCHESTRATION.md` (record the commit SHA if one exists).
3. **Unblock dependents:** for every task whose `depends_on` is now fully `done`, change `blocked` → `ready`. If a dependency was *reopened*, regress dependents `ready`→`blocked`.
4. **Regenerate stale downstream prompts.** A prompt rots when the finished task changed a fact it assumed (a new file path, a renamed seam, a chosen model/budget, a schema shape). For each newly-`ready` task that was a stub or references changed state, **expand/rewrite its prompt against the *current* repo** — grounded (real paths, real function names), not guessed. This is the anti-rot mechanism; it is the point of the system.
5. **Append a memory note** (never overwrite): add a one-line entry to `memory/MEMORY.md`'s index pointing at a dated note in `memory/` if the task carried a lesson, decision, or fragile-area discovery. Follow the existing index format (emoji + date + 1–2 lines + link). Routine mechanical work needs only the status flip, no note.
6. **Re-sync the roadmaps.** Update the "Active Front" / "Next, in order" blocks in BOTH `ROADMAP.md` files so the glance layer matches `ORCHESTRATION.md`. Keep the canonical-vs-mirror pointer intact. Correct any now-stale framing (e.g. a "% to launch" that no longer holds).
7. **Commit discipline:** stage the touched docs by **explicit path** (never `git add -A`/`.`/`commit -a` — hard-blocked). The two roadmaps + `ORCHESTRATION.md` + memory are a serialization point: if other agents are in flight, hold the doc commit until the tree is clean (the C6–C8 entanglement lesson). Footer: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
8. **Reap merged litter** (added 2026-06-11 — branch/worktree cleanup previously had no owner; 4.5 GB + 12 branches accumulated twice in 2 days). Run **from the main checkout, never from inside a worktree being removed**, and only when no other agents are in flight. For each entry in `git worktree list` besides main: if its branch is merged into main AND `git -C <wt> status --porcelain` is empty AND `git -C <wt> stash list` is empty AND it isn't locked by a live pid (dead-pid lock → `git worktree unlock` first), run `git worktree remove <wt>` — **never `--force`** (a dirty/locked worktree = possibly an ACTIVE parallel session: skip + report). Then `git branch -d` merged local branches (**never `-D`**; a `-d` refusal = possible real work or a squash-merge false negative — report, don't delete) and `git push origin --delete <branch>` only for remote branches whose tip is an ancestor of `origin/main` after a fresh `git fetch`. Finish with `git worktree prune`. GitHub's delete-on-merge never fires here (CLI merges, no PRs) — this step is the only reaper.

Output: a 3–5 line summary — what closed, what's newly `ready`, what (if anything) is now the critical-path task.

## Mode: NEXT  ("what's next" / "what can run in parallel")

1. List all `ready` tasks from `ORCHESTRATION.md`.
2. Split by `owner`: surface **ryan-only** tasks first if any sit on the critical path (an agent cannot advance past them — be honest, don't bury them).
3. Compute a **parallel-safe batch**: the largest set of `ready`, `parallel_safe: true`, `owner: agent` tasks whose `paths` are **pairwise disjoint** and none of which touch a serialization point (the two roadmaps, `ORCHESTRATION.md`, shared barrels, `mobile/package.json`). Report it as "safe to run concurrently in separate worktrees."
4. Recommend ONE next action with a reason. Do not produce a menu of everything — give the call.

**Parallelism guardrail:** only ever propose concurrent agents under `Workflow` worktree isolation (or manual `git worktree`). Two writers on one checkout is banned. If two `ready` tasks share a path, they are sequential — say so.

## Mode: EXPAND  ("flesh out / write the prompt for <id>")

Turn a stub into a runnable prompt. Only legitimate once the task's `depends_on` are `done` and the real state exists — otherwise you're guessing (the thing this system exists to prevent).

1. Read the relevant `plans/*.md` detail doc and the *current* code the task will touch (real paths, real symbols).
2. Write the prompt grounded in what's actually there now: exact files, the `verify` command, the guardrails it must respect (high-risk paths, no-TextInput, parameterized SQL, explicit-path staging).
3. Replace the stub in `ORCHESTRATION.md`; leave `status: ready`.

---

## Invariants (do not violate)

- **Honesty over motion.** Never mark a task `done` whose `verify` didn't pass. Never hide a ryan-only blocker to make the graph look more agent-drivable than it is. The system's value is a *true* picture of remaining work.
- **No pre-writing far-phase prompts.** Stubs stay stubs until their deps land. Front-loaded prompts rot — that failure is why this system exists.
- **Repo is memory.** Every status change is committed (explicit paths) before `/clear`, or it didn't happen.
- **Three altitudes stay consistent.** Never update `ORCHESTRATION.md` without reconciling the roadmaps in the same pass. Drift between altitudes is the exact hallucination source this skill prevents.
- **Fail open, never fabricate.** If repo state is ambiguous, report the ambiguity and ask — do not invent a status.

## When NOT to use

- Mid-task (use it at task *boundaries*, not every tool call).
- For the actual engineering work — this skill maintains the *map*, it doesn't write features. Run the task's prompt itself, then call this to reconcile.
