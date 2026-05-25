---
title: Onboarding — Self-Segment Spec
screen_id: onboarding-self-segment
category: ux-design
status: active
updated: 2026-05-24
priority: P0
tab: null
target_file: mobile/src/presentation/screens/onboarding/
related_flows: [first-launch-onboarding-and-diagnostic]
tags: [screen, onboarding, self-segmentation, diagnostic, placement]
---

# Onboarding — Self-Segment

> AI-buildable spec. Tokens from [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md). Tap-only screen that sets the diagnostic's **starting frequency band** (Stage 1, [ONBOARDING_FLOW_SPEC.md](../ONBOARDING_FLOW_SPEC.md)). Self-report is a prior, not ground truth — the adaptive walk and pseudo-words correct it.

## 1. Purpose

Let the learner pick a rough starting level so the diagnostic doesn't waste items establishing it. Maps each choice to a starting frequency rank.

## 2. Entry & exit

| Direction | From / To | Trigger |
|---|---|---|
| Enter | Onboarding — Value | Get started |
| Exit | Onboarding — Adaptive Y/N | Tap **Continue** with a selection |

## 3. Layout

```
┌─────────────────────┐
│ Where are you with   │  ← prompt (A)
│ English?             │
│                      │
│ ( ) Just starting    │  ← options (B), single-select
│ ( ) I get by         │
│ (•) I'm advanced     │
│ ( ) Prepping a test  │
│                      │
│   [   Continue   ]   │  ← primary (C)
└─────────────────────┘
```

## 4. Anatomy

| Ref | Region | Component | Tokens | Content source |
|---|---|---|---|---|
| A | Prompt | Text `headline` | `text.primary` | static |
| B | Options | Single-select option cards | `bg.surface`, selected `accent` border | 4 fixed options |
| C | Continue | Primary button | `accent` | enabled after a selection |

## 5. Data requirements

| Selection | Starting band (frequency rank) | Side effect |
|---|---|---|
| "Just starting" | ~rank 500 (high-frequency, easy) | — |
| "I get by" | ~rank 1,500 | — |
| "I'm advanced" | ~rank 4,000 | — |
| "Prepping for a test" | ~rank 4,000 | flags test interest for later (soft) tier suggestion |

Output: a starting difficulty pointer (frequency rank) handed to the Adaptive Y/N stage. Treated as a prior only.

## 6. States

| State | Trigger | Rendering |
|---|---|---|
| **Unselected** | Loaded | No option chosen; Continue disabled |
| **Selected** | Tap option | `accent` border; Continue enabled |
| **Skipped onboarding entirely** | User bypasses | Fall back to flat placement at the chosen/default band; seed conservatively |

## 7. Interactions

| Element | Trigger | Result | Haptic |
|---|---|---|---|
| Option (B) | tap | Single-select | `selection` |
| Continue (C) | tap | Set starting band; advance to Adaptive Y/N | none |

## 8. Copy

| Key | String |
|---|---|
| prompt | "Where are you with English?" |
| opt.1 | "Just starting" |
| opt.2 | "I get by" |
| opt.3 | "I'm advanced" |
| opt.4 | "Prepping for a test" |
| btn.continue | "Continue" |

Non-judgmental — there's no "wrong" answer; framing is "let's find your starting point."

## 9. Accessibility

- Options are a `radiogroup`; selection announced.
- Read order: prompt → options → Continue. Targets ≥ 48×48.

## 10. Motion

| Element | Animation | Duration |
|---|---|---|
| Option select | border fade | `motion.fast` |
| Reduce Motion | instant | per a11y doc |

## 11. Acceptance criteria

- [ ] Tap-only; no typing.
- [ ] Four fixed options mapping to the documented starting frequency ranks.
- [ ] "Prepping for a test" sets a soft test-interest flag, never forces a purchase.
- [ ] Selection is treated as a prior — downstream adaptive walk + pseudo-words can override.
- [ ] Continue disabled until a selection exists.
- [ ] Non-punitive framing throughout.

## 12. Open questions

- Exact starting ranks are reasoned defaults; tune against beta data ([ONBOARDING_FLOW_SPEC.md](../ONBOARDING_FLOW_SPEC.md) Open Questions).
