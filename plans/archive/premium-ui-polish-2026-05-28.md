# Premium UI Polish Plan
**Created:** 2026-05-28  
**Scope:** Mobile app visual and interaction quality  
**Audience:** Global ESL learners, many on mid-tier Android

---

## Honest filter applied to the research

The research was written for apps like Instagram or a Duolingo-scale product. Several recommendations would actively harm LexiTap:

- **Liquid Glass / Skia backdrop blur** — Hard no. Target users are frequently on mid-to-low tier Android. Backdrop blur via Skia tanks frame rate to 15–20 FPS on that hardware. It also contradicts the "minimal chrome" design principle. An elegant surface is not a frosted-glass card.
- **Neomorphism** — Hard no. Contradicts the design system's explicit "no boxes, no borders, no chrome" principle. Neomorphism is decoration; decoration is what this app avoids by design.
- **SF Symbols / expo-symbols** — No. The Lucide decision is locked (Apache 2.0, consistent cross-platform). SF Symbols creates iOS/Android visual divergence and contradicts the decision to ship one consistent icon family.
- **Tamagui migration** — No. Already on NativeWind v4 which is the right stack. Migrating would be a major refactor for no user-visible gain.
- **Pulsar haptics SDK** — No. Overkill. The designed haptic vocabulary (5 events, all simple) maps exactly to `expo-haptics` presets. Pulsar is for apps shipping custom haptic envelopes and sustained resonance effects.
- **react-native-ease** — No. Less mature than Reanimated, which already covers everything needed.
- **react-native-keyboard-controller** — No. The app has zero `TextInput` by architectural rule. Keyboard management is a non-problem.
- **AI adaptive interfaces / zero-click navigation / voice UI** — Out of scope entirely. Not this product.

**What the research got right that actually applies here:**
1. Physics-based animation via Reanimated (not on the JS thread)
2. Haptic reinforcement wired to real interaction events
3. Clamped dynamic type scaling
4. Systematic accessibility attributes
5. Spring physics for interactive gestures
6. `expo-image` for the upcoming ImageMatch widget
7. Tabular figures verification on counters

---

## What to implement

### P0 — Missing foundations (blockers for quiz widget quality)

#### 1. Add react-native-reanimated + react-native-gesture-handler

**Why it matters:** The DragDrop quiz widget is designed around chip lift (scale 1.04 + shadow on drag start), snap-to-zone on release, and settle animation. These are currently unimplementable without Reanimated. Without it, animations run on the JS bridge — every interaction feels slightly sticky on a loaded device. This is the single biggest gap between the current codebase and the premium feel the design specifies.

**Scope:**
- Add `react-native-reanimated` and `react-native-gesture-handler` to `mobile/package.json`
- Add Reanimated babel plugin to `babel.config.js`
- Replace all current `Animated` API usage (if any) with Reanimated shared values
- Gate DragDrop widget implementation behind this being in place

**Libraries:** `react-native-reanimated@3`, `react-native-gesture-handler@2`

---

#### 2. Wire expo-haptics to the 5 designed interaction events

**Why it matters:** The design system defines 5 haptic events precisely. Currently nothing is wired — interactions are silent. On iOS especially, haptic silence on a tap-based vocabulary app reads as unpolished.

**Designed events (from DESIGN_SYSTEM.md):**

| Event | expo-haptics call |
|-------|-------------------|
| Option select / drag pickup | `selectionAsync()` |
| Correct answer | `notificationAsync(NotificationFeedbackType.Success)` |
| Gentle correction | `impactAsync(ImpactFeedbackStyle.Light)` |
| Streak incremented | `impactAsync(ImpactFeedbackStyle.Medium)` |
| Session complete | `notificationAsync(NotificationFeedbackType.Success)` |

**Scope:**
- Add `expo-haptics` to `mobile/package.json`
- Create `src/presentation/services/haptics.ts` — a thin wrapper that reads the user's haptic preference (Settings screen toggle) and no-ops when disabled or when platform doesn't support it
- Wire each event at the callsite (quiz option press, drag pickup, feedback display, streak update, session end)
- Android note: impact/selection haptics fall back to short vibrations on Android — this is acceptable and expected

---

### P1 — Interaction quality (noticeable premium delta)

#### 3. Spring physics for interactive elements

