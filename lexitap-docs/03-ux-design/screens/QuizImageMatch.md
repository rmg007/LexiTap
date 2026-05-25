---
title: Quiz — ImageMatch Spec
screen_id: quiz-imagematch
category: ux-design
status: planned
updated: 2026-05-24
priority: P2
phase: 4
tab: Quiz
target_file: mobile/src/presentation/components/assessments/ImageMatch.tsx
host_screen: mobile/src/presentation/screens/QuizScreen.tsx
related_flows: [daily-review-session]
tags: [screen, quiz, assessment, imagematch, phase-4]
---

# Quiz — ImageMatch

> AI-buildable spec. Tokens from [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md). **Phase 4 — deferred** ([PRODUCT_REQUIREMENTS_DOCUMENT.md](../../02-product-definition/PRODUCT_REQUIREMENTS_DOCUMENT.md)). No `TextInput`. Images are **functional context, never decorative cartoons/mascots** (brand rule).

## 1. Purpose

Recognition via visual context: present a prompted word/meaning and a grid of contextual images; the learner taps the image that best represents it. Strengthens form–meaning–image binding for concrete vocabulary.

## 2. Entry & exit

| Direction | From / To | Trigger |
|---|---|---|
| Enter | Home → Start review | Session serves an ImageMatch item (Phase 4 tiers) |
| Exit | Feedback State | Tap an image (auto-submit) or **Check** |
| Exit | Next / Session Complete | **Continue** |

## 3. Layout

```
┌─────────────────────────────┐
│ ←            ▓▓▓▓░░░  4/12   │  ← back + progress (A)
│                              │
│   Which shows "harvest"?     │  ← prompt (B) word or meaning
│   ♪                          │  ← audio (C), tier-dependent
│                              │
│  ┌────────┐  ┌────────┐      │  ← image grid (D), 2x2 or 3x2
│  │  img 1 │  │  img 2 │      │
│  └────────┘  └────────┘      │
│  ┌────────┐  ┌────────┐      │
│  │  img 3 │  │ (•)img4 │      │  ← selected = accent border
│  └────────┘  └────────┘      │
│                              │
│        [   Check   ]         │  ← primary (E)
├─────────────────────────────┤
│  ⌂Home  ▶Quiz  ▲Prog  ⚙Set  │
└─────────────────────────────┘
```

## 4. Anatomy

| Ref | Region | Component | Tokens | Content source |
|---|---|---|---|---|
| A | Progress | Bar + counter | `accent`/`border.subtle`, `mono` | session position |
| B | Prompt | Text `body.lg` | `text.primary` | prompted word/meaning |
| C | Audio | Icon button | `accent` | tier-dependent, optional |
| D | Image grid | 2×2 or 3×2 tappable image cells, `radius.md` | `bg.surface`, selected `accent` border | contextual images from `words.db` assets |
| E | Check | Primary button | `accent` | enabled after selection (or auto-submit on tap) |

## 5. Data requirements

| Data | Source | Notes |
|---|---|---|
| Prompt word/meaning | `StartQuizUseCase` | one correct image + distractors |
| Image assets | bundled `words.db` / asset bundle | functional, licensed; offline-available |
| Answer result + mastery | `AnswerQuestionUseCase` | append-only attempt + SRS write tagged `scheduler_version` |

## 6. States

| State | Trigger | Rendering |
|---|---|---|
| **Unanswered** | Loaded | No selection; Check disabled |
| **Selected** | Tap image | `accent` border; Check enabled |
| **Image load fail** | Asset missing | Cell shows neutral placeholder + alt text; item still answerable if ≥2 valid cells, else skip item |
| **Submitted** | Check / auto | → Feedback; chosen-correct `success`, chosen-incorrect `caution` + correct cell highlighted |
| **Audio unavailable** | Tier without audio | Hide audio glyph |

## 7. Interactions

| Element | Trigger | Result | Haptic |
|---|---|---|---|
| Image cell (D) | tap | Select (single) | `selection` |
| Audio (C) | tap | Play pronunciation | none |
| Check (E) | tap | Evaluate + write + feedback | correct: soft success; incorrect: none |

## 8. Copy

| Key | String |
|---|---|
| prompt | "Which shows \"{word}\"?" |
| btn.check | "Check" |

## 9. Accessibility

- Every image cell has a descriptive `alt` label; grid exposed as a `radiogroup`.
- Read order: progress → prompt → audio → image cells (row-major) → Check.
- Cells ≥ 48×48 with adequate spacing. Correctness via icon + copy, not color alone.
- Decorative-image ban also serves a11y: images carry real, describable meaning.

## 10. Motion

| Element | Animation | Duration |
|---|---|---|
| Selection | border fade | `motion.fast` |
| → Feedback | cross-fade | `motion.base` |
| Reduce Motion | cross-fade only | per a11y doc |

## 11. Acceptance criteria

- [ ] No `TextInput`.
- [ ] Grid is 2×2 or 3×2; exactly one correct image.
- [ ] All images are contextual/functional — no cartoons, mascots, or decorative illustration.
- [ ] Each image cell has an alt label and is reachable by screen reader.
- [ ] Missing-asset cells degrade gracefully without crashing the session.
- [ ] Submit writes append-only attempt + SRS update tagged `scheduler_version`.
- [ ] No red, no error haptic on incorrect.

## 12. Open questions

- Image sourcing/licensing pipeline and per-word coverage — owned by content pipeline.
- Whether tapping an image auto-submits or requires the explicit Check step (consistency with other widgets).
