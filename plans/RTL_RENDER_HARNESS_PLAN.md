# RTL Render Harness Plan — make the test suite able to fail when the UI breaks

**Status:** DONE (2026-06-10). Supersedes issue [#10](https://github.com/rmg007/LexiTap/issues/10)'s "post-launch" timing — pulled forward by Ryan's call ("this is a huge issue"). Issue closed.
**Severity:** P1 infra. Not itself a launch blocker, but the absence of this harness is the proven root cause of one (the learn-loop P0) and watched a second (dual-React black-screen) ship past a green check.
**Scope:** test infra + tests only. **No production code changes. No `domain/srs`, no `infrastructure/db` diff.**

---

## Problem (evidence, not assertion)

`npm run check` (46 suites / 459 tests) **cannot fail when a screen or navigation breaks.** All screen tests are logic-only (`ScreenErrors.test.tsx`, `analytics.events.test.ts`, `quizQuestion.ts` helpers); nothing renders a component. Proven cost, twice:

1. **Learn-loop P0 (fixed `8fab926`):** `/learn-check` — the ONLY SRS-writing screen in the learn flow — had zero referrers for weeks. Core feature dead. Suite green the whole time. No test *could* notice: tests can't see screens or routes.
2. **Dual-React black-screen crash (2026-05-31):** app rendered nothing on the simulator; 155 tests stayed green throughout.

Also unenforced-by-test: the **passive-recognition invariant** (NO TextInput in quiz/learn screens). Today it's only a grep in `guardrails.mjs` — a PreToolUse hook, i.e. it guards *agent edits*, not the codebase state (human edits, merges, refactors bypass it).

And today's fix (`8fab926`) is itself only typecheck-proven — same exposure, right now.

## What this is NOT

A render test is not a device test. Jest+RTL runs on a mocked RN — it will catch dead routes, broken handoffs, missing renders, invariant violations. It will **not** catch native/Metro/DB breakage (dual-React, ATTACH paths, bundle resolution). That's what `.maestro/smoke.yaml` + the C0 device test are for. This plan adds the missing *middle* layer; it does not replace C0.

| Layer | Catches | Status |
|---|---|---|
| Jest logic tests (459) | domain/use-case bugs | ✅ exists |
| **Jest + RTL render tests** | **dead routes, broken screen wiring, invariant violations** | ❌ **this plan** |
| Maestro e2e (`smoke.yaml`) | native/Metro/DB render breakage | ⚠️ exists, covers age-gate only |
| C0 on-device smoke | everything, by hand | standing Ryan task |

---

## Fix design

### 1. Install harness (dev-only, JS-only — no native change, no EAS rebuild)

```bash
cd mobile && npm install --save-dev @testing-library/react-native@^12.9.0
```

- **v12.x, NOT v13** — v13 requires React 19; repo is `react@18.3.1` / RN 0.76.9. v12.9.0 is the current v12 line.
- jest-expo preset already handles RN transforms; expect zero `jest.config.js` changes beyond (maybe) a `setupFilesAfterEach` for cleanup — RTL v12 auto-cleans by default.
- Add to `transformIgnorePatterns` allowlist only if the first run demands it.

**Known risks (budget for these, don't be surprised):**
- **nativewind:** screens use `className` via nativewind 4. Under jest-expo, components may need the nativewind jest preset/babel transform or styles silently no-op (fine — we assert structure/behavior, not styles). Start without; add `nativewind/jest` only if rendering throws.
- **react-native-reanimated:** if a rendered screen pulls it in, add the standard `react-native-reanimated/mock` to setup.
- **expo-router:** screens under test are router-free by design (they take callbacks — `LearnCardScreen`, `LearnQuickCheckScreen`). Test the SCREENS, not the `app/` route files; route files stay typecheck-verified. This sidesteps router mocking entirely.
- **Services:** wrap renders in `ServicesContext.Provider` with the existing `mockServices` (already in repo, already maintained — Phase 3/4 kept it current).

### 2. First render tests (the minimum that would have caught the P0)

| Test | Asserts | File |
|---|---|---|
| **LearnCardScreen handoff** | render with mock services returning a 3-word batch → tap "Got it" through all cards → `onComplete` called **with the batch** (not bare). Would have failed against the stub. | `LearnCardScreen.render.test.tsx` |
| **LearnQuickCheck writes SRS** | render with batch prop → answer each MultipleChoice → `mockServices.answerQuestion.execute` called once per word → `onComplete` fires. | `LearnQuickCheckScreen.render.test.tsx` |
| **Passive-recognition invariant** | render QuizScreen + LearnCardScreen + LearnQuickCheckScreen → `queryAllByTestId`/`UNSAFE_queryAllByType(TextInput)` is empty. Codebase-state enforcement, complements the grep hook (which only guards agent edits). | `passiveRecognition.invariant.test.tsx` |
| **Phase-4 multi-sense render** (cheap bonus) | word with 2 senses → "MEANING 1"/"MEANING 2" visible; senses `[]` → flat definition fallback visible. First real proof of the Phase-4 UI. | fold into LearnCardScreen render test |

Naming: `*.render.test.tsx` so logic vs render tests are greppable. Existing `testMatch` already picks them up.

### 3. Extend Maestro smoke to the learn loop (the native-layer proof)

`.maestro/smoke.yaml` currently stops at the age gate. Add a second flow `learn-loop.yaml`: launch (seeded state past onboarding, or tap through) → "Learn new words" → tap through batch → **assert Quick check screen visible** → answer → assert Home. This is the automated version of the plan's manual smoke step. Gated on a built app on a simulator (same constraint as `npm run smoke`) — do after RTL lands; don't block on it.

---

## Files touched

| File | Change |
|---|---|
| `mobile/package.json` | +`@testing-library/react-native@^12.9.0` (devDependencies) — **explicit `npm ls` check after, CI must stay green (local-green≠CI-green lesson)** |
| `mobile/jest.config.js` | only if first run demands (reanimated mock / nativewind preset) |
| `mobile/src/presentation/screens/LearnCardScreen.render.test.tsx` | new |
| `mobile/src/presentation/screens/LearnQuickCheckScreen.render.test.tsx` | new |
| `mobile/src/presentation/screens/passiveRecognition.invariant.test.tsx` | new |
| `mobile/.maestro/learn-loop.yaml` | new (step 3, follow-up) |

No production source files. No high-risk paths.

**Guardrails note:** the invariant test FILE mentions TextInput but lives outside `quiz/`/`QuizScreen.tsx`/`components/assessments/` → hook won't block it. Verify filename placement before writing.

## Verification

1. `cd mobile && npm run check` green with new tests INCLUDED (expect 46→49+ suites).
2. **Prove the harness can fail:** temporarily revert the `onComplete(batch)` call to bare `onComplete()` locally → LearnCardScreen render test must go RED → restore. A render harness that can't catch the bug it was built for is theater.
3. Confirm CI green on push (CI runs the same `npm run check`; jest-expo on linux can differ from darwin).

## Exit criteria

- A future agent (or human) re-breaking the learn handoff turns the suite red.
- Passive-recognition invariant enforced by test, not just hook.
- Issue #10 closed (superseded by this plan, executed).

## Next steps (ordered)

1. **Execute steps 1–2 now** (~1 session): install, 3 render test files, prove-it-fails check, push.
2. Close issue #10 referencing this plan; update `CLAUDE.md` memory note "no RTL render harness" → harness exists, screens get render tests.
3. **Follow-up session:** Maestro `learn-loop.yaml` (needs built sim app).
4. **Ryan (unchanged, still owns):** C0 on-device smoke — RTL does NOT discharge it; it's still the only proof of native+DB+real-device behavior.
5. Optional later: render tests for onboarding flow + Settings (highest-traffic remaining screens); only after the learn loop is covered.

## Out of scope (do not start without new go)
- Snapshot testing (brittle, low signal — behavior assertions only).
- Detox or any new native e2e dependency (Maestro already in repo).
- Coverage thresholds / enforcing render tests for every screen.
