---
title: Onboarding — Knowledge Map Reveal Spec
screen_id: onboarding-knowledge-map-reveal
category: ux-design
status: active
updated: 2026-05-24
priority: P0
tab: null
target_file: mobile/src/presentation/screens/onboarding/
related_flows: [first-launch-onboarding-and-diagnostic]
tags: [screen, onboarding, knowledge-map, endowed-progress, reveal, motion-moment]
---

# Onboarding — Knowledge Map Reveal

> AI-buildable spec. Tokens from [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md). The endowed-progress payoff (Stage 5, [ONBOARDING_FLOW_SPEC.md](../ONBOARDING_FLOW_SPEC.md)). **This is the one place the design system permits a celebratory motion beat** (`motion.slow`, degrades to static under Reduce Motion). Frames known vocabulary as an achievement, never the remainder as a deficit.

## 1. Purpose

Convert the diagnostic's estimated frontier rank into an "already known" word count and reveal it as a segmented Knowledge Map — boosting D1 self-efficacy and retention. Routes to Home with SRS seeded.

## 2. Entry & exit

| Direction | From / To | Trigger |
|---|---|---|
| Enter | Onboarding — Adaptive Y/N | Diagnostic converged/stopped |
| Exit | Onboarding — Account Creation (optional) OR Home | Tap **Start learning** |

## 3. Layout

```
┌─────────────────────┐
│ You already know    │  ← framing headline (A)
│                     │
│      ~1,840         │  ← known count (B), large display, tabular
│       words         │
│                     │
│ ▓▓▓▓▓▓░░░░░░        │  ← segmented bar (C): Known·Learning·New
│ known·learning·new  │  ← legend (D)
│                     │
│  [ Start learning ] │  ← primary (E)
└─────────────────────┘
```

## 4. Anatomy

| Ref | Region | Component | Tokens | Content source |
|---|---|---|---|---|
| A | Headline | Text `headline` | `text.primary` | endowed-progress framing |
| B | Known count | Text `display`, `mono` tabular | `text.primary` | estimated known-word count |
| C | Segmented bar | Knowledge Map bar | Known `success` · Learning `accent` · New `text.tertiary` | frontier estimate split |
| D | Legend | Text `caption` | `text.tertiary` | segment labels |
| E | Start learning | Primary button | `accent` | → Account (optional) / Home |

## 5. Data requirements

| Data | Source | Notes |
|---|---|---|
| Estimated frontier rank | Adaptive Y/N output | adjusted by pseudo-word correction |
| Known count | derived | words below frontier within active free tiers, corrected |
| Segment split | derived | Known / Learning (frontier band) / New |
| SRS seed | Stage 6 seeding (writes `user_progress`) | already written/committed before reveal or on Start learning |

Copy uses "about" / "~" — the number is an estimate, framed as endowed progress, never a deficit.

## 6. States

| State | Trigger | Rendering |
|---|---|---|
| **Standard reveal** | Diagnostic converged | Headline + count + animated bar + Start learning |
| **Low known set** | "Just starting" / early stop | Celebrate the small known set honestly; emphasize the path forward |
| **Strong pseudo-correction** | Many false alarms | Present an honest, un-inflated number; no shame |
| **Reduce Motion** | a11y setting | Bar shown in final state, no reveal animation |

## 7. Interactions

| Element | Trigger | Result | Haptic |
|---|---|---|---|
| (auto) reveal | on entry | Animated segmented bar fill | single soft `success` beat (optional) |
| Start learning (E) | tap | Commit/confirm SRS seed; route to Account (optional) or Home | none |

## 8. Copy

| Key | String |
|---|---|
| headline | "You already know" |
| count | "~{n} words" |
| framing | "Let's build from there." |
| legend | "known · learning · new" |
| btn.start | "Start learning" |

Banned: deficit framing ("you don't know 1,160"), any guilt or test-failure language.

## 9. Accessibility

- Count announced as approximate ("about 1,840 words known").
- Segmented bar exposes value text per segment ("Known 1,840, Learning 300, New 6,000").
- Reduce Motion → static final bar; the celebratory beat must not be required to understand the result.
- Start learning ≥ 48×48, focused after reveal.

## 10. Motion

| Element | Animation | Duration |
|---|---|---|
| Segmented bar reveal | the one allowed celebratory beat | `motion.slow` (360ms) |
| Reduce Motion | static final state | per a11y doc |

This is the single sanctioned "moment" in the product — calm elsewhere.

## 11. Acceptance criteria

- [ ] Known count derived from the corrected frontier estimate; shown as approximate.
- [ ] Segmented bar uses Known `success` / Learning `accent` / New `text.tertiary`.
- [ ] Framing is endowed-progress; never frames the remainder as a deficit.
- [ ] The reveal animation respects Reduce Motion (static fallback) and is not required to understand the result.
- [ ] Start learning commits SRS seeding and routes to optional Account or Home.
- [ ] Low-known and heavy-pseudo-correction cases present honest, un-inflated, non-shaming numbers.

## 12. Open questions

- Whether the optional Account step appears before or after landing on Home.
- Exact celebratory beat treatment (bar fill vs count-up vs both).