**Why it matters:** The current design system specifies `cubic-bezier(0.2, 0, 0, 1)` for all transitions. That's fine for layout transitions (sheet present, card swap). But tappable elements — option cards, chips, buttons — should use spring physics so they respond to touch velocity and feel physical rather than mechanical. A card that responds as though it has slight mass feels premium; a card that scales on a fixed curve feels like CSS.

**Specific interactions:**

| Element | Current | Target |
|---------|---------|--------|
| Primary button press | static / CSS scale | `withSpring` to 0.97, rebound on release |
| Quiz option card select | none defined | `withSpring` border highlight, `withSpring` fill |
| DragDrop chip pickup | "scale 1.04" (unimplemented) | `withSpring(1.04, { stiffness: 400, damping: 20 })` |
| DragDrop chip release | "settle animation" (unimplemented) | `withSpring(1.0, { stiffness: 200, damping: 18 })` snap-to-zone |
| Bottom sheet present | basic modal | `withSpring` enter from bottom |

**Spring presets to establish in `src/presentation/theme/motion.ts`:**

```ts
export const springs = {
  // For interactive taps — fast, snappy
  snap: { stiffness: 400, damping: 25, mass: 0.8 },
  // For drag-and-drop settle — feels physical
  settle: { stiffness: 200, damping: 18, mass: 1.0 },
  // For sheet/modal entry — relaxed, not bouncy
  sheet: { stiffness: 280, damping: 28, mass: 1.0 },
} as const;
```

---

#### 4. Clamped dynamic typographic scaling

**Why it matters:** The design system says "all sizes scale with OS Dynamic Type" but there's no implementation. Without clamping, a user who cranks accessibility text size to maximum will break the quiz prompt layout — the 34pt `display` token becomes 68pt and wraps mid-word. The research's formula is exactly right here.

**Formula:**
$$\text{ScaledSize} = \text{BaseSize} \times \min(\max(\text{FontScale}, 0.85), \text{MaxScale})$$

**Per-token max multipliers:**

| Token | Base size | Max multiplier | Rationale |
|-------|-----------|----------------|-----------|
| `display` | 34 | 1.2 | Quiz prompt — layout breaks above this |
| `title` | 28 | 1.3 | Screen headers |
| `headline` | 22 | 1.4 | Card headers |
| `body.lg` | 18 | 1.8 | Definitions — readability primary |
| `body` | 16 | 1.8 | Body text |
| `label` | 14 | 1.6 | Buttons and chips |
| `caption` | 13 | 1.8 | Captions can grow |
| `mono` | 14 | 1.0 | Streak counter — `allowFontScaling={false}` to preserve badge layout |

**Scope:**
- Add `PixelRatio.getFontScale()` read in `ThemeProvider`
- Export a `useScaledFont(token)` hook from the theme layer
- `Dimensions.addEventListener('change')` for live-update when user changes system text size mid-session
- Apply `maxFontSizeMultiplier` prop to all Text components in the presentation layer
- Apply `allowFontScaling={false}` on the streak counter badge and any numeric badges

---

#### 5. Reduce Motion support

**Why it matters:** The design system says "all motion respects Reduce Motion by collapsing to cross-fade" but nothing implements this. It's a documented accessibility commitment that isn't delivered. For some users (vestibular disorders) the absence of this is not a polish issue — it's a usability barrier.

**Scope:**
- Read `AccessibilityInfo.isReduceMotionEnabled()` in `ThemeProvider` and expose a `reduceMotion: boolean` via the theme context
- Create a `useMotion()` hook: returns animation configs that substitute `duration: 0, type: 'timing'` (instant cross-fade) for every spring/timing spec when `reduceMotion` is true
- All Reanimated animations route through `useMotion()` — no direct `withSpring` calls at callsite; always through the hook
- Subscribe to `AccessibilityInfo.addEventListener('reduceMotionChanged', ...)` for live-toggle

---

### P2 — Correctness and finish (high effort-to-quality ratio details)

#### 6. Systematic accessibility attributes pass

**Why it matters:** Premium is defined partly by screen reader behavior. An app that announces "Image" or nothing on interactive elements reads as unfinished. The existing screens almost certainly lack consistent `accessibilityRole`, `accessibilityState`, and `accessibilityHint`.

