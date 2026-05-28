---
title: Learn Quick-Check Spec
screen_id: learn-quick-check
category: ux-design
status: active
updated: 2026-05-24
priority: P1
tab: Quiz
target_file: TBD
related_flows: [learning-new-words]
tags: [screen, learn, quick-check, srs-seeding, encoding]
---

# Learn Quick-Check

> AI-buildable spec. Tokens from [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md). A short tap/drag check after a learn batch that confirms initial encoding and **seeds each new word's starting mastery and first review date** into the SRS. Reuses the assessment widgets and feedback layer — no `TextInput`.

## 1. Purpose

Lightweight confirmation of the words just introduced in [LearnCard.md](./LearnCard.md). Results seed initial `user_progress` rows so the words enter the SRS schedule appropriately, rather than at flat zero.

## 2. Entry & exit

| Direction | From / To | Trigger |
|---|---|---|
| Enter | Learn Card → Got it on final card | End of learn batch |
| Exit | Session Complete | All check items answered |
| Exit | Home | Back (seeds words answered so far) |

## 3. Layout

Reuses the assessment widget frame (prompt / interaction / feedback). Typically MultipleChoice items drawn from the just-learned batch:

```
┌─────────────────────────────┐
│ ←        Quick check  2/10   │  ← back + check progress (A), labeled "Quick check"
│                              │
│        frugal                │  ← word from this batch (B)
│                              │
│  Which meaning fits?         │  ← prompt (C)
│ ┌─────────────────────────┐ │
│ │ ( ) careful with money  │ │  ← option cards (D)
│ │ ( ) extremely generous  │ │
│ │ ( ) easily angered      │ │
│ └─────────────────────────┘ │
│        [   Check   ]         │  ← primary (E)
└─────────────────────────────┘
```

## 4. Anatomy

| Ref | Region | Component | Tokens | Content source |
|---|---|---|---|---|
| A | Check progress | Bar + counter + label | `accent`/`border.subtle`, `mono` | index / batch size |
| B | Word | Text `display` | `text.primary` | word from the batch |
| C | Prompt | Text `caption` | `text.tertiary` | static |
| D | Options | Option cards (MultipleChoice) | `bg.surface`, selected `accent` | def + distractors |
| E | Check | Primary button | `accent` | enabled after selection |

Distinguished from a graded quiz only by the "Quick check" label and the low-pressure framing; visually it is the standard widget set.

## 5. Data requirements

| Data | Source | Notes |
|---|---|---|
| Check items | derived from the just-learned batch | one per new word (or sampled) |
| Answer result | `AnswerQuestionUseCase` | feeds seeding, not punitive scoring |
| **SRS seed write** | `AnswerQuestionUseCase` (this screen triggers it on answer submission) | **Atomic Triple-Write (first and only SRS write in the Learn flow):** `AnswerQuestionUseCase` performs: (1) append row to `quiz_attempts` (append-only, never UPDATE/DELETE), (2) upsert `user_progress` with `mastery_level` and `next_review_date`, tagged `scheduler_version = 'v1-fixed'`, (3) insert into `event_log`. All three writes are in a single SQLite transaction. This is the SRS seed boundary from [ONBOARDING_FLOW_SPEC.md](../ONBOARDING_FLOW_SPEC.md) Stage 6. Seeds are initial inserts, not retroactive edits to history. |

Seeding rule per word: correct check → low-positive mastery + near interval; incorrect → mastery 0/1, reviewed very soon. These are **initial states**, not retroactive edits (append-only invariant holds).

## 6. States

| State | Trigger | Rendering |
|---|---|---|
| **Default** | Item loaded | Standard MultipleChoice; Check disabled until pick |
| **Submitted** | Check | Gentle feedback (reuses [QuizFeedbackStates.md](./QuizFeedbackStates.md)); seed written for that word |
| **Final item** | Last check | → Session Complete |
| **Exited early** | Back mid-check | Seed words answered so far; unanswered words still enter via normal first-review |

## 7. Interactions

| Element | Trigger | Result | Haptic |
|---|---|---|---|
| Option (D) | tap | Select | `selection` |
| Check (E) | tap | Evaluate, write seed + feedback | correct: soft success; incorrect: none |
| Continue (feedback) | tap | Next item or Session Complete | none |

## 8. Copy

| Key | String |
|---|---|
| label | "Quick check" |
| prompt | "Which meaning fits?" |
| btn.check | "Check" |

Framing stays encouraging — a miss here just means the word is reviewed sooner, never "you failed to learn it."

## 9. Accessibility

Inherits assessment-widget a11y (radio-group options, ≥48×48 targets, icon+copy feedback). "Quick check" label announced so the learner understands this is low-stakes.

## 10. Motion

Inherits widget + feedback motion (`motion.fast` select, `motion.base` feedback; Reduce Motion → cross-fade).

## 11. Acceptance criteria

- [ ] No `TextInput`; reuses existing assessment widgets + feedback layer.
- [ ] One check item per newly-learned word (or a documented sampling).
- [ ] Each answered word writes an initial `user_progress` row (mastery + `next_review_date`) tagged `scheduler_version`.
- [ ] Seeds are initial inserts, never retroactive edits to SRS history.
- [ ] Incorrect answers shorten the first interval rather than penalizing the learner.
- [ ] Completes into Session Complete (streak credit applies per that spec).

## 12. Open questions

- Whether every new word is checked or only a sample, to keep the check short (mirrors the onboarding confirm-on-Yes load question).
- Exact seed mastery/interval values — reasoned defaults, tune against beta data.
