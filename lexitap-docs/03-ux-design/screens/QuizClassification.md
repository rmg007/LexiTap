---
title: Quiz — Classification Spec
screen_id: quiz-classification
category: ux-design
status: planned
updated: 2026-05-24
priority: P2
phase: 4
tab: Quiz
target_file: mobile/src/presentation/components/assessments/Classification.tsx
host_screen: mobile/src/presentation/screens/QuizScreen.tsx
related_flows: [daily-review-session]
tags: [screen, quiz, assessment, classification, phase-4]
---

# Quiz — Classification

> AI-buildable spec. Tokens from [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md). **Phase 4 — deferred.** No `TextInput`. Sort via drag, with a tap-to-place fallback.

## 1. Purpose

Sort word/idiom/phrasal-verb chips into 2–3 labeled category buckets. Tests deeper semantic grouping (e.g. connotation, register, theme, part of speech).

## 2. Entry & exit

| Direction | From / To | Trigger |
|---|---|---|
| Enter | Home → Start review | Session serves a Classification item (Phase 4 tiers) |
| Exit | Feedback State | Tap **Check** |
| Exit | Next / Session Complete | **Continue** |

## 3. Layout

```
┌─────────────────────────────┐
│ ←            ▓▓▓▓░░░  6/12   │  ← back + progress (A)
│                              │
│  Sort by connotation         │  ← prompt (B)
│                              │
│  ┌ thrifty ┐ ┌ stingy ┐      │  ← word chips (C), radius.full
│  ┌ lavish ┐ ┌ frugal ┐       │
│                              │
│  ┌───────────┐ ┌───────────┐ │  ← category buckets (D), 2–3
│  │ POSITIVE  │ │ NEGATIVE  │ │
│  │  ⤓        │ │  ⤓        │ │
│  └───────────┘ └───────────┘ │
│                              │
│        [   Check   ]         │  ← primary (E), enabled when all sorted
├─────────────────────────────┤
│  ⌂Home  ▶Quiz  ▲Prog  ⚙Set  │
└─────────────────────────────┘
```

## 4. Anatomy

| Ref | Region | Component | Tokens | Content source |
|---|---|---|---|---|
| A | Progress | Bar + counter | `accent`/`border.subtle`, `mono` | session position |
| B | Prompt | Text `caption` | `text.tertiary` | classification dimension |
| C | Word chips | Draggable chip, `radius.full` | `bg.surface.raised` | items to sort |
| D | Buckets | Labeled drop bucket, dashed `border.subtle` | `bg.surface.sunken` | 2–3 categories |
| E | Check | Primary button | `accent` | enabled when every chip sorted |

## 5. Data requirements

| Data | Source | Notes |
|---|---|---|
| Items + correct bucket map | `StartQuizUseCase` | 2–3 buckets; each chip has one correct bucket |
| Answer result + mastery | `AnswerQuestionUseCase` | append-only attempt + SRS write tagged `scheduler_version`; partial-credit policy in Open Questions |
| Session position | `QuizSession` | progress |

## 6. States

| State | Trigger | Rendering |
|---|---|---|
| **Idle** | Loaded | Chips in tray; buckets empty; Check disabled |
| **Sorting** | Chip pickup | Chip lifts; valid buckets highlight `accent` |
| **Partially sorted** | Some chips placed | Check disabled |
| **All sorted** | Every chip in a bucket | Check enabled |
| **Submitted** | Check | → Feedback; correctly-placed chips `success`, misplaced `caution` + correct bucket indicated |
| **VoiceOver / Reduce Motion** | a11y | Tap-to-place fallback |

## 7. Interactions

| Element | Trigger | Result | Haptic |
|---|---|---|---|
| Chip (C) | drag start | Lift + highlight buckets | `selection` |
| Chip → bucket (D) | release over bucket | Snap-in + settle | `selection` |
| Chip → invalid | release off-target | Return to tray | none |
| Check (E) | tap | Evaluate + write + feedback | correct: soft success; incorrect: none |

## 8. Copy

| Key | String |
|---|---|
| prompt | "Sort by {dimension}" (e.g. "Sort by connotation") |
| btn.check | "Check" |

## 9. Accessibility

- **Tap-to-place fallback required** (same pattern as DragDrop): tap chip to select, tap bucket to place.
- Buckets labeled; placement announced ("POSITIVE: thrifty placed").
- Targets ≥ 48×48; correctness via icon + copy.

## 10. Motion

| Element | Animation | Duration |
|---|---|---|
| Chip lift / snap | scale + settle | `motion.fast` / `motion.base` |
| Reduce Motion | instant placement, cross-fade feedback | per a11y doc |

## 11. Acceptance criteria

- [ ] No `TextInput`.
- [ ] 2–3 buckets; every chip has exactly one correct bucket.
- [ ] Check disabled until all chips sorted.
- [ ] Drag works AND tap-to-place fallback exists.
- [ ] Submit writes append-only attempt + SRS update tagged `scheduler_version`.
- [ ] No red, no error haptic on incorrect; misplaced chips corrected, not scolded.

## 12. Open questions

- Scoring: all-or-nothing vs per-chip partial credit, and how partial maps to a single SRS mastery delta per word.
- Max chips/buckets before layout overflows on small phones.
