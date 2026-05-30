---
applyTo: "mobile/src/presentation/**,mobile/app/**"
---

# LexiTap Presentation Layer — UI Standards

Full rationale in `lexitap-docs/05-engineering-process/CODING_STANDARDS.md` § Presentation Layer UI Standards. This file is the quick-check list loaded at edit time.

## Animation — route through useMotion(), never direct Reanimated

```tsx
// WRONG
scale.value = withSpring(0.97, { stiffness: 400, damping: 25 });

// CORRECT
const { spring } = useMotion();
scale.value = withSpring(0.97, spring('snap'));
```

- **Spring presets:** `snap` (taps), `settle` (drag release), `sheet` (modal entry)
- Never import `Animated` from `react-native` — Reanimated only
- `useMotion()` makes every animation Reduce Motion-safe automatically

## Haptics — always via haptics.ts wrapper

```tsx
import { hapticsSelect, hapticsCorrect, hapticsCorrection,
         hapticsStreakIncrement, hapticsSessionComplete } from '@/presentation/services/haptics';
```

| Interaction | Function |
|-------------|----------|
| Tap card / pick up chip | `hapticsSelect()` |
| Correct answer | `hapticsCorrect()` |
| Wrong answer | `hapticsCorrection()` |
| Streak incremented | `hapticsStreakIncrement()` |
| Session complete | `hapticsSessionComplete()` |

Never call `expo-haptics` directly. Never add haptics to passive/navigation events.

## Typography — always `<Text variant="...">`, never hardcoded

```tsx
// WRONG: <RNText style={{ fontSize: 34 }}>
// CORRECT:
<Text variant="display" color="textPrimary">...</Text>
```

- Use `tabularNums` prop on any number that changes (counters, scores)
- `mono` variant handles tabular nums automatically

## Accessibility — required on every interactive element

Buttons / Pressables:
```tsx
accessibilityRole="button"
accessibilityLabel="Human-readable name"
accessibilityState={{ disabled }}
```

Touch target < 48pt → add `hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}`

Quiz option cards → `accessibilityRole="radio"`, container → `accessibilityRole="radiogroup"`

Progress bars → `accessibilityRole="progressbar"` + `accessibilityValue={{ min, max, now }}`

Result text revealed after submit → `accessibilityLiveRegion="polite"`

## Images — expo-image only

```tsx
import { Image } from 'expo-image';   // not react-native
<Image source={...} contentFit="cover" transition={150} />
```

## Hard no-list (never add regardless of brief)

- Skia / backdrop blur — kills mid-tier Android FPS
- Neomorphism / heavy shadows — contradicts "no chrome" design principle
- SF Symbols — platform divergence; Lucide is locked
- `react-native-keyboard-controller` — no TextInput in app
- Direct `withSpring` at callsite — bypasses Reduce Motion
- Direct `expo-haptics` calls — bypasses user haptic setting
- `react-native`'s `Animated` API — JS thread; use Reanimated
- Hardcoded font sizes, colors, or weights — use tokens
