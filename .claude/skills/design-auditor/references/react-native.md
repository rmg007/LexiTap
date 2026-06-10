# React Native / Expo Code-Audit Reference — LexiTap

> **LexiTap port.** The upstream skill's "code input" superpowers were written for the
> *web*: HTML, CSS, Vue, Tailwind, MUI/Chakra/shadcn, `box-shadow`, `:focus-visible`,
> `@media`, `<img alt>`, viewport meta, the DOM. **LexiTap has none of that.** It is
> React Native + Expo (managed), TypeScript, `StyleSheet`/`useTheme()`, **nativewind 4.x**
> (Tailwind-like className), `expo-router`. This file is the RN equivalent the audit runs
> against. When a reference file (color.md, spacing.md, etc.) shows a CSS snippet, translate
> it through the mapping here.

---

## Concept mapping: web rule → React Native check

| Web concept (upstream) | React Native / LexiTap equivalent |
|---|---|
| CSS `color`, `background-color` | `StyleSheet`/inline `color`,`backgroundColor`; nativewind `text-*`/`bg-*` |
| `:hover` / `:focus-visible` | **No hover.** Pressed state via `Pressable` `style={({pressed})=>...}` or `onPressIn/Out`; focus is a TV/keyboard concern, rarely applies |
| `@media (prefers-reduced-motion)` | `useReducedMotion()` (reanimated) / `AccessibilityInfo.isReduceMotionEnabled()` |
| `@media` breakpoints | `useWindowDimensions()`, `Platform`, safe-area insets; orientation. Not CSS media queries |
| `aria-label` | `accessibilityLabel` |
| `role="button"` / landmarks | `accessibilityRole="button"|"header"|"link"|"image"|"adjustable"` |
| `aria-hidden` | `accessibilityElementsHidden` / `importantForAccessibility="no-hide-descendants"` |
| `<label for>` / form labels | `accessibilityLabel` on the input; visible `<Text>` label above |
| `alt` text on `<img>` | `accessibilityLabel` + `accessibilityRole="image"` on `<Image>`; decorative → `accessibilityElementsHidden` |
| `box-shadow` | iOS `shadowColor/Opacity/Radius/Offset`; Android `elevation`. Both needed. |
| `border-radius` | `borderRadius` — must be `radii.sm/md/lg/full` (8/12/20/999) |
| `outline: none` (focus removal) | N/A — don't flag. RN has no default focus ring to remove |
| viewport meta tag | N/A |
| Tailwind `p-[13px]` arbitrary | nativewind `p-[13px]` arbitrary → 🟡 (off-grid); `p-4` etc. resolve via the nativewind/tailwind config |
| `<button>`, `<a>` | `Pressable`/`TouchableOpacity`/`Button`; `expo-router` `<Link>` |
| CSS custom properties / tokens | `useTheme()` → `tokens.ts` (`colors.*`, `spacing.s*`, `radii.*`, `typography.*`) |

---

## LexiTap token vocabulary (the source of truth)

`mobile/src/presentation/theme/tokens.ts`. Any UI value should resolve to one of these.
Hardcoded literals that don't = Cat 17 issues.

- **Spacing (8pt grid):** `s1 4 · s2 8 · s3 12 · s4 16 · s5 24 · s6 32 · s7 48 · s8 64`
- **Radii:** `sm 8 · md 12 · lg 20 · full 999`
- **Type scale:** `h1 44/48 · display 34/38 · title 28/34 · headline 18/22 · bodyLg 18/26 · body 15/24 · label 14/20 · caption 13/18 · smallCaps 11/16 · mono 14/20`
- **Motion (ms):** `fast 120 · base 220 · slow 360`  ·  **Springs:** `snap · settle · sheet`
- **Color roles:** `bgBase/Surface/SurfaceRaised/SurfaceSunken · borderSubtle/Strong · textPrimary/Secondary/Tertiary · accent · accentPressed · accentSubtle · onAccent · accentText · success(Subtle) · caution(Subtle) · streak · destructive`. Dark is **canonical**; light is derived.

---

## Direct RN checks (run automatically on code input)

### Accessibility (Cat 6) — highest value on RN
```
- Pressable/Touchable/icon-only control with no accessibilityLabel AND no child text → 🔴
- <Image> conveying meaning with no accessibilityLabel/role="image" → 🔴
  decorative image not hidden (accessibilityElementsHidden) → 🟡
- Interactive element with no accessibilityRole → 🟡
- Touch target < 44×44: Pressable/icon button with width/height < 44 and no hitSlop → 🔴
  (RN fix: add hitSlop={{top:N,...}} or size the control to 44 — cite both options)
- Custom toggle/slider missing accessibilityState ({checked}/{selected}/{disabled}) → 🟡
- Dynamic Type: hardcoded fontSize on body text with allowFontScaling={false} → 🟡
  (LexiTap clamps scaling via fontScaleMax — fixed-scale is only correct for `mono` counters)
- Decorative/animated content with no useReducedMotion() guard → 🟡 (see animation.md)
```

