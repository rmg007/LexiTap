---
title: Content Error Reporter Spec
screen_id: content-error-reporter
category: ux-design
status: active
updated: 2026-05-26
priority: P2
tab: Quiz
surface: bottom-sheet
target_file: TBD
related_flows: [daily-review-session]
tags: [screen, quiz, support, content-error, offline-first, append-only]
---

# Content Error Reporter

> AI-buildable spec. Tokens from [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md). Present as a bottom-sheet overlay triggered from the assessment screens (long press or double tap on the word card). Offline-first: writes to the local `event_log` table in `user.db` and merges silently to Supabase on reconnection. Strictly no free text typing is allowed, honoring the quiz-path zero-typing policy.

## 1. Purpose

Empowers learners to quickly flag content errors (definition mistakes, voice pronuncation defects, sentence typos) during review sessions. Safe, instant, offline-capable reporting with no modal interruption.

## 2. Entry & exit

| Direction | From / To | Trigger |
|---|---|---|
| Enter | Quiz Screen (Multiple Choice / Drag Drop) | Long-press on Word Card OR tap option menu (...) |
| Exit | Quiz Screen | Tap **Submit report** OR Swipe Down to close |

## 3. Layout

```
┌─────────────────────────────┐
│             ──               │  ← grabber handle (A)
│   Report an issue            │  ← headline (B)
│                              │
│   What is wrong with this?   │  ← prompt (C)
│   ( ) Incorrect definition   │  ← option pickers (D)
│   ( ) Typos in sentence      │
│   ( ) Audio is wrong         │
│   ( ) Other                  │
│                              │
│   [  Submit report  ]        │  ← primary (E), disabled until picked
└─────────────────────────────┘
```

## 4. Anatomy

| Ref | Region | Component | Tokens | Content source |
|---|---|---|---|---|
| A | Handle | Grabber | `border.subtle` | static |
| B | Headline | Text `headline` | `text.primary` | static |
| C | Prompt | Text `caption` | `text.tertiary` | static |
| D | Option pickers | Selection list (radio group) | `bg.surface`, selected `accent` | static issues |
| E | Submit report | Primary button | `accent` | static |

## 5. Data requirements

### Event Log Append Path
Reports are written atomically to the local `event_log` table inside `user.db`:
```sql
INSERT INTO event_log (event_type, payload, occurred_at)
VALUES (
  'content_error_reported',
  json_object(
    'word_id', ?,
    'issue_type', ?,   -- 'wrong_definition' | 'wrong_example' | 'wrong_audio' | 'other'
    'note', ?          -- nullable, max 200 chars (pre-selected picker option, no text inputs)
  ),
  ?                    -- Date.now()
);
```

- **Sync Policy:** Silent backend push to Supabase's `content_errors` table on next sync cycle.
- **Strict Invariant:** Absolutely no `TextInput` or text editing. Issues are strictly selection-based.

## 6. States

| State | Trigger | Rendering |
|---|---|---|
| **Default** | Opened | Headline, prompt, unselected options list; Submit disabled. |
| **Option Selected** | User taps an option | Option checked with `accent` border; Submit enabled. |
| **Submitting** | Tap Submit | Show inline loading state on E. |
| **Success Toast** | Event written successfully | Toast message displayed: "Thanks — we'll review it."; sheet closes. |
| **Offline** | Default | Fully functional offline. Event is written locally to SQLite and queued; sync occurs silently later. |

## 7. Interactions

| Element | Trigger | Result | Haptic |
|---|---|---|---|
| Option Picker (D) | tap | Highlight selection; enable E | `selection` |
| Submit Report (E) | tap | Insert local SQLite event, show success toast, dismiss | `medium` (single) |
| Swipe down (A) | gesture | Dismiss sheet, return to Quiz; no write | none |

## 8. Copy

| Key | String | Notes |
|---|---|---|
| headline | "Report an issue" | |
| prompt | "What is wrong with this?" | |
| option.definition | "Incorrect definition" | |
| option.typo | "Typos in sentence" | |
| option.audio | "Audio is wrong" | |
| option.other | "Other" | |
| btn.submit | "Submit report" | |
| toast.success | "Thanks — we'll review it." | |

## 9. Accessibility

- Labeled options form a semantic `radiogroup` within the sheet modal.
- Read order: headline → prompt → options (in order) → Submit.
- Dismiss gesture equivalent to tapping outside sheet. Targets ≥ 48×48.

## 10. Motion

- Sheet slides up from screen bottom with `motion.base` (220ms).
- Toast fades out after 1.5s with `motion.fast` (120ms).
- Respects system Reduce Motion settings.

## 11. Acceptance criteria

- [ ] Strictly zero `TextInput` or free text typing elements.
- [ ] Writes atomically to `event_log` in `user.db` using the correct JSON schema.
- [ ] Runs fully offline with no blocking network dependency.
- [ ] Action E is disabled until a valid selection is chosen.
- [ ] Dismisses cleanly on swipe down or tap outside the bottom sheet.
- [ ] Renders entirely using defined visual tokens from `DESIGN_SYSTEM.md`.

## 12. Open questions

- **Supabase destination schema:** (Requirement: Requires a small schema migration note to prepare a matching `content_errors` table in the cloud database to receive the sync payload.)
