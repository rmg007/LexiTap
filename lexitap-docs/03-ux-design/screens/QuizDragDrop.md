---
title: Quiz — DragDrop Spec
screen_id: quiz-dragdrop
category: ux-design
status: active
updated: 2026-05-24
priority: P0
tab: Quiz
target_file: mobile/src/presentation/components/assessments/DragDrop.tsx
host_screen: mobile/src/presentation/screens/QuizScreen.tsx
related_flows: [daily-review-session]
tags: [screen, quiz, assessment, dragdrop, mvp]
---

# Quiz — DragDrop

> AI-buildable spec. Tokens from [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md). No `TextInput`. Drag must have a tap-accessible fallback (see Accessibility).

## 1. Purpose

MVP matching widget. The learner drags word chips onto their matching meaning drop-zones. Tests recognition through association rather than single-choice.

## 2. Entry & exit

| Direction | From / To | Trigger |
|---|---|---|
| Enter | Home → Start review | Review session serves a DragDrop item |
| Exit | Feedback State | Tap **Check** |
| Exit | Next question / Session Complete | **Continue** |
| Exit | Home | Back, confirm-discard if mid-session |

## 3. Layout

```
┌─────────────────────────────┐
│ ←            ▓▓▓▓▓░░  5/12   │  ← back + progress (A)
│                              │
│  Match each word to its      │  ← prompt (B)
│  meaning                     │
│                              │
│  ┌ candid ┐ ┌ frugal ┐       │  ← draggable chips (C), radius.full
│  └────────┘ └────────┘       │
│                              │
│  ┌─────────────────────────┐ │
│  │ honest, direct  [  ⤓  ] │ │  ← drop zone (D), sunken + dashed
│  ├─────────────────────────┤ │
│  │ careful with money [ ⤓ ]│ │
│  └─────────────────────────┘ │
│                              │
│        [   Check   ]         │  ← primary (E), enabled when all placed
├─────────────────────────────┤
│  ⌂Home  ▶Quiz  ▲Prog  ⚙Set  │
└─────────────────────────────┘
```

## 4. Anatomy

| Ref | Region | Component | Tokens | Content source |
|---|---|---|---|---|
| A | Progress | Progress bar + counter | `accent` / `border.subtle`, `mono` | session position |
| B | Prompt | Text `caption` | `text.tertiary` | static |
| C | Word chips | Draggable chip, `radius.full` | `bg.surface.raised` | 2–4 words |
| D | Drop zones | Labeled zone, dashed `border.subtle` | `bg.surface.sunken` | matching meanings |
| E | Check | Primary button | `accent` | enabled when every chip placed |

## 5. Data requirements

| Data | Source | Notes |
|---|---|---|
| Word→meaning pairs | `StartQuizUseCase` | 2–4 pairs; meanings shuffled relative to chips |
| Answer result + mastery | `AnswerQuestionUseCase` | append-only attempt + SRS write tagged `scheduler_version` |
| Session position | `QuizSession` | progress bar |

## 6. States

| State | Trigger | Rendering |
|---|---|---|
| **Idle** | Loaded | Chips in tray; zones empty; Check disabled |
| **Dragging** | Chip pickup | Chip lifts (scale 1.04 + shadow); valid zone shows `accent` border |
| **Partially placed** | Some chips placed | Check still disabled |
| **All placed** | Every chip in a zone | Check enabled |
| **Submitted** | Check | → Feedback; correct pairs `success`, wrong pairs gentle `caution` + correct mapping shown |
| **Reduce Motion / VoiceOver** | a11y mode | Tap-to-place fallback active (see §9) |

## 7. Interactions

| Element | Trigger | Result | Haptic |
|---|---|---|---|
| Chip (C) | drag start | Lift + highlight valid targets | `selection` |
| Chip → zone (D) | release over valid zone | Snap-to + settle animation | `selection` |
| Chip → invalid | release off-target | Return to tray | none |
| Chip (C) | tap (a11y/no-drag) | Select chip for placement; announce "picked up {word}" | `selection` |
| Zone (D) | tap (with selected chip) | Settle chip in zone; announce "placed {word} in {meaning}" | `selection` |
| Check (E) | tap | Evaluate, write attempt + SRS, feedback | correct: soft success; incorrect: none |

## 8. Copy

| Key | String |
|---|---|
| prompt | "Match each word to its meaning" |
| btn.check | "Check" |

## 9. Accessibility

- **Tap fallback (required):** tap a chip to "pick up" (announced "picked up {word}"), then tap a drop zone to place (announced "placed {word} in {meaning}"). No drag dependency for VoiceOver/TalkBack ([ACCESSIBILITY_REQUIREMENTS.md](../ACCESSIBILITY_REQUIREMENTS.md)).
- Drop zones labeled with their meaning text; placement state announced ("placed {word} in {meaning}").
- Audio: N/A (this matching widget is strictly visual and does not have an audio autoplay path).
- Targets ≥ 48×48. Correctness conveyed by icon + copy, not color alone.

## 10. Motion

| Element | Animation | Duration |
|---|---|---|
| Chip lift | scale 1.04 + shadow | `motion.fast` |
| Snap-to settle | spring settle | `motion.base` |
| Reduce Motion | instant placement, cross-fade feedback | per a11y doc |

## 11. Acceptance criteria

- [ ] No `TextInput`.
- [ ] 2–4 word/meaning pairs; meanings shuffled vs chip order.
- [ ] Check disabled until all chips placed.
- [ ] Drag works AND a tap-to-place fallback exists for screen readers.
- [ ] Valid drop target highlights `accent`; invalid release returns chip to tray.
- [ ] Submit writes append-only attempt + SRS update tagged `scheduler_version`.
- [ ] No red, no error haptic on incorrect.

## 12. Open questions

- Max pair count before the zone list scrolls on small devices — confirm 4 is the cap.
