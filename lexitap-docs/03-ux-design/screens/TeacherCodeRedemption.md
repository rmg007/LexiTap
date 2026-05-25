---
title: Teacher Code Redemption Spec
screen_id: teacher-code-redemption
category: ux-design
status: active
updated: 2026-05-24
priority: P2
tab: null
target_file: TBD
related_flows: [redeeming-teacher-code, purchasing-premium]
tags: [screen, teacher-code, referral, trial, b2b, no-typing]
---

# Teacher Code Redemption

> AI-buildable spec. Tokens from [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md). Applies a teacher's code for an extended Premium trial and attributes the referral. **Selection-based, no free typing where avoidable** — if manual entry is unavoidable, use a constrained code picker, not a free-text quiz input (the no-typing rule governs quiz flows specifically; this is a constrained settings input).

## 1. Purpose

Let a learner apply a teacher advocate code (e.g. `TEACHER_MARIA`) to unlock an extended Premium trial, and attribute the referral for non-cash advocate rewards.

## 2. Entry & exit

| Direction | From / To | Trigger |
|---|---|---|
| Enter | Settings → "Have a teacher code?" | Tap row |
| Enter | Deep link from teacher's shared message | Code prefilled |
| Exit | Paywall (trial reflected) | Valid code applied |
| Exit | Back to Settings | Cancel or after success |

## 3. Layout

```
┌─────────────────────────────┐
│ ←   Teacher code             │  ← back + title (A)
│                              │
│  Enter or pick your          │  ← intro (B)
│  teacher's code              │
│                              │
│  ┌─────────────────────────┐ │
│  │ TEACHER_MARIA        ▾  │ │  ← constrained code picker (C)
│  └─────────────────────────┘ │     (prefilled from deep link)
│                              │
│        [   Apply   ]         │  ← primary (D)
│                              │
│  Codes give an extended      │  ← explainer (E)
│  Premium trial.              │
└─────────────────────────────┘
```

## 4. Anatomy

| Ref | Region | Component | Tokens | Content source |
|---|---|---|---|---|
| A | Title | Text `headline` | `text.primary` | static |
| B | Intro | Text `body` | `text.secondary` | static |
| C | Code field | Constrained picker / code input (not free quiz text) | `bg.surface`, `border.strong` | deep-link prefill or selection |
| D | Apply | Primary button | `accent` | enabled when a code is present |
| E | Explainer | Text `caption` | `text.tertiary` | static |

## 5. Data requirements

| Data | Source | Notes |
|---|---|---|
| Code value | deep link param or picker | prefilled when arriving via link |
| Validation result | redemption service (online check) | cached for offline reuse once validated |
| Trial + attribution | redemption service | extended trial attaches; teacher attributed |
| Account binding | account service | if no account yet, store provisionally; bind on creation/sign-in |

## 6. States

| State | Trigger | Rendering |
|---|---|---|
| **Empty** | Opened without prefill | Picker empty; Apply disabled |
| **Prefilled** | Deep link | Code shown; Apply enabled |
| **Validating** | Apply tapped | Inline progress on button |
| **Valid** | Server confirms | Confirmation: trial + teacher attribution; route to Paywall reflecting trial |
| **Invalid/expired** | Server rejects | Gentle inline message, no penalty, "try another" |
| **No account yet** | Code applied pre-account | Store provisionally on device; bind on later account creation/sign-in |
| **Offline** | No connectivity | If previously validated, reuse cached; else "connect to validate" |

## 7. Interactions

| Element | Trigger | Result | Haptic |
|---|---|---|---|
| Code picker (C) | select / prefill | Set code | `selection` |
| Apply (D) | tap | Validate; on success attach trial + attribution | success: soft success |
| Retry | on invalid | Clear message, allow another code | none |

## 8. Copy

| Key | String |
|---|---|
| title | "Teacher code" |
| intro | "Enter or pick your teacher's code" |
| btn.apply | "Apply" |
| explainer | "Codes give an extended Premium trial." |
| valid | "Applied — {n}-day Premium trial from {teacher}." |
| invalid | "That code didn't work. Try another?" |

No penalty language on failure.

## 9. Accessibility

- The code control announces its value and accepts selection without requiring fine typing where avoidable; if text entry is used, it's a single constrained field, clearly labeled.
- Read order: title → intro → code field → Apply → explainer.
- Inline validation messages announced via live region. Targets ≥ 48×48.

## 10. Motion

| Element | Animation | Duration |
|---|---|---|
| Validation spinner | inline | n/a |
| Success confirm | fade | `motion.fast` |
| Reduce Motion | fade only | per a11y doc |

## 11. Acceptance criteria

- [ ] No free-text quiz-style input; constrained picker or single labeled code field only.
- [ ] Deep link prefills the code.
- [ ] Validation is an online check, cached for offline reuse once validated.
- [ ] Valid code attaches an extended trial and attributes the teacher; reflected at the Paywall.
- [ ] Code applied before an account exists is stored provisionally and bound on account creation/sign-in (attribution survives sync).
- [ ] Invalid/expired codes show a gentle, no-penalty message.
- [ ] Never steers users to off-store discounts.

## 12. Open questions

- Whether manual entry is ever exposed, or strictly deep-link + pick-from-list.
- Trial length policy per code tier.
