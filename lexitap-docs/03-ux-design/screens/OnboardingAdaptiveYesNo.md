---
title: Onboarding — Adaptive Yes/No Spec
screen_id: onboarding-adaptive-yesno
category: ux-design
status: active
updated: 2026-05-24
priority: P0
tab: null
target_file: mobile/src/presentation/screens/onboarding/OnboardingDiagnosticScreen.tsx
related_flows: [first-launch-onboarding-and-diagnostic]
tags: [screen, onboarding, diagnostic, adaptive, yes-no, pseudo-word, staircase]
critical_path: true
---

# Onboarding — Adaptive Yes/No

> AI-buildable spec. Tokens from [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md). The diagnostic core loop: per-item "Do you know this word?" with a confirm-on-Yes check. Implements the simplified-adaptive band-walk + pseudo-word overclaim detection + SE-based stopping (Stages 2–4, [ONBOARDING_FLOW_SPEC.md](../ONBOARDING_FLOW_SPEC.md)). No typing — every response is a tap.

## 1. Purpose

Estimate the learner's vocabulary frontier (a frequency rank) in ~10–25 tap items by walking up/down frequency bands, while resisting overclaiming via pseudo-words. Output feeds the Knowledge Map and SRS seeding.

## 2. Entry & exit

| Direction | From / To | Trigger |
|---|---|---|
| Enter | Onboarding — Self-Segment | Continue (sets starting band) |
| Enter | Splash (resume) | Quit mid-diagnostic → resume at last item |
| Exit | Onboarding — Knowledge Map Reveal | SE threshold met OR item cap (25), min 10 items |

## 3. Layout

```
┌─────────────────────┐
│ Do you know this?   │  ← prompt (A)
│                     │
│     ubiquitous      │  ← word (B), display type
│                     │
│  [ No ]    [ Yes ]  │  ← Yes/No (C)
│                     │
│   ●●●○○ ~item 3/~15 │  ← approximate progress (D), not a hard count
└─────────────────────┘

CONFIRM-ON-YES (fast 3-option meaning check)
┌─────────────────────┐
│ Quick check:        │
│ ubiquitous means…   │
│ ( ) found everywhere│  ← 3 options (E)
│ ( ) rarely seen     │
│ ( ) very expensive  │
└─────────────────────┘
```

## 4. Anatomy

| Ref | Region | Component | Tokens | Content source |
|---|---|---|---|---|
| A | Prompt | Text `headline` | `text.primary` | static "Do you know this?" |
| B | Word | Text `display` | `text.primary` | word drawn from target band (real or pseudo) |
| C | Yes/No | Two large tap buttons | `bg.surface.raised`, `accent` on press | self-claim |
| D | Progress | Approximate dots + caption | `text.tertiary`, `mono` | approximate position (ends on SE, not fixed) |
| E | Confirm check | 3-option MultipleChoice | `bg.surface`, selected `accent` | meaning options for the claimed word |

## 5. Data & engine requirements

| Concern | Behavior |
|---|---|
| **Two-step item** | (1) Self-claim Yes/No. (2) On **Yes**, show a fast 3-option meaning check. Correct check → confirmed-known; incorrect → "claimed but not known" (counts against self-report). **No** skips the check (trust "I don't know"). |
| **Band-walk** | Maintain difficulty pointer = frequency rank. Confirmed-known → harder band (rank += step). Not-known (No, or Yes+failed) → easier band (rank −= step). **Step halves on each direction reversal** (staircase). Draw the word randomly from within the target band. |
| **Pseudo-words** | Seed 2–3 plausible non-words mid-sequence, presented identically to real words — same font, same size, same card styling, NOT visually flagged in any way. A confident Yes on a pseudo-word = false alarm. Apply signal-detection correction: 0 FA → none; 1/3 → modest discount; 2–3/3 → strong discount, cap estimate low. **Identifying a pseudo-word as "No / Don't know this" is the correct and expected behavior — it is not an error.** Visual flagging of pseudo-words would tip off the learner and invalidate the overclaim detection entirely. A coding agent must render pseudo-words with zero visual differentiation from real words. Pseudo-words never count toward "known" total. |
| **Stopping** | Stop when staircase bracket width < SE threshold OR item cap 25, whichever first. **Minimum 10 items.** |
| **Output** | Estimated frontier rank (+ pseudo-correction), and per-item results → SRS seeding (Stage 6) and Knowledge Map (Stage 5). |
| **Persistence** | Persist answered items continuously for mid-diagnostic resume. |

