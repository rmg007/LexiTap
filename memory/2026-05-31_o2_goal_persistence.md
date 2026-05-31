---
name: o2_goal_persistence
description: Goal/band persistence wired end-to-end; proficiency screen cut per spec
metadata:
  type: project
---

# O-2 Complete: Goal Persistence + Proficiency Screen Decision (2026-05-31)

## What was done
O-2 (goal-selection → onboarding profile persistence) is complete. The flow now:
1. goal-selection.tsx collects goal + routes to diagnostic
2. diagnostic.tsx applies goal→CEFR-band default + passes partialProfile
3. OnboardingDiagnosticScreen merges goal+band+completedAt into onboarding_state

**Decision D1: CUT the proficiency-assessment screen.** Rationale:
- Spec (ONBOARDING_FLOW_SPEC.md) calls for self-segmentation (frequency rank), not CEFR proficiency
- proficiency-assessment collects CEFR band, which is off-spec
- No documented use of CEFR band elsewhere
- Cutting simplifies flow: goal → diagnostic directly

## Changes
- goal-selection.tsx: route goal → diagnostic (not proficiency-assessment)
- diagnostic.tsx: removed band param, added `goalToStartingBand()` default mapping
  - "exam"/"academic" → B2 (ambitious)
  - "professional" → B1 (workplace)
  - "general" → A2 (cautious)
- SelectionCard a11y verified: accessibilityState.selected ✓, 72pt touch target ✓ (exceeds 48pt)
- Round-trip tests pass: goal/band persist via onboarding_state JSON, parse back defensively

## Evidence
- npm run check: 159 tests green (all passing)
- mappers.test.ts: round-trip tests confirm goal/band serialize/deserialize correctly
- SaveOnboardingProfileUseCase.test.ts: spreads partialProfile+completedAt correctly

## Next
O-4 (diagnostic sampler) is unblocked. O-3 is dead (not built, not implemented).

**Future:** full self-segmentation (DIAG-A Stage 1 frequency-rank picker) deferred post-MVP per spec.
