# PaywallScreen: dismiss button behind iOS status bar (2026-06-10)

## Bug

`PaywallScreen` (`mobile/src/presentation/screens/PaywallScreen.tsx`) uses a
bare `<View style={{ flex: 1 }}>` as its root element — no `SafeAreaView`, no
`useSafeAreaInsets()`. On notched/Dynamic-Island iPhones (iPhone 11 Pro Max,
iPhone 14+, etc.) the entire header row is rendered at y=0, behind the system
status bar.

**Effect on the dismiss button:**
- Dismiss `Pressable` has `accessibilityLabel="Dismiss paywall"`, rendered in
  the header `View` with `paddingTop: spacing.s4 (16pt)`.
- XCUITest / Maestro reports its bounds as `[387,17][398,37]` — center (392.5, 27).
- The iOS status bar safe area is ~44pt on notched devices; center y=27 is inside
  the status bar zone.
- `tapOn: text: "Dismiss paywall"` sends the tap to (392.5, 27) but `onPress`
  NEVER fires. Before/after screenshots are identical. Confirmed via Maestro debug
  log: `bounds=Bounds(x=387, y=17, width=11, height=20)`.

**Impact:** The dismiss button is physically inaccessible on all notched iOS
devices. Users on those devices cannot complete onboarding without paying — the
paywall cannot be dismissed. This blocks the free-tier path entirely.

## How it was found

E2E-1 Maestro test (`mobile/.maestro/learn-loop.yaml`). The test passes all
onboarding steps (age gate → welcome → goal → diagnostic → knowledge map →
paywall visible) but fails at `tapOn: text: "Dismiss paywall"` — the tap
completes per Maestro but nothing changes on screen.

## Fix (NOT done here — E2E task was YAML-only)

In `PaywallScreen.tsx`, replace:

```tsx
// Before (broken on notched devices):
<View style={{ flex: 1, backgroundColor: colors.bgBase }}>
  <View style={{ paddingHorizontal: spacing.s4, paddingTop: spacing.s4, ... }}>
    ...dismiss button...
  </View>
  ...
</View>
```

with:

```tsx
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Inside PaywallScreen:
const insets = useSafeAreaInsets();

// Apply top inset to header padding:
<View style={{ flex: 1, backgroundColor: colors.bgBase }}>
  <View style={{
    paddingHorizontal: spacing.s4,
    paddingTop: spacing.s4 + insets.top,  // ← add insets.top
    ...
  }}>
    ...dismiss button...
  </View>
  ...
</View>
```

`react-native-safe-area-context` is already a transitive dep (via Expo).
`SafeAreaProvider` is already at the root in `app/_layout.tsx`.

## Affected devices

All iPhones with a notch or Dynamic Island (iPhone X and later). The simulator
used for E2E-1 testing is iPhone 11 Pro Max / iOS 26.3 — a notched device with
44pt safe area top inset.
