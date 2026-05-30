import * as ExpoHaptics from 'expo-haptics';
import { Platform } from 'react-native';

// Haptics service — thin wrapper over expo-haptics implementing exactly the
// 5 interaction events defined in DESIGN_SYSTEM.md § Motion and Haptics.
//
// All calls are fire-and-forget (the Promise is intentionally not awaited at
// callsites). The wrapper no-ops when:
//   • the platform doesn't support haptics (simulator, web)
//   • the user has disabled haptics via the Settings toggle (pass enabled=false)
//
// Haptics confirm; they never punish. There is no error/wrong-answer haptic.

/** Call once per session from the Settings screen toggle. */
let hapticsEnabled = true;
export function setHapticsEnabled(enabled: boolean): void {
  hapticsEnabled = enabled;
}
export function isHapticsEnabled(): boolean {
  return hapticsEnabled;
}

function supported(): boolean {
  // expo-haptics on web/simulator silently no-ops, but we guard anyway.
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

function run(fn: () => Promise<void>): void {
  if (!hapticsEnabled || !supported()) return;
  fn().catch(() => {
    // Haptic failures are non-fatal; swallow silently.
  });
}

/** Option card tap or drag-chip pickup — light selection feedback. */
export function hapticsSelect(): void {
  run(() => ExpoHaptics.selectionAsync());
}

/** Correct answer confirmed. Single, soft success pulse. */
export function hapticsCorrect(): void {
  run(() =>
    ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Success),
  );
}

/** Gentle correction on wrong answer — light impact, never a heavy error buzz. */
export function hapticsCorrection(): void {
  run(() => ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Light));
}

/** Streak integer incremented — medium confirmation pulse. */
export function hapticsStreakIncrement(): void {
  run(() => ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Medium));
}

/** Full session complete — same success pulse as correct answer. */
export function hapticsSessionComplete(): void {
  run(() =>
    ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Success),
  );
}
