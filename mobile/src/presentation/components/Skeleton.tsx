import React, { useEffect } from 'react';
import { type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/presentation/theme';
import { useMotion } from '@/presentation/theme/useMotion';

// ─── Skeleton ─────────────────────────────────────────────────────────────────
// Placeholder block for content that hasn't loaded yet. Pulses opacity so it
// reads as "loading", not "blank"; sized via width/height so a skeleton layout
// reserves the same space as its real-content counterpart (no shift on swap).
// Reduce Motion → a static mid-opacity block instead of an infinite pulse.
// ─────────────────────────────────────────────────────────────────────────────

export interface SkeletonProps {
  width?: number | `${number}%`;
  height: number;
  style?: ViewStyle;
}

const PULSE_DURATION_MS = 700;
const STATIC_OPACITY = 0.65;
const PULSE_LOW_OPACITY = 0.4;

export function Skeleton({ width = '100%', height, style }: SkeletonProps): React.JSX.Element {
  const { colors, radii } = useTheme();
  const { reduceMotion } = useMotion();
  const opacity = useSharedValue(reduceMotion ? STATIC_OPACITY : PULSE_LOW_OPACITY);

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = STATIC_OPACITY;
      return;
    }
    opacity.value = withRepeat(withTiming(1, { duration: PULSE_DURATION_MS }), -1, true);
  }, [reduceMotion, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width,
          height,
          borderRadius: radii.sm,
          backgroundColor: colors.bgSurfaceSunken,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}
