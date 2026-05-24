import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/presentation/theme';

// Linear progress meter (daily-cap meter, session progress). Fills `accent` on
// a `border.subtle` track. Color is paired with an accessibility value so
// meaning is never color-only (ACCESSIBILITY_REQUIREMENTS.md).

export interface ProgressBarProps {
  // Clamped to [0, 1].
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
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
      style={{
        height,
        borderRadius: radii.full,
        backgroundColor: colors.borderSubtle,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          width: `${value * 100}%`,
          height: '100%',
          backgroundColor: colors.accent,
          borderRadius: radii.full,
        }}
      />
    </View>
  );
}
