---
title: AGENTS and CLAUDE Conventions
category: engineering-process
status: active
updated: 2026-05-31
priority: P0
tags: [agents, claude, conventions, ai-workflow, planning-gate, adversarial-review, compound-learning]
---

# AGENTS and CLAUDE Conventions

How AI coding agents operate inside the LexiTap repository. This is the comprehensive, decision-grade companion to the repo-root operating doc [../../CLAUDE.md](../../CLAUDE.md). Where that doc is the terse checklist an agent loads before every task, this one explains the *why*, the failure modes each protocol prevents, and the exact procedure to follow.

LexiTap is built by a solo founder running autonomous Claude Code agents, one per track (see [GIT_WORKFLOW.md](./GIT_WORKFLOW.md)). The agent is not a pair-programming assistant that waits for instruction at every step — it owns whole tasks end to end. These conventions exist so that an unsupervised agent produces work the founder can trust without re-reading every line.

## Table of Contents

- [Governing Constraint: Autonomy](#governing-constraint-autonomy)
- [The 7-Item Per-Task Checklist](#the-7-item-per-task-checklist)
- [The Planning Gate](#the-planning-gate)
- [The 5-Persona Adversarial Review Protocol](#the-5-persona-adversarial-review-protocol)
- [Compound Learning Loop](#compound-learning-loop)
- [When to Load Which Doc](#when-to-load-which-doc)
- [Open Questions](#open-questions)

## Governing Constraint: Autonomy

> If a task requires the founder to type a command or remember something, automate it or skip it.

This single constraint shapes every protocol below. The founder is one person with a realistic Year-1 cash outlay of roughly $194. There is no QA team, no reviewer on call, no on-call rotation. The adversarial review personas exist precisely *because* there is no human reviewer — the agent must review its own work as adversarially as a hostile colleague would.

Practical consequences:

- Never leave a "TODO: founder must run X" in committed code. Wire it into a script, a CI step, or a postinstall hook instead.
- Never assume the founder remembers a manual step from last session. State lives in the repo (docs, plans, `event_log`), never in chat history.
- Prefer a slightly slower automated path over a fast manual one.

## The 7-Item Per-Task Checklist

Every task — feature, fix, refactor, content change — runs this sequence. Items 0 and 6 and 7 are gates: they are mandatory and block progress.

**Before writing any code:**

0. **Planning Gate (mandatory).** Produce a written implementation plan, then challenge it with the Planning Adversary persona. No code until the plan survives. See [The Planning Gate](#the-planning-gate).

**During implementation:**

1. Read the relevant plan file: `docs/plans/NNN_*.yaml`. The plan carries the `plan_id` your PR must reference.
2. Read `docs/architecture.md` (and [SYSTEM_ARCHITECTURE.md](../04-technical-architecture/SYSTEM_ARCHITECTURE.md)) if you are touching new components or crossing layer boundaries.
3. Check `docs/adr/` for any Architecture Decision Record that constrains this change.
4. Run `npm run check` (lint + typecheck + test) before declaring the work complete. "Tests pass" means all three exit 0.
5. Test on iOS Simulator AND Android Emulator if the change touches UI.

**Before marking complete:**

6. **Adversarial Review Gate (mandatory).** Invoke every reviewer persona whose trigger condition is met. Fix every failed checklist item before marking complete. Do not skip a reviewer because the change "looks fine" — a false positive costs one minute, a missed check costs hours.

**After marking complete:**

7. **Compound Learning (mandatory).** If the task surfaced any new quirk, gotcha, pattern, or constraint, append it to [CODING_STANDARDS.md](./CODING_STANDARDS.md) immediately. One sentence minimum. See [Compound Learning Loop](#compound-learning-loop).

## The Planning Gate

The most expensive mistake an autonomous agent makes is writing the wrong thing confidently. The Planning Gate is the cheapest place to catch that.

**Procedure:**

1. Write a plan that names, explicitly:
   - **What changes** — the behavior or capability being added/altered.
   - **Which files** — concrete paths, created and modified.
   - **Which layers** — domain / application / infrastructure / presentation. Crossing a boundary is a red flag worth justifying.
   - **Which tests** — the specific cases that will prove it works (and the ones deliberately skipped — see [TESTING_STRATEGY.md](./TESTING_STRATEGY.md)).
   - **Failure modes** — what could break elsewhere, what data could corrupt, what edge cases lurk.

2. Invoke the **Planning Adversary** persona against that plan. Ask, in order:
   - What could go wrong?
   - What dependencies am I missing?
   - What does this change break elsewhere in the system?
   - Is there a simpler approach?
   - Does this violate any rule in the conventions doc or the architecture docs?

3. Revise the plan until it survives. Only then write code.

A plan that cannot answer "what does this break?" is not yet a plan. The gate is not satisfied by writing *a* plan — it is satisfied by a plan that has been attacked and held.

## The 5-Persona Adversarial Review Protocol

Before any task is marked complete, it passes through every reviewer persona whose **trigger** matches the change. Each persona is a focused checklist. The personas mirror the highest-risk surfaces of LexiTap: the schema, the SRS scheduler, the content pipeline, the paywall, and the mobile UX.

### 1. Schema Reviewer

**Trigger:** Any change to database schema, migration files, SQLite queries, or anything in `infrastructure/db/`.

Checklist:

- [ ] All active-word queries include `WHERE deleted_at IS NULL`. (Exception: history/audit/replay queries must *not* filter — they render rows for words since removed.)
- [ ] No `UPDATE` or `DELETE` on `quiz_attempts` or `event_log`. These are append-only — insert a compensating row instead.
- [ ] New tables include a `deleted_at` column for soft-delete.
- [ ] `scheduler_version` is tagged on every SRS-related write (`quiz_attempts.scheduler_version`).
- [ ] Timezone handling uses the stored `user.timezone`, never `new Date()` directly for streak boundaries.
- [ ] No raw SQL strings — parameterized queries only.
- [ ] No orphan `words` rows — every entry has at least one example sentence.

### 2. SRS Logic Reviewer

**Trigger:** Any change to scheduler code, review-queue generation, `user_progress` updates, or streak logic.

Checklist:

- [ ] Daily review cap enforced — no unbounded backlog surfaces in one session.
- [ ] Catch-up logic soft-rebalances `next_review_date` across missed days; no full dump of overdue items.
- [ ] Return-after-gap tone is welcoming ("let's pick up where we left off"), never punitive ("87 overdue reviews").
- [ ] No red-badge notification count accumulating for overdue reviews.
- [ ] `scheduler_version` tagged on every write to `quiz_attempts`.
- [ ] SRS logic lives in `domain/` — no business logic leaking into `infrastructure/` or `presentation/`.

### 3. Content Pipeline Reviewer

**Trigger:** Any change to the content CLI, word import/enrich scripts, or `words` table data. See [../06-content-data/CONTENT_PIPELINE_ARCHITECTURE.md](../06-content-data/CONTENT_PIPELINE_ARCHITECTURE.md).

Checklist:

- [ ] No orphan words — every entry has at least one example sentence (CLI `validate` gate enforces this).
- [ ] Multi-word entries (idioms, phrasal verbs) use `word_type` correctly (`"idiom"` / `"phrasal_verb"`) and are treated as atomic units.
- [ ] Distractors for multi-word entries are sampled from the same `tier_id`, not the general word pool.
- [ ] `word_count` is populated from actually-sourced content, never pre-committed at planning time.
- [ ] Audio files present for tiers that require audio (TOEFL at launch; re-evaluate per post-launch tier).
- [ ] No copyright-infringing content in sourced lists or example sentences.

### 4. Paywall / IAP Reviewer

**Trigger:** Any change to IAP logic, paywall UI, entitlement checking, exam-pack / All-Exams bundle logic, or `content_tiers.is_active`.

Checklist:

- [ ] The `all_exams` entitlement (All-Exams bundle + upgrade SKUs) automatically unlocks ALL current AND future exam packs when new content drops activate (`is_active` flip).
- [ ] All paid products are one-time non-consumables — no subscription, auto-renew, trial, or intro-price logic anywhere.
- [ ] Entitlements come from RevenueCat `CustomerInfo` held in memory only — never persisted to `user.db`.
- [ ] IAP product IDs match `content_tiers.store_product_id` exactly — no hardcoded strings outside the table.
- [ ] Paywall / entitlement logic lives in `application/`, not `domain/` or `presentation/`.
- [ ] Paywall copy contains no specific word counts (tier names and CEFR levels are the durable claims; counts depend on sourcing).
- [ ] No deceptive pricing or dark patterns in purchase copy (one-time price stated clearly; no fake recurring-billing language).

### 5. UX / Mobile Reviewer

**Trigger:** Any change to quiz screens, assessment components, or anything in `presentation/screens/` or `presentation/components/`.

Checklist:

- [ ] No `TextInput` in `mobile/src/presentation/screens/QuizScreen.tsx`, any future `mobile/src/presentation/screens/quiz/`, or `mobile/src/presentation/components/assessments/` (banned — defeats the no-typing UX).
- [ ] All interactive elements have a VoiceOver/TalkBack `accessibilityLabel`.
- [ ] All touch targets are at least 44x44 dp.
- [ ] Dark mode supported in all new components.
- [ ] Network not required in quiz or review flows (offline-first; SQLite is source of truth).
- [ ] No keyboard/typing required anywhere in the user-facing quiz experience.

## Compound Learning Loop

The conventions doc is a living artifact, not a tablet handed down once. Every task that teaches the agent something durable feeds that lesson back into the doc so the *next* agent (or the next session of the same agent) does not relearn it.

**When to write:** Immediately after marking a task complete, if any of these occurred:

- A non-obvious gotcha cost you time (a config quirk, an Expo/EAS surprise, a SQLite behavior).
- You discovered a pattern worth standardizing.
- You hit a constraint the docs did not yet state.

**Where to write:** Append to [CODING_STANDARDS.md](./CODING_STANDARDS.md) (the canonical standards doc). If the lesson is research-grade or needs expansion, also note it in the relevant `lexitap-docs/` file.

**Rule:** Institutional knowledge belongs in the doc, not the chat log. One sentence is the floor; precision beats brevity. Chat transcripts are not searched by future agents — docs are.

## When to Load Which Doc

An agent does not read every doc on every task — it loads on demand:

| Situation | Load |
|-----------|------|
| Every coding task (always) | [CODING_STANDARDS.md](./CODING_STANDARDS.md) |
| Touching new components or crossing layers | [SYSTEM_ARCHITECTURE.md](../04-technical-architecture/SYSTEM_ARCHITECTURE.md) |
| Working Track A / content CLI / enrichment | [CONTENT_PIPELINE_ARCHITECTURE.md](../06-content-data/CONTENT_PIPELINE_ARCHITECTURE.md) |
| Planning phase work, timelines, infra setup | [ROADMAP.md](../02-product-definition/ROADMAP.md) |
| Writing or modifying any DB query | [DATABASE_SCHEMA.md](../04-technical-architecture/DATABASE_SCHEMA.md) + Schema Reviewer |
| Before any code | the task's `docs/plans/NNN_*.yaml` |

Load the minimum needed to do the task correctly. Over-loading context dilutes attention; under-loading skips a constraint.

## Schema Spec for Task/Plan Files

All architectural, feature, and implementation plans must follow this strict schema to ensure machine-readability by autonomous agents and human clarity:

```yaml
plan_id: "PLAN-001"                         # Unique alphanumeric identifier
date: "YYYY-MM-DD"                          # Plan creation date
status: "planned" | "in-progress" | "approved" | "completed"
mode: "planning" | "execution"
affected_components:                        # List of components affected
  - "mobile"
  - "content-tool"
affected_layers:                            # Hexagonal architecture boundaries
  - "domain"
  - "presentation"
constraint_invariants:                      # Strict rules to obey during task
  - "Strictly zero TextInput in quiz screen specs"
  - "No raw SQL string interpolation in query modules"
proposed_changes:
  - action: "MODIFY" | "NEW" | "DELETE"
    path: "relative/path/to/file.ts"
    rationale: "Detailed explanation of why this change is necessary"
verification_steps:
  - command: "npm run test:unit"            # Command to run for automated testing
    scope: "mobile"
  - step: "Manual testing instruction"      # Step to perform manually
```

## Open Questions

- `unresolved` — Whether the Compound Learning append should be auto-committed by a hook or left to the agent's discretion; leaning toward a hook to satisfy the autonomy constraint.
