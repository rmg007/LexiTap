# Learn-Loop Wiring Plan — connect LearnCard → QuickCheck (SRS seeding)

**Status:** accepted (2026-06-09) — pending execution.
**Severity:** P0 launch blocker. The primary feature's SRS write path is dead.
**Scope:** presentation + routing only. **No `domain/srs`, no `infrastructure/db`, no `user.db` migration.** The SRS write code already exists and is unchanged — this plan only reconnects the navigation that reaches it.

---

## Problem (evidence, not assertion)

The learn flow is built as **two screens**:

1. **LearnCardScreen** — pressure-free first exposure. Shows a batch of new words one at a time. **Writes no SRS** (by design).
2. **LearnQuickCheckScreen** — one MultipleChoice per just-learned word; **the one and only place SRS rows are written in the learn flow** (`services.answerQuestion.execute(...)`, [LearnQuickCheckScreen.tsx:97-111](../mobile/src/presentation/screens/LearnQuickCheckScreen.tsx)). Fully built: gentle non-punitive feedback, NO TextInput, route `/learn-check` accepts the batch as a JSON `Word[]` param ([app/learn-check.tsx](../mobile/app/learn-check.tsx)).

**They are not connected.** The handoff was stubbed and never finished:

- [LearnCardScreen.tsx:71-83](../mobile/src/presentation/screens/LearnCardScreen.tsx) `handleGotIt` — on the final card it sets `phase = quickcheck` then calls `onComplete()` immediately. The comment still reads *"Stub until Screen 6 is built: call onComplete directly."* Screen 6 **is** built.
- [app/learn.tsx:30](../mobile/app/learn.tsx) wires `onComplete={() => router.replace('/')}` — straight to Home.

**Net effect:** learner taps through new words → lands on Home → **`/learn-check` is never pushed → SRS is never seeded.** New words never enter spaced repetition through the learn flow. The whole "learn → review" loop is open-circuit.

`/learn-check` is currently **unreachable from anywhere in the app** (grep: only `app/learn-check.tsx` references `LearnQuickCheckScreen`; nothing routes to `/learn-check`).

---

## Root cause

The `onComplete: () => void` callback carries no payload, so even if `app/learn.tsx` wanted to forward the batch to `/learn-check`, it has no batch to forward. The stub closed the loop the lazy way (skip to Home) instead of threading the batch out of the card screen.

---

## Fix design

Keep **LearnCardScreen router-free** (it takes callbacks; the route owns navigation — existing separation, don't break it). Thread the batch out through the completion callback.

### 1. `LearnCardScreen.tsx` — pass the batch on completion
- Change prop: `onComplete: () => void` → **`onComplete: (batch: Word[]) => void`**.
- `handleGotIt`: on the final card, call `onComplete(phase.batch)` instead of the bare `onComplete()`. Drop the `quickcheck` interim phase + its stub comment (no longer needed — the route takes over). Keep the `done` guard render as a harmless fallback, or remove `quickcheck`/`done` from the `LearnPhase` union if nothing else uses them (verify first).
- Update the prop JSDoc: *"called with the just-learned batch so the route can hand off to the SRS quick-check."*

### 2. `app/learn.tsx` — push to `/learn-check` with the batch
```tsx
onComplete={(batch) =>
  router.replace({
    pathname: '/learn-check',
    params: { batch: JSON.stringify(batch), tierId },
  })
}
```
Use `replace`, not `push` — the learner should not be able to "back" from the quick-check into already-seen cards. `/learn-check`'s own `onComplete` already `router.replace('/')` to Home, and its empty-batch guard already routes Home cleanly.

### 3. Verify the param round-trip
- `app/learn-check.tsx` already `JSON.parse`s `params.batch` and guards `!batch.length → router.replace('/')`. Confirm the serialized `Word[]` survives the trip. The batch comes from `StartQuizUseCase` (flat words — **no `senses`**, which only load lazily on the card), so payload stays small (~10 words). No change needed there unless the round-trip surfaces an issue.

---

## Files touched (exact, minimal)

| File | Change |
|---|---|
| [mobile/src/presentation/screens/LearnCardScreen.tsx](../mobile/src/presentation/screens/LearnCardScreen.tsx) | `onComplete` signature → `(batch: Word[]) => void`; final-card handoff passes `phase.batch`; drop the stub phase/comment |
| [mobile/app/learn.tsx](../mobile/app/learn.tsx) | `onComplete` pushes `/learn-check` with `{ batch: JSON.stringify(batch), tierId }` via `router.replace` |

No other files. `LearnQuickCheckScreen.tsx`, `app/learn-check.tsx`, `AnswerQuestionUseCase`, and all of `domain/srs` are **untouched** — they already work; they were just never reached.

---

## Verification

1. `cd mobile && npm run check` → green (lint + typecheck + 459 existing tests). The `onComplete` signature change is type-checked at both call sites.
2. **Manual / smoke** (the real proof — needs the running app, since there's no RTL render harness): Home → "Learn new words" → tap through the batch → confirm the **Quick check** screen appears (not Home) → answer each → confirm landing on Home. Then verify SRS rows were written (e.g. the word now appears in a review queue / `srs_state` row exists). Capture via `npm run smoke` if it can drive the flow, else note it as a device-test step.
3. Grep guard: after the fix, `/learn-check` has exactly one referrer (`app/learn.tsx`); the dead-route condition is cleared.

---

## Risk

**Low.** Two presentation/routing files. No SRS algorithm change, no DB/schema change, no migration. The worst failure mode is a navigation bug (caught by manual smoke), not data corruption. The high-risk `domain/srs` guard is **not** engaged — this plan deliberately stays outside it.

The one judgment call worth a second look in review: `replace` vs `push` for the card→check transition (chosen `replace` so Back doesn't re-enter seen cards). If product wants Back to return to the last card, switch to `push` — trivial.

---

## Exit criteria

- Learner completing a learn batch lands on **LearnQuickCheck**, not Home.
- Answering the quick-check **writes SRS rows** (verified on device/smoke).
- `/learn-check` is reachable from the app; no dead route.
- `npm run check` green; no `domain/srs` / `infrastructure/db` diff.

## Out of scope (do not start without new go)
- Any change to the SRS algorithm, scheduling, or the QuickCheck UI itself.
- Unifying QuickCheck's inline feedback with the Screen-1 FeedbackLayer (noted as a future merge in the screen's own comment).
- Adding `react-native-testing-library` / a render-test harness (separate infra decision).