### Tokens & consistency (Cat 17 / Cat 5)
```
- Hardcoded hex color literal in a component instead of useTheme().colors.* → 🟡
  (< ~50% theme coverage in a file → 🔴)
- Hardcoded spacing px not on the s1–s8 grid → 🟡; on-grid but literal (16 vs spacing.s4) → 🟢 tip
- borderRadius literal not in radii (e.g. 7, 11) → 🟡
- Light-mode hardcoded color (defeats dark-canonical theming) → 🔴
- nativewind arbitrary values: p-[13px], rounded-[7px], text-[#abc] → each 🟡
- Multiple one-off button/card implementations instead of a shared component → 🟡
```

### Shadows & elevation (Cat 14)
```
- iOS shadow* set but no Android elevation (or vice-versa) → 🟡 (renders on one platform only)
- Pure black shadowColor #000 at high opacity → 🟡 (use low opacity; see elevation.md)
- Elevation hierarchy inverted (modal shadow ≤ card) → 🟡
- Dark mode (canonical) leaning on shadows for depth → prefer bgSurfaceRaised vs bgSurface → 🟡
```

### Motion (Cat 8)
```
- reanimated/Animated value with no reduced-motion path → 🟡 (use springs/motion tokens + useReducedMotion)
- Duration not from motion tokens (fast/base/slow) → 🟢
- Infinite loop animation with no pause → 🟡
```

### States (Cat 11) — the forgotten 30%
```
- Data fetch (use*Query/useEffect+await) with no loading branch → 🔴
- List/empty render returns null with no empty state → 🔴 (needs icon + explanation + next action)
- catch/isError with no error UI / no retry → 🔴
- Disabled control with no visual distinction (opacity) → 🟡
- Action with no success feedback → 🟡
- Loading region with no accessibilityState/announcement for screen readers → 🟡
```

### Microcopy (Cat 12)
```
- Button label not a verb ("OK"/"Submit"/"Yes") → 🟡  ✅ "Save changes", "Start learning"
- Error string technical ("Invalid input", error.message raw) → 🟡
- TextInput placeholder used as the only label → 🔴
- lorem ipsum / TODO / TBD in UI strings → 🔴 at dev-handoff stage
```

---

## LexiTap hard invariants (enforced — flag as 🚫 Blocker)

These are project rules from CLAUDE.md/AGENTS.md, not generic design opinion. The guardrails
hook (`.claude/hooks/guardrails.mjs`) hard-blocks the writes; the audit should still **flag** them:

```
🚫 <TextInput> anywhere in QuizScreen.tsx / quiz/ / components/assessments/
   → Passive-recognition UX only. Quiz answers are click/drag, never typed.
🚫 ${...} interpolation in SQL under infrastructure/db/ → parameterized SQL only.
🚫 console.log persistent writes in production code → logger must no-op in prod.
🚫 Analytics/crash SDK sending PII/identity, or un-env-gated → see Forbidden Patterns.
```

Plus the safe-area lesson (memory `2026-06-10_paywall-safe-area-bug.md`): full-screen
overlays/modals (Paywall etc.) that place tappable controls without `useSafeAreaInsets()` →
🔴 (control can render behind the notch/status-bar safe area; tap silently no-ops).

High-risk paths (`infrastructure/db|srs|iap|storage|crash|analytics`) are confirmation-gated —
audit-only; never edit them as part of an audit fix.

---

## Fix output format (RN)

Show real before/after diffs. Prefer token-bound fixes.

```
StyleSheet:
  Before: padding: 13,                 →  After: padding: spacing.s3,   // 12 — 8pt grid
  Before: color: '#8a8a8a',            →  After: color: colors.textTertiary,
  Before: <Pressable onPress={...}>     →  After: <Pressable accessibilityRole="button"
            <Icon name="close" />                    accessibilityLabel="Close" hitSlop={8}>
          </Pressable>                                 <Icon name="close" /></Pressable>
nativewind:
  Before: className="p-[13px] rounded-[7px]"  →  After: className="p-3 rounded-lg"  // 12px / radii.lg
```

When fixing, edit `mobile/src/` source — never hand-edit generated assets. "Done" for any code
change = `cd mobile && npm run check` passes (lint + typecheck + test).
