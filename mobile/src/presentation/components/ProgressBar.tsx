import React from 'react';
import { View } from 'react-native';
import { ProgressBar as PaperProgressBar } from 'react-native-paper';
import { useTheme } from '@/presentation/theme';

// ─── ProgressBar ──────────────────────────────────────────────────────────────
// Linear progress meter (daily-cap meter, session header). Built on Paper's
// ProgressBar so theme color and accessibility are inherited automatically.
// Accessibility: progressbar role + value range handled by Paper.
// ─────────────────────────────────────────────────────────────────────────────

export interface ProgressBarProps {
  /** Clamped to [0, 1]. */
  progress: number;
  label?: string;
  height?: number;
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
}: ProgressBarProps): React.JSX.Element {
  const { colors, radii } = useTheme();
  const value = clampProgress(progress);

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 1, now: value }}
      style={{
        height,
        borderRadius: radii.full,
        overflow: 'hidden',
        backgroundColor: colors.borderSubtle,
      }}
    >
      <PaperProgressBar
        progress={value}
        color={colors.accent}
        style={{
          height,
          borderRadius: radii.full,
          backgroundColor: 'transparent',
        }}
      />
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
      className="flex-row gap-[6px]"
    >
      {Array.from({ length: total }, (_, i) => {
        const isComplete = i < current;
        const isActive = i === current;

        return (
          <View
            key={i}
            className="flex-1"
            style={{
              height: 4,
              borderRadius: 2,
              backgroundColor: isComplete
                ? colors.accent
                : isActive
                  ? 'rgba(32,178,170,0.4)' // in-progress: 40% teal
                  : 'rgba(255,255,255,0.10)',
            }}
          />
        );
      })}
    </View>
  );
}
