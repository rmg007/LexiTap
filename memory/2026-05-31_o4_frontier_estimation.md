---
name: o4_frontier_estimation
description: DIAG-B frontier-rank estimation computed from stride sampler
metadata:
  type: project
---

# O-4 Complete: Frontier Estimation (DIAG-B) (2026-05-31)

## What was done
O-4 (DIAG-B stride sampler frontier estimation) is complete. The diagnostic now:
1. Samples 5 words at even-difficulty spans (existing `selectDiagnosticSample`)
2. Grades answers via 3-option MultipleChoice
3. Computes frontier-rank from % correct via `estimateFrontierFromResults()`
4. Persists frontier-rank to `onboarding_state` alongside goal/band/completedAt

## Implementation
- **estimateFrontierFromResults()** — crude DIAG-B estimate: linearly scales % correct to frequency-rank
  - 0% correct → rank 500 (knows very little)
  - 100% correct → rank 3500 (strong knowledge)
  - E.g., 3/5 correct → 60% → rank 2300
- **OnboardingDiagnosticScreen.finish()** — calls estimateFrontierFromResults(results) + passes to saveOnboardingProfile
- Tests: 4 new cases (empty, boundary, half, 3/5) all pass; 163 total tests green

## Why this scale (500–3500)
Aligns with Foundation tier's frequency-rank range (top 3000 words). Represents vocabulary frontier from beginner (500: very basic) to advanced Foundation user (3500: approaching Common 3000).

## Known limitation
This is a CRUDE estimate. It doesn't account for:
- Difficulty of words answered correctly (current diagnostic has no IRT difficulty calibration)
- Pseudo-words for overclaim detection (DIAG-A feature, deferred)
- Adaptive band-walk convergence (DIAG-A, deferred)

DIAG-B is sufficient for beta (gives a ballpark frontier for Knowledge Map reveal). Post-launch: upgrade to DIAG-A once pseudo-word library + per-word frequency data available.

## Next
O-5 (Knowledge Map reveal) is unblocked. Can now show an estimated known-word count derived from frontierRank.

Related: [[2026-05-31_o2_goal_persistence]]
