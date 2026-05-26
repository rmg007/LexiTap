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
| Account binding | **Provisional AsyncStorage Boundary:** If no account exists yet, the code is saved in `AsyncStorage` under key `pending_teacher_code` with a unique `source_event_id` UUID. Upon subsequent account creation or sign-in, the application layer reads this key and triggers the Supabase RPC `redeem_teacher_code` server-side to atomically bind the trial and attribution to the new account, cleaning up the storage key. |

## 6. States

| State | Trigger | Rendering |
|---|---|---|
| **Empty** | Opened without prefill | Input/Picker empty; Apply disabled |
| **Prefilled** | Deep link | Code shown; Apply enabled |
| **Validating** | Apply tapped | Inline progress on button |
| **Valid** | Server confirms | Confirmation: trial + teacher attribution; route to Paywall reflecting trial |
| **Invalid/expired** | Server rejects | Gentle inline message, no penalty, "try another" |
| **No account yet** | Code applied pre-account | Saved to AsyncStorage as `pending_teacher_code`; toast: "Trial applied! We'll link it when you sign in." |
| **Offline** | No connectivity | If previously validated, reuse cached; else "connect to validate" |

## 7. Interactions

| Element | Trigger | Result | Haptic |
|---|---|---|---|
| Code input/picker (C) | select / type / prefill | Set code (forced uppercase to avoid entry errors) | `selection` |
| Apply (D) | tap | Validate; on success attach trial + attribution | success: soft success |
| Retry | on invalid | Clear message, allow another code | none |

## 8. Copy

| Key | String |
|---|---|
| title | "Teacher code" |
| intro | "Enter or pick your teacher's code" |
| btn.apply | "Apply" |
| explainer | "Codes give an extended Premium trial." |
| valid | "Applied — 14-day Premium trial from {teacher}." |
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

- [ ] No free-text quiz-style input; single uppercase-forced text entry field or picker only.
- [ ] Deep link prefills the code.
- [ ] Validation is an online check, cached for offline reuse once validated.
- [ ] Valid code attaches an extended 14-day trial and attributes the teacher; reflected at the Paywall.
- [ ] Code applied before an account exists is stored in AsyncStorage (`pending_teacher_code`) and bound on subsequent auth via Supabase RPC with `source_event_id` deduplication.
- [ ] Invalid/expired codes show a gentle, no-penalty message.
- [ ] Never steers users to off-store discounts.

## 12. Open questions

- (None. Manual entry is allowed as a constrained uppercase text field. Trial length is fixed to 14 days for teacher advocate referrals.)
