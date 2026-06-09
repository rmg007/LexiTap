---
title: Design System
category: ux-design
status: active
updated: 2026-06-09
priority: P0
tags: [design-system, brand, colors, typography, components, dark-mode, tokens, motion, haptics]
---

# Design System

The LexiTap design system. Dark-mode-first, typography-driven, adult-professional. Every token and component here exists to pass the brand test: "would a professional ESL learner pull this out on their commute without embarrassment?"

This document is the source of truth for visual and interaction tokens and for the working brand decisions (palette, typography, aesthetic constraints), pending standalone brand-identity finalization (backlog #42, [ROADMAP.md](../02-product-definition/ROADMAP.md)). It expands those constraints into implementation-ready specs and feeds the detailed screen specs in [screens/](./screens/README.md) and the accessibility floor in [ACCESSIBILITY_REQUIREMENTS.md](./ACCESSIBILITY_REQUIREMENTS.md).

## Table of Contents

- [Design Principles](#design-principles)
- [Color System](#color-system)
- [Typography](#typography)
- [Spacing and Layout](#spacing-and-layout)
- [Elevation and Surfaces](#elevation-and-surfaces)
- [Iconography](#iconography)
- [Component Library](#component-library)
- [Motion and Haptics](#motion-and-haptics)
- [Token Implementation Notes](#token-implementation-notes)
- [Open Questions](#open-questions)

## Design Principles

1. **Dark-mode-first.** Dark is the designed default, not a toggle afterthought. Light mode is a derived theme, shipped at MVP but designed second. All tokens below define dark values as canonical; light values are mappings.
2. **Typography carries the layout.** Hierarchy comes from type scale and whitespace, not from boxes, borders, or color blocks. Minimal chrome.
3. **Calm, not loud.** Teal is the single accent. No primary-color overload, no classroom-poster saturation. Color is reserved for meaning (accent, success, gentle correction), never decoration.
4. **Non-punitive by construction.** There is no harsh red anywhere in the assessment feedback path. Correction states use amber/neutral, never alarm red. See [ACCESSIBILITY_REQUIREMENTS.md](./ACCESSIBILITY_REQUIREMENTS.md) for the color-independent feedback rule.
5. **Functional motion only.** Animation confirms an interaction or guides attention. It never celebrates with fanfare. Haptics confirm taps quietly.
6. **No mascots, no cartoons, no illustrated characters.** That is Knowji's lane (see Competitive Frame in [MARKET_RESEARCH_COMPETITIVE_ANALYSIS.md](../01-discovery-strategy/MARKET_RESEARCH_COMPETITIVE_ANALYSIS.md)). Imagery is contextual (ImageMatch, word context) and never whimsical.

## Color System

Canonical values are dark mode. The teal primary (#20B2AA) is the LexiTap brand color. The brand's marketing/light context uses a white background (#FFFFFF) and dark-gray text (#333333); the dark-mode-first product UI inverts these as defined below. This is a deliberate expansion, not a contradiction — flagged in [Open Questions](#open-questions).

### Dark theme (canonical)

| Token | Hex | Role |
|-------|-----|------|
| `bg.base` | `#0E1112` | App background, deepest layer |
| `bg.surface` | `#171A1C` | Cards, sheets, primary surfaces |
| `bg.surface.raised` | `#1F2426` | Elevated cards, modals, menus |
| `bg.surface.sunken` | `#0A0C0D` | Wells, input-like containers |
| `border.subtle` | `#262B2E` | Hairline dividers, card edges |
| `border.strong` | `#3A4145` | Selected/decorative outlines (NOT focus rings — fails WCAG 2.4.11 at ~1.5–1.8:1 on dark surfaces) |
| `text.primary` | `#F2F5F6` | Headlines, word being studied |
| `text.secondary` | `#A9B2B6` | Definitions, supporting copy |
| `text.tertiary` | `#838E92` | Captions, metadata, hints (AA-corrected 2026-06-09: was `#6E777B`, 3.4:1 on raised — failed) |
| `accent` | `#20B2AA` | Primary teal, interactive emphasis (fills, **focus rings** 2px), ≥3.8:1 both modes |
| `accent.pressed` | `#1A938C` | Pressed/active teal |
| `accent.subtle` | `#13322F` | Teal-tinted fill behind accent text |
| `accent.text` | `#20B2AA` | Accent-colored **text/links** on backgrounds. Equals `accent` in dark; in light it's the darker pressed teal so small text passes AA 4.5:1 (the light fill teal does not) |
| `success` | `#4CAF50` | Correct-answer confirmation |
| `success.subtle` | `#16301A` | Correct-answer fill |
| `caution` | `#FFC107` | Gentle "review again" state (NOT error) |
| `caution.subtle` | `#33290A` | Caution fill |
| `streak` | `#FF9A3D` | Streak flame accent (warm, distinct from caution) |

There is intentionally **no `error.red` token in the assessment path.** A destructive red (`#E5484D`) exists only for true destructive confirmations (delete account, reset progress) and never for quiz feedback.

### Light theme (derived)

| Token | Hex |
|-------|-----|
| `bg.base` | `#FBFCFC` |
| `bg.surface` | `#FFFFFF` |
| `bg.surface.raised` | `#F7F9F9` |
| `border.subtle` | `#E6E9EA` |
| `text.primary` | `#1A1D1E` |
| `text.secondary` | `#52595C` |
| `text.tertiary` | `#676F73` (AA-corrected 2026-06-09: was `#6B7378`, 4.3:1 on sunken — failed) |
| `accent` | `#178F88` (darkened teal for AA on white — fills/icons) |
| `accent.text` | `#0F6E68` (accent-colored text/links; passes AA 4.5:1 as small text) |
| `success` | `#2E7D32` |
| `caution` | `#B58100` |

Light-mode accent/success/caution are darkened so text and icons meet WCAG AA on light surfaces (see [ACCESSIBILITY_REQUIREMENTS.md](./ACCESSIBILITY_REQUIREMENTS.md)).

## Typography

Typefaces: **Inter** (UI, variable) for all interface text, and **Playfair Display Bold** for the two editorial heading levels (`h1`, `display`) — ratified 2026-06-09 as on-brand editorial emphasis (it already ships in `tokens.ts` and on lexitap.app). **DM Sans** is marketing-surface only (App Store, brand collateral) and is never bundled in the app.

Values below are the **shipping source of truth** (`mobile/src/presentation/theme/tokens.ts`); this table mirrors it 1:1. All sizes scale with the OS Dynamic Type setting per a per-token max multiplier (see accessibility doc).

| Token | Size / Line | Weight | Family | Use |
|-------|-------------|--------|--------|-----|
| `h1` | 44 / 48 | 700 | Playfair Display | Hero/editorial display (Knowledge Map, onboarding) |
| `display` | 34 / 38 | 700 | Playfair Display | Word under study (Quiz prompt) |
| `title` | 28 / 34 | 700 | Inter | Screen titles (Home greeting, Progress) |
| `headline` | 18 / 22 | 700 | Inter | Card headers, section heads |
| `bodyLg` | 18 / 26 | 400 | Inter | Definitions, answer options |
| `body` | 15 / 24 | 400 | Inter | Default body text |
| `label` | 14 / 20 | 600 | Inter | Buttons, chips, tab labels |
| `caption` | 13 / 18 | 400 | Inter | Metadata, hints, helper text |
| `smallCaps` | 11 / 16 | 700 | Inter | Uppercase branded label (+0.15em tracking) |
| `mono` | 14 / 20 | 500 | Inter | Streak integer, counters (tabular figures) |

Rules: max two weights visible per screen (Playfair counts as one). Use `text.secondary` for definitions so the studied word (`text.primary`) dominates. Enable tabular figures for all counters so streak/progress numbers do not jiggle when they change.

## Spacing and Layout

8pt base grid. Spacing tokens:

| Token | Value |
|-------|-------|
| `space.1` | 4 |
| `space.2` | 8 |
| `space.3` | 12 |
| `space.4` | 16 |
| `space.5` | 24 |
| `space.6` | 32 |
| `space.7` | 48 |
| `space.8` | 64 |

Layout: screen gutter = `space.4` (16) on phones. Content max-width capped at 600 for large/tablet so text lines stay readable. Cards use `space.4` internal padding. Vertical rhythm between stacked cards = `space.3`. Generous whitespace is a brand requirement — when in doubt, add space, not borders.

Radii: `radius.sm` 8, `radius.md` 12 (default card/button), `radius.lg` 20 (sheets), `radius.full` 999 (pills, streak chip, avatar).

## Elevation and Surfaces

Dark mode separates layers by **surface lightness**, not heavy shadow. Each step up uses the next lighter `bg.surface.*` token plus a 1px `border.subtle`. Shadows are near-invisible on dark and used sparingly: modals get a soft `0 8 24 rgba(0,0,0,0.4)`. Light mode relies on shadow for the same hierarchy.

## Iconography

Line icons, 1.75px stroke, rounded caps, 24x24 default grid. Geometric and neutral — no filled novelty glyphs, no skeuomorphism. Recommended set: a single consistent open-source line family (e.g. Lucide) for coverage and licensing simplicity. The tap-gesture mark from the logo is brand-only and not reused as a UI icon. Icons always pair with a text label or an accessibility label; an icon alone never carries meaning (color-independence and screen-reader rule).

## Component Library

### Buttons

- **Primary** — filled `accent`, label color `#062826` (dark) for AA contrast on teal, `radius.md`, min height 48, label `label` token, horizontal padding `space.4`. Pressed: `accent.pressed` + subtle scale 0.98. Used once per screen for the main action (Start review, Continue, Unlock).
- **Secondary** — transparent fill, 1px `border.strong`, `text.primary` label. Used for alternate actions (Learn new words, Maybe later).
- **Tertiary / text** — no border, `accent` label. Low-emphasis (Restore purchase, Skip).
- **Destructive** — text-only `#E5484D`, always behind a confirm sheet. The only place red appears.

All buttons: min 48x48 touch target even when visually smaller (see accessibility). Full-width primary buttons on Quiz and Paywall.

### Cards

`bg.surface`, `radius.md`, `border.subtle`, `space.4` padding. The **word card** (Home "due today", Progress list rows) shows the word in `headline`, a one-line definition in `text.secondary`, and a small mastery ring on the trailing edge. No drop shadows in dark mode.

### Quiz widgets

All widgets share a frame: prompt area (top), interaction area (middle), feedback area (bottom). No `TextInput` anywhere — interaction is tap/drag/match/classify only (hard invariant from [SYSTEM_ARCHITECTURE.md](../04-technical-architecture/SYSTEM_ARCHITECTURE.md)).

- **MultipleChoice (MVP)** — prompt word in `display`; 2–4 option cards stacked, each a full-width tappable card (`radius.md`, min height 56). Selected option gets `accent` border. On submit: chosen-correct fills `success.subtle` with a check; chosen-incorrect fills `caution.subtle` with a gentle dash icon (never a red X) and the correct option simultaneously highlights `success`. Feedback copy is encouraging, never scolding.
- **DragDrop (MVP)** — draggable chips (`radius.full`, `bg.surface.raised`) and labeled drop zones (`bg.surface.sunken`, dashed `border.subtle`). On drag start: chip lifts (scale 1.04 + shadow) and haptic `selection`. Valid drop target highlights `accent` border. Snap-to on release; gentle settle animation.
- **ImageMatch (Phase 4)** — grid of contextual images (2x2 or 3x2) matched to a word/definition. Images are functional context, never decorative cartoons.
- **Classification (Phase 4)** — sort word chips into 2–3 labeled buckets via drag.

Feedback states for all widgets use the success/caution token pair plus an icon plus motion — three redundant channels so meaning is never color-only.

### Streak indicator

Pill (`radius.full`) with the `streak` flame glyph + integer in `mono` tabular figures. Lives top-right on Home. States: active (warm flame, `streak` color), at-risk (flame outline + `caution` ring when today's session is not yet done), frozen (snowflake glyph, `text.secondary`, when a streak-freeze is consumed — use the `Snowflake` icon from `lucide-react-native`, 24×24, colored `text.secondary`; the frozen state communicates via three independent channels: snowflake icon + "Frozen" label text + `text.secondary` color, satisfying the color-independence rule). The streak answers "did you show up today?" — never displays time or word-count targets (locked decision in [SRS_FORGIVENESS_MECHANICS.md](../02-product-definition/SRS_FORGIVENESS_MECHANICS.md)). No red, no guilt, no shrinking-heart animation.

### Progress rings and bars

- **Mastery ring** — circular progress, `accent` arc on `border.subtle` track, 2.5px stroke. Used on the Knowledge Map and Progress screen to show per-tier mastery.
- **Knowledge Map bar** — segmented horizontal bar showing Known / Learning / New as `success` / `accent` / `text.tertiary` segments. Drives the endowed-progress reveal (see [ONBOARDING_FLOW_SPEC.md](./ONBOARDING_FLOW_SPEC.md)).
- **Daily-cap meter** — small linear meter showing reviews completed against the soft daily cap; fills `accent`, and when the cap is reached it shows a calm "You're done for today" state, not a lockout.

### Chips, tabs, sheets

- **Chips** — `radius.full`, `label` text, `bg.surface.raised`; selected = `accent.subtle` fill + `accent` text.
- **Tab bar** — 4 tabs (Home, Quiz, Progress, Settings) per the locked MVP screen set. Line icons + `label`; active tab `accent`, inactive `text.tertiary`.
- **Bottom sheets** — `radius.lg` top corners, `bg.surface.raised`, grabber handle, used for Paywall, confirmations, and the daily-cap catch-up offer.

## Motion and Haptics

Motion is functional and brief. Standard durations: `motion.fast` 120ms (taps, toggles), `motion.base` 220ms (card transitions, sheet present), `motion.slow` 360ms (Knowledge Map reveal — the one allowed "moment"). Easing: standard `cubic-bezier(0.2, 0, 0, 1)`. All motion respects the OS Reduce Motion setting by collapsing to a cross-fade (see [ACCESSIBILITY_REQUIREMENTS.md](./ACCESSIBILITY_REQUIREMENTS.md)).

Haptics (iOS Haptic Engine / Android equivalent):

| Event | Haptic |
|-------|--------|
| Option select / drag pickup | `selection` (light) |
| Correct answer | `notificationSuccess` (single, soft) |
| Gentle correction | `impactLight` — never a heavy "error" buzz |
| Streak incremented | `impactMedium` once |
| Session complete | `notificationSuccess` |

Haptics confirm; they never punish. There is no error haptic on a wrong answer.

## Token Implementation Notes

- Stack is React Native (Expo) + TypeScript per [SYSTEM_ARCHITECTURE.md](../04-technical-architecture/SYSTEM_ARCHITECTURE.md). Tokens live in `src/presentation/theme/` as a typed object, consumed via a `useTheme()` hook that returns the active (dark/light) map.
- Tokens are presentation-layer only; the domain layer never imports them (hexagonal boundary).
- Theme switching reads the OS appearance setting by default with a manual override in Settings; dark is the fallback when "system" is unavailable.

## Open Questions

All open questions from the initial draft have been resolved.

- **Background/text token reconciliation — RESOLVED.** The marketing palette (white background / dark-gray text) applies to lexitap.app and App Store listing surfaces only. The product UI is dark-mode-first and these tokens are the source of truth for mobile. The two contexts are separate; there is no conflict.
- **Icon family license — RESOLVED.** Lucide confirmed. Apache 2.0 license, permissive for commercial use. All UI icons, including the frozen-streak `Snowflake`, are sourced from `lucide-react-native`.
- **DM Sans vs Inter split — RESOLVED.** Inter variable font for UI inside the app bundle, plus **Playfair Display Bold** for the `h1`/`display` editorial levels (ratified 2026-06-09; ships in `tokens.ts`). DM Sans is for marketing surfaces (lexitap.app, App Store screenshots, brand collateral) and is never shipped inside the mobile app.
- **Type metrics code↔doc — RECONCILED 2026-06-09.** Earlier doc values (`headline` 22/600, `body` 16, light `text.tertiary` #878F92, Inter-only) were stale vs shipping `tokens.ts`. This doc now mirrors `tokens.ts` 1:1; that file is the source of truth for type and color values.
