---
title: Quiz — MultipleChoice Spec
screen_id: quiz-multiplechoice
category: ux-design
status: active
updated: 2026-05-24
priority: P0
tab: Quiz
target_file: mobile/src/presentation/components/assessments/MultipleChoice.tsx
host_screen: mobile/src/presentation/screens/QuizScreen.tsx
related_flows: [daily-review-session, learning-new-words]
tags: [screen, quiz, assessment, multiplechoice, mvp]
---

# Quiz — MultipleChoice

> AI-buildable spec. All visual values are token names from [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md). **Hard invariant: no `TextInput` anywhere in this component or `QuizScreen`** — interaction is tap only. The assessment widgets share a frame: prompt (top), interaction (middle), feedback (bottom).

## 1. Purpose

The MVP recognition widget. Present one word under study and 2–4 meaning options; the learner taps the meaning that fits, then submits. Drives SRS mastery on answer.

## 2. Entry & exit

| Direction | From / To | Trigger |
|---|---|---|
| Enter | Home → Start review | Review session loads due words |
| Enter | Learn Quick-Check | Post-learn encoding check |
| Exit | Feedback State (same screen) | Tap **Check** |
| Exit | Next question / Session Complete | Tap **Continue** in feedback |
| Exit | Home | Tap back (`←`), confirm-discard if mid-session |

## 3. Layout

```
┌─────────────────────────────┐
│ ←            ▓▓▓▓░░░  4/12   │  ← back (A) + session progress (B), no timer
│                              │
│        diligent              │  ← word under study (C), display type
│        /ˈdɪlɪdʒənt/   ♪      │  ← phonetic (D) + audio play (E, tier-dependent)
│                              │
│  Which meaning fits?         │  ← prompt caption (F)
│                              │
│ ┌─────────────────────────┐ │
│ │ ( ) careless and lazy   │ │  ← option card (G), min height 56
│ ├─────────────────────────┤ │
│ │ (•) hard-working and    │ │  ← selected = accent border
│ │     careful             │ │
│ ├─────────────────────────┤ │
│ │ ( ) extremely wealthy   │ │
│ └─────────────────────────┘ │
│                              │
│        [   Check   ]         │  ← primary (H), enabled once option picked
├─────────────────────────────┤
│  ⌂Home  ▶Quiz  ▲Prog  ⚙Set  │
└─────────────────────────────┘
```

## 4. Anatomy

| Ref | Region | Component | Tokens | Content source |
|---|---|---|---|---|
| A | Back | Icon button | `text.secondary` | nav |
| B | Session progress | Progress bar + counter `mono` | fill `accent`, track `border.subtle` | current index / session length |
| C | Word | Text `display` | `text.primary` | current word lemma |
| D | Phonetic | Text `body`, IPA | `text.secondary` | word phonetic (nullable) |
| E | Audio play | Icon button (glyph `♪`) | `accent` | audio asset; **only on tiers with pronunciation** (e.g. TOEFL) |
| F | Prompt | Text `caption` | `text.tertiary` | static "Which meaning fits?" |
| G | Option card | Tappable card, min height 56, `radius.md` | `bg.surface`, selected `accent` border | 2–4 options (1 correct + distractors) |
| H | Check | Primary button | `accent` | enabled only after a selection |

## 5. Data requirements

| Data | Source | Notes |
|---|---|---|
| Word + definition + distractors | `StartQuizUseCase` → question model | 2–4 options; distractors plausible, same part-of-speech where possible |
| Phonetic / audio asset | bundled `words.db` | audio glyph hidden when tier lacks pronunciation |
| Answer result + mastery write | `AnswerQuestionUseCase` | writes `quiz_attempts` (append-only) + SRS update tagged `scheduler_version` |
| Session position | `QuizSession` (domain) | drives progress bar; no timer |

## 6. States

| State | Trigger | Rendering |
|---|---|---|
| **Unanswered** | Question loaded, no pick | Check disabled; options unselected |
| **Option selected** | Tap an option | Selected card `accent` border; Check enabled |
| **Submitted — correct** | Check, answer correct | → Feedback (correct) — see [QuizFeedbackStates.md](./QuizFeedbackStates.md) |
| **Submitted — incorrect** | Check, answer wrong | → Feedback (gentle correction) |
| **Audio unavailable** | Tier without pronunciation | Hide audio glyph (E) entirely; no disabled affordance |
| **Last question** | Submit on final item | Continue → Session Complete |

## 7. Interactions

| Element | Trigger | Result | Haptic |
|---|---|---|---|
| Option card (G) | tap | Select (single-select); previously selected deselects | `selection` |
| Audio (E) | tap | Play pronunciation | none |
| Check (H) | tap | Evaluate, write attempt + SRS, reveal feedback | success: soft success; incorrect: **none** (no error haptic) |
| Back (A) | tap | If mid-session, confirm discard; else return | none |

## 8. Copy

| Key | String |
|---|---|
| prompt | "Which meaning fits?" |
| btn.check | "Check" |
| counter | "{index}/{total}" |

No scolding language anywhere. Distractor options are neutral, never joke answers.

## 9. Accessibility

- Read order: progress → word → phonetic → audio → prompt → options (in order) → Check.
- Options are `radio`-role within a group; selection announced.
- Each option ≥ 48×48 (card min height 56 satisfies). Audio button labeled "Play pronunciation".
- No color-only correctness — handled in Feedback States via icon + copy.

## 10. Motion

| Element | Animation | Duration |
|---|---|---|
| Option select | border fade | `motion.fast` (120ms) |
| Question → feedback | cross-fade | `motion.base` (220ms) |
| Reduce Motion | cross-fade only | per a11y doc |

## 11. Acceptance criteria

- [ ] No `TextInput` rendered in this component or `QuizScreen`.
- [ ] 2–4 options; exactly one correct; single-select.
- [ ] Check is disabled until a selection exists.
- [ ] Audio glyph appears only when the active tier includes pronunciation.
- [ ] Progress shows position, never a countdown timer.
- [ ] Submitting writes an append-only `quiz_attempts` row and an SRS update tagged with `scheduler_version`.
- [ ] Correct → soft success haptic; incorrect → no error haptic, no red.
- [ ] Options reachable and announced in order by screen reader.

## 12. Open questions

- Audio autoplay-on-reveal vs strictly tap-to-play on pronunciation tiers.
- Distractor-generation source (hand-authored vs derived) — owned by content pipeline.