Words/pseudo-words come from bundled `words.db` + a vetted pseudo-word library (content pipeline).

## 6. States

| State | Trigger | Rendering |
|---|---|---|
| **Self-claim** | Item shown | Word + Yes/No; approximate progress |
| **Confirm-on-Yes** | Tapped Yes | 3-option meaning check; tap an option |
| **No claim** | Tapped No | Skip check; advance (treated not-known) |
| **Pseudo-word** | Item is a pseudo-word | Rendered identically; Yes = false alarm signal |
| **Converged** | Bracket < SE threshold (≥10 items) | Advance to Knowledge Map Reveal |
| **Item cap** | 25 items without convergence | Use best central bracket estimate; widen Learning band; advance |
| **Quit/resume** | App closed mid-diagnostic | Persist; resume at next unanswered item |
| **All pseudo-words failed** | Claims to know non-words | Weight No/failed signals; cap known estimate low; honest (un-inflated) Map |

## 7. Interactions

| Element | Trigger | Result | Haptic |
|---|---|---|---|
| Yes (C) | tap | Trigger confirm-on-Yes check | `selection` |
| No (C) | tap | Record not-known; band-walk easier; next item | `selection` |
| Check option (E) | tap | Correct → confirmed-known (harder); wrong → claimed-not-known (easier) | `selection` |

No correctness "feedback theater" here — it's placement, not a graded quiz. Keep transitions quick and neutral.

## 8. Copy

| Key | String |
|---|---|
| prompt | "Do you know this word?" |
| btn.yes | "Yes" |
| btn.no | "No" |
| check.prompt | "Quick check: {word} means…" |
| progress | "~item {i}/~{est}" |

Framing: "let's find your starting point" — never a test you can fail.

## 9. Accessibility

- Yes/No are large labeled buttons; meaning-check options form a `radiogroup`.
- Approximate progress announced as approximate ("about item 3 of 15"), not a hard fraction.
- Pseudo-words must be screen-reader pronounceable but carry no special label (parity with sighted users) — see [ACCESSIBILITY_REQUIREMENTS.md](../ACCESSIBILITY_REQUIREMENTS.md).
- Targets ≥ 48×48.

## 10. Motion

| Element | Animation | Duration |
|---|---|---|
| Item → next item | quick cross-fade | `motion.fast` (120ms) |
| Reduce Motion | instant swap | per a11y doc |

Keep motion minimal — the celebratory beat is reserved for the Knowledge Map reveal.

## 11. Acceptance criteria

- [ ] Tap-only; no `TextInput`.
- [ ] Two-step item: Yes triggers a 3-option meaning check; No skips it.
- [ ] Band-walk uses a halving-step staircase on frequency rank; words drawn randomly within the target band.
- [ ] 2–3 pseudo-words seeded mid-sequence, visually indistinguishable; false alarms apply the documented signal-detection discount.
- [ ] Pseudo-words never count toward the "known" total.
- [ ] Stops on SE/bracket threshold OR 25-item cap, with a 10-item minimum.
- [ ] Answered items persist for mid-diagnostic resume.
- [ ] Output frontier rank + per-item results feed SRS seeding and the Knowledge Map.
- [ ] Framing is non-punitive throughout.

## 12. Open questions

- Confirm-on-Yes load: meaning-check on every Yes vs sampling, to keep the diagnostic short.
- Exact thresholds (starting ranks, step sizes, SE/bracket threshold) — tune against beta.
- Pseudo-word library composition (must not be real words in major L1s of the audience).
