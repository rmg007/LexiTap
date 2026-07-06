import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme } from '@/presentation/theme';
import { useMotion } from '@/presentation/theme/useMotion';
import { Icon } from '@/presentation/components/Icon';

// ─── ProgressBar ──────────────────────────────────────────────────────────────
// Linear progress meter (daily-cap meter, session header). Fill is a plain
// Animated.View absolutely positioned inside the track (Paper's own
// ProgressBar can't be driven from outside, so it isn't used here) — width
// interpolates 0→value on mount and on every value change via
// useMotion().timing('base'), degrading to an instant snap under Reduce Motion.
//
// `tone` is an explicit, opt-in prop — default 'accent' keeps every existing
// call site (session/diagnostic progress counters) visually unchanged. Callers
// that track a real completion state (daily cap, tier mastery) pass
// tone="success" once the underlying value has actually reached its goal;
// only then, at progress >= 1, does the bar render a check icon — color alone
// never carries the "done" state (WCAG 1.4.1).
// ─────────────────────────────────────────────────────────────────────────────

export interface ProgressBarProps {
  /** Clamped to [0, 1]. */
  progress: number;
  label?: string;
  height?: number;
  tone?: 'accent' | 'success';
}

/** Clamp a value into [0, 1]. Exported for unit testing. */
export function clampProgress(value: number): number {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

export function ProgressBar({
  progress,
  label,
  height = 8,
  tone = 'accent',
}: ProgressBarProps): React.JSX.Element {
  const { colors, radii } = useTheme();
  const { timing } = useMotion();
  const value = clampProgress(progress);
  const complete = tone === 'success' && value >= 1;
  const fillColor = tone === 'success' ? colors.success : colors.accent;

  const width = useSharedValue(0);
  useEffect(() => {
    width.value = withTiming(value * 100, timing('base'));
  }, [value, width, timing]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }));

  // Enough room for a legible check glyph without clipping thin session bars.
  const showCheckIcon = complete && height >= 16;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={complete ? `${label ?? 'Progress'}, complete` : label}
      accessibilityValue={{ min: 0, max: 1, now: value }}
      style={{
        height,
        borderRadius: radii.full,
        overflow: 'hidden',
        backgroundColor: colors.borderSubtle,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <Animated.View
        style={[
          {
            height,
            borderRadius: radii.full,
            backgroundColor: fillColor,
          },
          fillStyle,
        ]}
      />
      {showCheckIcon && (
        <View style={{ position: 'absolute', right: 2 }}>
          <Icon name="check" size={height - 2} colorValue={colors.onAccent} />
        </View>
      )}
    </View>
  );
}

// ─── SegmentedProgress ────────────────────────────────────────────────────────
// Dot-segment progress indicator (study session header, onboarding steps).
// Source: .design-specs/html/screens/study_session-html.html #header_001
//
//   total     — total number of segments
//   current   — number of fully-completed segments (1-based count)
//   active    — index of the segment currently in progress (0-based)
// ─────────────────────────────────────────────────────────────────────────────

export interface SegmentedProgressProps {
  total: number;
  current: number;
  label?: string;
}

export function SegmentedProgress({
  total,
  current,
  label,
}: SegmentedProgressProps): React.JSX.Element {
  const { colors } = useTheme();

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: total, now: current }}
      style={{ flexDirection: 'row', gap: 6 }}
    >
      {Array.from({ length: total }, (_, i) => {
        const isComplete = i < current;
        const isActive = i === current;

        return (
          <View
            key={i}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              backgroundColor: isComplete
                ? colors.accent
                : isActive
                  ? 'rgba(32,178,170,0.4)' // in-progress: 40% teal
                  : colors.borderSubtle,
            }}
          />
        );
      })}
    </View>
  );
}
