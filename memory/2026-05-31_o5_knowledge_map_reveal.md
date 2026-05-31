---
name: o5_knowledge_map_reveal
description: Endowed-progress knowledge map reveal with animated segmented bar
metadata:
  type: project
---

# O-5 Complete: Knowledge Map Reveal (2026-05-31)

## What was done
O-5 (Knowledge Map reveal) is complete. The screen now:
1. Reads frontierRank from onboarding_state (computed in O-4)
2. Derives segment counts: Known/Learning/New from frontier
3. Displays animated segmented bar + estimated word count
4. Respects Reduce Motion (static fallback)
5. Routes to paywall on "Start learning" CTA

## Implementation
- **computeSegments()** — maps frontierRank → segment counts
  - Known = frontierRank (words below frontier)
  - Learning = ~500-word band (frontier ±250)
  - New = remainder in Foundation tier (3000 total)
- **Animated reveal**: 
  - Bar fill animation: `react-native-reanimated` with `withTiming(360ms)`
  - Slide-in text: `FadeIn` (300ms) + `SlideInUp` (staggered delays)
  - Respects Reduce Motion → static final state (no animation, no understanding loss)
- **Copy**: endowed-progress framing ("You already know ~X words. Let's build from there.")
- **A11y**: Accessible count label ("About X words known"), segmented bar description

## Known limitation
DIAG-B frontier is crude (based on % correct, not IRT). Segment widths (500 for Learning band) are reasonable defaults. Post-launch (DIAG-A): upgrade frontier estimation + add pseudo-word correction.

## Why this matters
Endowed-progress moment shows learner how much they *already know*, boosting self-efficacy at the critical first-impression juncture. Single sanctioned celebratory motion in product — calm everywhere else.

## Next
**Onboarding (H-1 → O-5) complete.** All P1 prerequisites met:
- Cold launch → words.db ATTACH → onboarding UI → diagnostic → Knowledge Map → paywall → Home
- SRS seeded, proficiency learned, frontier calibrated

Next: P-1 remaining = P-1 empty states, P-2 a11y polish. Then P2 beta setup.

Related: [[2026-05-31_o4_frontier_estimation]], [[2026-05-31_o2_goal_persistence]]
