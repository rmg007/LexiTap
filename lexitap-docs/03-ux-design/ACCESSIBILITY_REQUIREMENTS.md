---
title: Accessibility Requirements
category: ux-design
status: active
updated: 2026-05-24
priority: P1
tags: [accessibility, wcag, a11y, voiceover, talkback, contrast, dynamic-type, reduced-motion, captions]
---

# Accessibility Requirements

Accessibility is a mandatory, non-negotiable requirement for LexiTap — VoiceOver and TalkBack support are locked invariants ([SYSTEM_ARCHITECTURE.md](../04-technical-architecture/SYSTEM_ARCHITECTURE.md), [PRODUCT_REQUIREMENTS_DOCUMENT.md](../02-product-definition/PRODUCT_REQUIREMENTS_DOCUMENT.md)). The target audience is adult ESL learners worldwide on a wide range of devices; accessibility is also reach. This document defines the conformance floor and the concrete per-component requirements.

Tokens referenced here are defined in [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md); screen layouts in [screens/](./screens/README.md).

## Table of Contents

- [Conformance Target](#conformance-target)
- [Screen Reader Support (VoiceOver / TalkBack)](#screen-reader-support-voiceover--talkback)
- [Color and Contrast](#color-and-contrast)
- [Color-Independent Feedback](#color-independent-feedback)
- [Touch Targets and Gestures](#touch-targets-and-gestures)
- [Dynamic Type and Layout](#dynamic-type-and-layout)
- [Reduced Motion](#reduced-motion)
- [Audio and Captions](#audio-and-captions)
- [Language and Reading Level](#language-and-reading-level)
- [Testing and Acceptance](#testing-and-acceptance)
- [Open Questions](#open-questions)

## Conformance Target

- **WCAG 2.2 Level AA** is the minimum bar for all MVP screens.
- Platform support: iOS VoiceOver, Dynamic Type, Reduce Motion, Bold Text, Increase Contrast; Android TalkBack, Font size, Display size, Remove animations, High contrast text.
- This is a launch-blocking requirement: a screen that fails the per-component checks below is not shippable.

## Screen Reader Support (VoiceOver / TalkBack)

Every interactive and informative element exposes an accessibility label, role, value, and state. React Native: use `accessibilityRole`, `accessibilityLabel`, `accessibilityState`, `accessibilityValue`, and group with `accessible` where appropriate.

Per-surface requirements:

- **Home:** streak chip announces "Streak, 12 days, today not yet complete / complete" (state, not just a number). Due card announces "8 words due today." Buttons have action labels ("Start review session").
- **Quiz prompt:** the word under study is announced with its part of speech; the phonetic spelling is *not* read literally (mark phonetic as `accessibilityElementsHidden` and provide the audio control instead).
- **MultipleChoice:** each option is a button with `accessibilityState={{ selected }}`; on submit, the result is announced via an accessibility live region: "Correct" or "Not quite — the answer is hard-working and careful. You'll see this again." Never announce "wrong" punitively.
- **DragDrop:** drag is not screen-reader friendly by itself. Provide a **tap-to-place fallback**: focus a chip, double-tap to pick up (announce "picked up candid"), focus a target, double-tap to drop (announce "placed candid in honest, direct"). This fallback is mandatory, not optional.
- **Progress:** mastery rings expose `accessibilityValue` as percent and a text equivalent ("Foundation, 61 percent mastered").
- **Paywall:** price, billing model (one-time, monthly, or annual), and "dismiss" are all clearly labeled; the close control is reachable first.
- **Focus order** follows visual reading order top-to-bottom; modals trap focus and restore it on dismiss.

## Color and Contrast

All contrast computed against the actual surface token, in both themes.

- Body and label text: ≥ **4.5:1** (WCAG AA normal text).
- Large text (≥ 24px or ≥ 19px bold) and UI component boundaries / focus indicators: ≥ **3:1**.
- The dark palette in [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) is designed to meet this: `text.primary` on `bg.surface`, `text.secondary` on `bg.surface`, and primary-button label `#062826` on `accent` all clear AA. `text.tertiary` is restricted to non-essential metadata only (it sits near the 4.5:1 line and must not carry meaning required to use the app).
- Light theme uses darkened accent/success/caution (`#178F88`, `#2E7D32`, `#B58100`) specifically so colored text/icons meet AA on white.
- Honor the OS Increase Contrast / High contrast text setting by switching `border.subtle` → `border.strong` and bumping secondary text toward primary.

## Color-Independent Feedback

Because LexiTap deliberately uses **no red X** and gentle correction, color must never be the sole signal of meaning — critical for color-blind users (and good practice generally).

Every feedback and status state carries **at least two of: shape/icon, text, motion** in addition to color:

| State | Color | Icon | Text |
|-------|-------|------|------|
| Correct | success green | check | "Nice — locked in." |
| Gentle correction | caution amber | dash (not X) | "Close — the answer is…" |
| Streak at-risk | caution ring | flame outline | "Today's session not done yet" |
| Locked tier | neutral | lock | "Unlock to start" |

This rule is enforced in code review: no component may communicate state through color alone.

## Touch Targets and Gestures

- Minimum touch target **48x48 dp** (Android) / **44x44 pt** (iOS) for every interactive element, even when the visible glyph is smaller (pad the hit area). This matches the design-system button minimum.
- Spacing between adjacent targets ≥ `space.2` (8) to prevent mis-taps.
- **No interaction depends solely on a complex gesture.** DragDrop has the tap-to-place fallback above. There are no multi-finger or path gestures required anywhere.
- Generous targets also serve the no-typing thesis: tapping and dragging must be comfortable one-handed on a commute.

## Dynamic Type and Layout

- All type tokens scale with the OS text-size setting; nothing uses a fixed pixel font that ignores Dynamic Type / Android font scale.
- Layouts reflow (no clipping, no truncated answer options) up to the largest standard accessibility text size. Quiz option cards grow in height rather than truncating definitions.
- Respect Bold Text by mapping to the next heavier weight.
- No text baked into images for meaning (definitions, options) — all selectable/readable text is real text.

## Reduced Motion

- Honor iOS Reduce Motion and Android Remove Animations. When set, all `motion.*` transitions collapse to a simple cross-fade or instant change.
- The Knowledge Map reveal (the one celebratory moment) degrades to an immediate static render with no animated fill.
- No parallax, no auto-playing motion, no flashing. Nothing in the app flashes more than 3 times per second (seizure safety).

## Audio and Captions

- Audio is pronunciation reference only ([PRODUCT_REQUIREMENTS_DOCUMENT.md](../02-product-definition/PRODUCT_REQUIREMENTS_DOCUMENT.md)) — never required to answer a question. A learner who cannot hear can complete every quiz using the written word, phonetic spelling, definition, and example.
- Each audio control has a clear label ("Play pronunciation of diligent").
- Where audio carries content (the spoken word), the written word and IPA phonetic transcription are always present as the visual equivalent — this is the caption substitute for single-word audio.
- No audio autoplay that could surprise a screen-reader user; playback is user-initiated (confirm in [Quiz — MultipleChoice spec](./screens/QuizMultipleChoice.md) Open Questions).

## Language and Reading Level

The audience is non-native English speakers. UI chrome (buttons, navigation, system copy — distinct from the vocabulary content being taught) uses plain, simple English, avoids idioms in instructions, and keeps instruction sentences short. This supports comprehension for lower-CEFR users and overlaps with cognitive accessibility. (UI is English-only at launch; ASO localization deferred per [LOCALIZATION_I18N_STRATEGY.md](../06-content-data/LOCALIZATION_I18N_STRATEGY.md).)

## Testing and Acceptance

- **Automated:** run an accessibility lint/scan in CI for missing labels and contrast regressions on the token set.
- **Manual, per release:** full VoiceOver pass and full TalkBack pass through all eight core flows in [USER_FLOWS.md](./USER_FLOWS.md), including the DragDrop tap-to-place fallback.
- **Settings matrix:** verify largest Dynamic Type, Reduce Motion, Increase Contrast, and Bold Text on at least one iOS and one Android device.
- **Acceptance gate:** a screen ships only when (a) every interactive element is labeled and reachable by screen reader, (b) all text meets AA contrast in both themes, (c) no state is color-only, (d) all targets ≥ minimum size, (e) it is fully usable with Reduce Motion on.

## Open Questions

- `requires-product-decision` — **Device test matrix:** which specific iOS/Android versions and screen sizes form the required manual-test set for launch.
- `unresolved` — **Automated a11y tooling:** confirm the chosen RN accessibility scanner/CI integration.
- `requires-implementation-spike` — **IPA for all words:** confirm phonetic transcription is available for every word in content (it is the caption equivalent for audio); flag any tier lacking it.
