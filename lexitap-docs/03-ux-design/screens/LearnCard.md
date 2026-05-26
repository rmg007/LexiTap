---
title: Learn Card Spec
screen_id: learn-card
category: ux-design
status: active
updated: 2026-05-24
priority: P1
tab: Quiz
target_file: TBD
related_flows: [learning-new-words]
tags: [screen, learn, new-words, first-exposure, no-pressure]
---

# Learn Card

> AI-buildable spec. Tokens from [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md). First exposure to a new word — **no test pressure**. The learner reads, optionally hears it, and taps "Got it" to advance. Folds new words into the SRS after the batch via [LearnQuickCheck.md](./LearnQuickCheck.md).

## 1. Purpose

Introduce new vocabulary from the active tier one card at a time before any assessment. Low-pressure encoding: word, definition, example sentence, audio (tier-dependent), optional contextual image.

## 2. Entry & exit

| Direction | From / To | Trigger |
|---|---|---|
| Enter | Home → Learn new words | `getNewWords` returns a batch (default 10) |
| Enter | Quiz → empty review queue | Suggested next step |
| Exit | Next card | **Got it** (more cards in batch) |
| Exit | Learn Quick-Check | **Got it** on final card |
| Exit | Home | Back, mid-batch progress kept |

## 3. Layout

```
┌─────────────────────────────┐
│ ←            ▓▓▓░░░░  3/10   │  ← back + batch progress (A)
│                              │
│         frugal               │  ← word (B), display type
│         /ˈfruːɡl/      ♪      │  ← phonetic (C) + audio (D), tier-dependent
│                              │
│   adjective                  │  ← part of speech (E)
│   careful with money;        │  ← definition (F), body.lg
│   not wasteful               │
│                              │
│   "She stayed frugal even    │  ← example sentence (G)
│   after winning."            │
│                              │
│   [ contextual image ]       │  ← optional image (H), functional
│                              │
│        [   Got it   ]        │  ← primary (I) → next
└─────────────────────────────┘
```

## 4. Anatomy

| Ref | Region | Component | Tokens | Content source |
|---|---|---|---|---|
| A | Batch progress | Bar + counter | `accent`/`border.subtle`, `mono` | index / batch size |
| B | Word | Text `display` | `text.primary` | new word lemma |
| C | Phonetic | Text `body` IPA | `text.secondary` | phonetic (nullable) |
| D | Audio | Icon button | `accent` | tier-dependent, optional |
| E | Part of speech | Text `caption` | `text.tertiary` | word POS |
| F | Definition | Text `body.lg` | `text.secondary` | definition |
| G | Example | Text `body`, italic | `text.secondary` | example sentence (nullable) |
| H | Image | Image, `radius.md` | `bg.surface` | contextual, functional (nullable) |
| I | Got it | Primary button | `accent` | static |

## 5. Data requirements

| Data | Source | Notes |
|---|---|---|
| New-word batch | `getNewWords` use case | default 10, from active tier; filter `deleted_at IS NULL` |
| Word fields (def, example, POS, phonetic, audio, image) | bundled `words.db` | nullable fields hidden when absent |
| Initial mastery seed | Written *only* after completing the subsequent [LearnQuickCheck.md](./LearnQuickCheck.md) diagnostic. First exposure does *not* write SRS rows to `user.db`. This boundary is strict; the transition to the Quick-Check is the atomic SRS seed boundary. |

## 6. States

| State | Trigger | Rendering |
|---|---|---|
| **Default** | Card loaded | All available fields shown; missing fields omitted (no empty labels) |
| **Audio unavailable** | Tier without audio | Hide audio glyph |
| **No example/image** | Field null | Omit that block; layout reflows |
| **Final card** | Last in batch | Got it routes to Quick-Check |
| **Tier exhausted** | `getNewWords` == 0 | Don't enter; Home shows upgrade/next-tier nudge instead |
| **Resumed batch** | Re-enter after partial | Resume at next unseen card |

## 7. Interactions

| Element | Trigger | Result | Haptic |
|---|---|---|---|
| Got it (I) | tap | Advance to next card, or Quick-Check on last | none |
| Audio (D) | tap | Play pronunciation | none |
| Back (A) | tap | Return Home; keep batch progress | none |

## 8. Copy

| Key | String |
|---|---|
| btn.gotit | "Got it" |
| counter | "{index}/{total}" |

No quiz framing — this is reading, not testing. No "memorize this" pressure copy.

## 9. Accessibility

- Read order: progress → word → phonetic → audio → POS → definition → example → image (alt) → Got it.
- Image has descriptive alt text; audio button labeled "Play pronunciation".
- Got it ≥ 48×48 and focused on card load.

## 10. Motion

| Element | Animation | Duration |
|---|---|---|
| Card → next card | slide/cross-fade | `motion.base` (220ms) |
| Reduce Motion | cross-fade | per a11y doc |

## 11. Acceptance criteria

- [ ] No `TextInput`; no assessment on the learn card itself (first exposure is pressure-free).
- [ ] Batch defaults to 10 words from the active tier, filtered `deleted_at IS NULL`.
- [ ] Nullable fields (example, image, audio, phonetic) gracefully omitted.
- [ ] Audio glyph only on pronunciation tiers.
- [ ] **SRS Boundary Invariant:** Strictly no SRS row is written in this screen. The transition to the Quick-Check is the atomic seed boundary.
- [ ] Final card routes to Learn Quick-Check.
- [ ] Partial batch resumes at the next unseen card.

## 12. Open questions

- Batch size configurability (fixed 10 vs user-adjustable) — confirm against onboarding pacing.
- Whether to allow swipe-back to re-read a previous card within a batch.
