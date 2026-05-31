# Onboarding Chain Reality — UI is built, persistence is the gap (2026-05-31)

Audited the whole onboarding flow against code while teeing up O-2. **RELEASE_PLAN materially understates what's built** (third time this session — see also H-1/O-1 already-done). Recorded so the next session targets the real gap instead of rebuilding screens.

## What actually exists (all in `mobile/app/onboarding/`, scaffolded + rendering)
Flow: `index` (welcome) → `goal-selection` → `proficiency-assessment` → `diagnostic` → `knowledge-map-reveal` → `paywall` → `markComplete()` → `router.replace('/')`.

- **goal-selection.tsx (O-2)** — full `SelectionCard` grid, 4 `LearningGoal`s, Continue gated on selection, routes to proficiency passing `goal` as a route param.
- **proficiency-assessment.tsx (O-3)** — `SelectionCard` grid over all 5 `ProficiencyBand`s (A2–C2), reads `goal` param. (Plan D1 calls a separate proficiency screen possibly redundant vs self-segment — it exists anyway as the band picker.)
- **diagnostic.tsx → OnboardingDiagnosticScreen (O-4)** — the trivial 5-word even-stride sampler (off-spec per plan D1, known). `finish()` is the ONLY place that calls `saveOnboardingProfile`, and it writes **only `{completedAt}`**.
- **knowledge-map-reveal.tsx (O-5)** — static placeholder copy ("starting point calibrated"), **no numbers** → does NOT violate the plan's "don't ship fake numbers" rule (it shows no fake estimate, just generic copy).
- **paywall.tsx (O-6)** — inert; `markComplete()` (AsyncStorage gate flag) regardless of choice, then `replace('/')`.

## THE GAP (this is the real O-2…O-5 work)
**`goal` and `band` are collected but never persisted.** They flow screen→screen as expo-router params and are dropped at the diagnostic. `SaveOnboardingProfileUseCase` (O-1, done, works) is wired and tested but production only ever feeds it `{completedAt}` → `goal`/`band`/`frontierRank` stay empty in `user_stats.onboarding_state`. So Home/KnowledgeMap can READ a profile that is effectively always blank.

**Minimal fix to "finish onboarding":** thread the collected `goal` + `band` (+ `completedAt`) into `saveOnboardingProfile` — either accumulate via params and write once at diagnostic finish, or write incrementally per screen. Add a `goal → starting band` default (plan O-2: "selection sets starting band") so band is sensible even if O-3 is skipped/cut. `frontierRank` stays empty until DIAG-B (O-4) computes a real estimate.

## Verify before calling O-2 done
- `SelectionCard` a11y: plan demands `accessibilityState.selected` + 44pt targets — confirm the component sets these (not yet verified).
- Decide D1 (O-3 keep-or-cut) before investing in the proficiency screen — it already exists, so "cut" = route goal→diagnostic directly.

Related: [[2026-05-31_onboarding_persistence]] (O-1 wiring), [[2026-05-31_schema_many_to_many]].
