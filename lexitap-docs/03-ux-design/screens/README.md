---
title: Screen Specs Index
category: ux-design
status: active
updated: 2026-05-24
priority: P1
tags: [screens, wireframes, ui, ux, index]
---

# Screen Specs

One detailed, AI-buildable spec per screen. Each file is structured so a coding/design agent can generate wireframes and UI from it alone: layout, component anatomy with token references, data requirements, every state, interactions, exact copy, accessibility, motion, and an acceptance checklist.

- This folder is the **single source of truth** for screen layout and behavior. (It replaced the former `WIREFRAMES_MOCKUPS.md` overview, which was deleted to avoid a second, drift-prone copy.)
- Tokens (color, type, spacing, components) come from [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md) — specs reference token names, never hardcoded values.
- Journeys connecting screens are in [USER_FLOWS.md](../USER_FLOWS.md).
- Accessibility rules are in [ACCESSIBILITY_REQUIREMENTS.md](../ACCESSIBILITY_REQUIREMENTS.md).

## Spec template

Every screen file follows the same headings (see [Home.md](./Home.md) as the reference implementation):

1. **Frontmatter** — `screen_id`, route/target file, tab, related flows
2. **Purpose** — one or two sentences
3. **Entry & exit** — how the user arrives and where each exit leads
4. **Layout** — annotated ASCII frame(s)
5. **Anatomy** — region-by-region component table (component, token refs, content source)
6. **Data requirements** — what data, from which use case / query
7. **States** — enumerated (default, loading, empty/zero, error, offline, variants)
8. **Interactions** — element → trigger → result, including haptics
9. **Copy** — exact strings and variants
10. **Accessibility** — focus order, labels, touch targets, reduce-motion
11. **Motion** — what animates, with duration tokens
12. **Acceptance criteria** — verifiable checklist
13. **Open questions**

## Wireframe conventions

ASCII frames in each spec's **Layout** section use this shared legend:

```
[ Button ]    primary/secondary button       ( ) / (•)  unselected / selected
└ tab ┘       bottom tab item                  ▓▓▓░░      progress fill
🔥 12         streak chip (flame + integer)    ◔ ◑ ◕ ●    mastery ring states
```

Frames are layout/behavior intent, not pixel comps. Annotations follow each frame as `←`/`>` notes. All screens assume dark-mode-first, the 4-tab structure (Home, Quiz, Progress, Settings), and no typing in quiz flows.

## Inventory

Status: `built` = exists in `mobile/src/presentation/screens/`, `spec` = detailed spec written, `todo` = stub only.

| Screen | Spec | Code status | Target file |
|---|---|---|---|
| [Home](./Home.md) | spec | built | `mobile/src/presentation/screens/HomeScreen.tsx` |
| [Quiz — MultipleChoice](./QuizMultipleChoice.md) | spec | built | `mobile/src/presentation/components/assessments/MultipleChoice.tsx` |
| [Quiz — DragDrop](./QuizDragDrop.md) | spec | built | `mobile/src/presentation/components/assessments/DragDrop.tsx` |
| [Quiz — ImageMatch](./QuizImageMatch.md) | spec | built (Phase 4) | `mobile/src/presentation/components/assessments/ImageMatch.tsx` |
| [Quiz — Classification](./QuizClassification.md) | spec | built (Phase 4) | `mobile/src/presentation/components/assessments/Classification.tsx` |
| [Quiz — Feedback States](./QuizFeedbackStates.md) | spec | partial | `mobile/src/presentation/screens/QuizScreen.tsx` |
| [Session Complete](./SessionComplete.md) | spec | todo | TBD |
| [Learn Card](./LearnCard.md) | spec | todo | TBD |
| [Learn Quick-Check](./LearnQuickCheck.md) | spec | todo | TBD |
| [Progress](./Progress.md) | spec | built | `mobile/src/presentation/screens/ProgressScreen.tsx` |
| [Settings](./Settings.md) | spec | built | `mobile/src/presentation/screens/SettingsScreen.tsx` |
| [Paywall](./Paywall.md) | spec | todo | TBD |
| [Teacher Code Redemption](./TeacherCodeRedemption.md) | spec | todo | TBD |
| [Sign-in / Account](./SigninAccount.md) | spec | todo | TBD |
| [Forgiveness Sheet](./ForgivenessSheet.md) | spec | todo | TBD |
| [Onboarding — Splash](./OnboardingSplash.md) | spec | todo | TBD |
| [Onboarding — Value](./OnboardingValue.md) | spec | todo | TBD |
| [Onboarding — Self-Segment](./OnboardingSelfSegment.md) | spec | partial | `mobile/src/presentation/screens/onboarding/` |
| [Onboarding — Adaptive Y/N](./OnboardingAdaptiveYesNo.md) | spec | partial | `mobile/src/presentation/screens/onboarding/OnboardingDiagnosticScreen.tsx` |
| [Onboarding — Knowledge Map Reveal](./OnboardingKnowledgeMapReveal.md) | spec | todo | `mobile/src/presentation/screens/onboarding/` |
| [Onboarding — Account Creation](./OnboardingAccountCreation.md) | spec | todo | TBD |
