---
title: Quiz — Feedback States Spec
screen_id: quiz-feedback-states
category: ux-design
status: active
updated: 2026-05-24
priority: P0
tab: Quiz
target_file: mobile/src/presentation/screens/QuizScreen.tsx
related_flows: [daily-review-session]
tags: [screen, quiz, feedback, correct, gentle-correction, no-guilt]
---

# Quiz — Feedback States

> AI-buildable spec. Tokens from [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md). Shared post-answer feedback layer for ALL assessment widgets. **No alarm red, no error haptic, no "wrong!" language** — locked decision ([SRS_FORGIVENESS_MECHANICS.md](../../02-product-definition/SRS_FORGIVENESS_MECHANICS.md)). There is intentionally no `error.red` token in the assessment path.

## 1. Purpose

The bottom-of-frame feedback area shown after the learner submits an answer in any widget. Two states: **Correct** (affirm + advance) and **Gentle Correction** (teach the right answer warmly, re-queue the word). Three redundant channels — color, icon, copy — so feedback never relies on color alone.

## 2. Entry & exit

| Direction | From / To | Trigger |
|---|---|---|
| Enter | Any assessment widget | Tap **Check** |
| Exit | Next question | **Continue** (more items remain) |
| Exit | Session Complete | **Continue** on final item |

## 3. Layout

```
CORRECT                          GENTLE CORRECTION
┌─────────────────────────┐      ┌─────────────────────────┐
│ ✓ hard-working and      │      │ – careless and lazy     │  ← your pick (caution
│   careful   (success)   │      │                         │     fill + dash, NO red X)
│                         │      │ ✓ hard-working and      │  ← correct shown (success)
│ Nice — locked in.       │      │   careful               │
│                         │      │                         │
│      [ Continue ]       │      │ Close — this one means  │  ← teaching copy
└─────────────────────────┘      │ "hard-working." You'll  │
                                 │ see it again soon.      │
                                 │      [ Continue ]       │
                                 └─────────────────────────┘
```

## 4. Anatomy

| Ref | Region | Component | Tokens | Content source |
|---|---|---|---|---|
| — | Chosen-correct row | Row + check icon | `success` text, `success.subtle` fill | learner's answer (correct case) |
| — | Chosen-incorrect row | Row + dash icon | `caution` text, `caution.subtle` fill | learner's answer (wrong case) |
| — | Correct-answer row | Row + check icon | `success` | the right answer (shown in correction) |
| — | Affirm/teach copy | Text `body` | `text.primary` / `text.secondary` | per state |
| — | Continue | Primary button | `accent` | static |

## 5. Data requirements

| Data | Source | Notes |
|---|---|---|
| Was-correct boolean | `AnswerQuestionUseCase` result | selects state |
| Chosen answer + correct answer | question model | rendered in both rows |
| Short gloss | word definition | drives teaching copy in correction |
| Atomic SRS Write | `AnswerQuestionUseCase` → Transaction | Atomically: (1) INSERT `quiz_attempts` (append-only), (2) UPDATE `user_progress` (`mastery_level` ±1, `next_review_date` calculation, `scheduler_version = 'v1-fixed'`). Tagged with `occurred_at` in user's timezone. |

No new fetch — feedback renders from the just-evaluated answer.

## 6. States

| State | Trigger | Rendering |
|---|---|---|
| **Correct** | Answer correct | Single success row + affirm copy; mastery +1; next review pushed out |
| **Gentle correction** | Answer wrong | Chosen row (`caution` + dash), correct row (`success` + check), teaching copy; mastery −1; word re-queued sooner |
| **Final item** | Submit on last question | Continue label routes to Session Complete |

Hard rule: never render a red X, alarm color, or scolding copy. The dash icon + caution fill is the only "not-correct" visual.

## 7. Interactions

| Element | Trigger | Result | Haptic | Timing / Delay |
|---|---|---|---|---|
| Reveal (correct) | auto on Check | Show success feedback | soft success | 0ms (immediate reveal) |
| Reveal (incorrect) | auto on Check | Show gentle correction | **none** | 0ms (immediate reveal) |
| Continue | tap | Advance to next item or Session Complete | none | 0ms (instant shift) |

## 8. Copy

| Key | String | Notes |
|---|---|---|
| correct.affirm.1 | "Nice — locked in." | Copy bank variant 1 |
| correct.affirm.2 | "Got it." | Copy bank variant 2 |
| correct.affirm.3 | "Excellent." | Copy bank variant 3 |
| correct.affirm.4 | "Spot on." | Copy bank variant 4 |
| correct.affirm.5 | "Keep it up." | Copy bank variant 5 |
| correction.lead | "Close — this one means \"{gloss}\"." | |
| correction.requeue | "You'll see it again soon." | |
| btn.continue | "Continue" | |

Banned: "Wrong", "Incorrect", "X", "Try again!" (scolding), any red. Copy rotates randomly from the `correct.affirm` bank to prevent fatigue.

## 9. Accessibility

- Feedback announced via three channels: the icon has a text label ("Correct" / "Not quite"), color is secondary, copy is explicit.
- Screen reader reads: outcome → your answer → correct answer (if correction) → teaching copy → Continue.
- Continue ≥ 48×48 and is the focused element after reveal.

## 10. Motion

| Element | Animation | Duration |
|---|---|---|
| Feedback reveal | fade/slide up from frame bottom | `motion.base` (220ms) |
| Reduce Motion | cross-fade | per a11y doc |

No celebratory burst even on correct — affirmation is calm.

## 11. Acceptance criteria

- [ ] No `error.red`, no red X, no error haptic anywhere in this layer.
- [ ] Correct and incorrect both convey state via icon + copy, not color alone.
- [ ] Gentle correction always shows the correct answer and a teaching gloss.
- [ ] Correct → mastery +1, interval extended; incorrect → mastery −1, re-queued sooner.
- [ ] Continue advances to the next item, or Session Complete on the final item.
- [ ] Works identically across MultipleChoice, DragDrop, ImageMatch, Classification.

## 12. Open questions

- (None. Copy bank rotation and timing are now specified.)