**Scope — per screen:**
- **All interactive elements:** `accessibilityRole="button"` (or appropriate role), `accessibilityLabel` with human-readable name, `accessibilityHint` for non-obvious actions
- **Quiz option cards:** `accessibilityRole="radio"`, `accessibilityState={{ selected: isSelected, checked: isCorrect }}` (after feedback reveal)
- **Streak chip:** `accessibilityLabel="Streak: 7 days"` (computed string, not just the integer)
- **Progress ring:** `accessibilityRole="progressbar"`, `accessibilityValue={{ min: 0, max: 100, now: masteryPercent }}`
- **DragDrop chips:** `accessibilityRole="adjustable"`, implement `accessibilityActions` with increment/decrement as single-pointer alternatives to drag (WCAG 2.5.7)
- **`hitSlop`:** Every element that visually renders below 44×44pt needs `hitSlop={{ top: N, bottom: N, left: N, right: N }}` to reach 44×44 minimum (WCAG 2.5.5)
- **Tab bar icons:** Verify all have `accessibilityLabel` + `accessibilityRole="tab"` + `accessibilityState={{ selected }}`

---

#### 7. Tabular figures verification

**Why it matters:** The design system explicitly specifies tabular figures on all numeric displays so numbers don't shift width as they update. This is a fine detail that matters on the streak counter (which changes every session) and on the progress ring percentage.

**Scope:**
- Audit all `Text` components rendering numeric values in `HomeScreen`, `ProgressScreen`, `SettingsScreen`
- Verify `fontVariant: ['tabular-nums']` is applied in the `mono` token styles and wherever `mono` is used
- Fix any counter that is missing it

---

#### 8. expo-image for ImageMatch (pre-work, Phase 4)

**Why it matters:** When ImageMatch is built (Phase 4), it will display a 2×2 or 3×2 grid of contextual images loaded from the content DB. Standard RN `Image` does no memory management — loading 6 images in a quiz screen on a 2GB-RAM device causes OOM crashes. `expo-image` handles blurhash placeholders, memory caps, and WebP decode with no extra code.

**Scope:**
- Add `expo-image` to `mobile/package.json` now (it's an Expo first-party library, zero config)
- Replace the standard `Image` import in any existing usage with `expo-image`'s `Image`
- When ImageMatch is implemented, use `expo-image` from day one with `contentFit="cover"` and `transition` for the reveal

---

## What this plan explicitly excludes and why

| Excluded | Reason |
|----------|--------|
| React Native Skia / Liquid Glass | Mid-tier Android GPU; contradicts minimal-chrome principle |
| Neomorphism | Directly contradicts design system ("no chrome, no boxes") |
| SF Symbols / expo-symbols | Lucide is the locked icon decision; SF Symbols creates platform divergence |
| Tamagui migration | Already on NativeWind v4; no user-visible gain |
| Pulsar haptics | 5 simple events; expo-haptics is exactly sufficient |
| react-native-keyboard-controller | No TextInput in the app; non-problem |
| react-native-ease | Less mature than Reanimated; no additive benefit |
| Voice UI | Not the input model; passive recognition only |
| AI adaptive interfaces | Out of scope; not this product |
| Zustand/Jotai state rewrite | Architecture concern, not visual premium; separate track |

---

## Execution order

```
P0-1: Add Reanimated + Gesture Handler  ← gate on quiz widget implementation
P0-2: Wire expo-haptics                  ← 1–2 days, high visible impact
P1-3: Spring physics presets + Reanimated animations
P1-4: Clamped type scaling               ← accessibility requirement, not optional
P1-5: Reduce Motion hook                 ← accessibility commitment delivery
P2-6: Accessibility attribute pass       ← per-screen audit, can be parallelized
P2-7: Tabular figures audit              ← 1 hour fix
P2-8: expo-image swap                    ← pre-work for Phase 4, low risk
```

P0 items should land before any quiz widget is considered production-ready. P1 items are the core of the "premium feel" delta. P2 items are polish and correctness.

---

## Expected outcome

The combined effect of P0–P1 items:
- Interactions feel physically grounded (spring physics + haptics)
- Animations never drop frames under load (UI thread via Reanimated)
- The app behaves correctly for accessibility users (Reduce Motion, Dynamic Type, screen readers)
- The quiz widgets can actually be built to spec (Reanimated + Gesture Handler prerequisite)

None of this is visible decoration. Premium here means the app responds like it has zero latency, every touch is confirmed, and it never breaks for edge-case users. That is the right definition for this product and this audience.
