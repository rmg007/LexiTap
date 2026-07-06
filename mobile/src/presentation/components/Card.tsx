import React, { type ReactNode } from 'react';
import { Pressable, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { Surface } from 'react-native-paper';
import { useTheme } from '@/presentation/theme';
import { usePressScale } from '@/presentation/hooks/usePressScale';

// ─── Card ─────────────────────────────────────────────────────────────────────
// Generic tactile surface container built on Paper's Surface primitive.
// Surface elevation is driven by the `raised` flag:
//   raised=false (default) → bgSurface  (#171A1C), subtle border
//   raised=true            → bgSurfaceRaised (#1F2426), subtle border
//
// The 1px hairline border replicates the Physical Surface depth system from the
// style guide (rgba(255,255,255,0.06) on dark; Paper theme drives this via
// `outline` in paperTheme.ts).
//
// Pass `onPress` to make the whole card a tappable target (Figma's tappable
// dashboard cards — Foundation Pack, Saved Words): wraps the surface in a
// Pressable, reuses Button's snap-spring press-scale via usePressScale, and
// enforces the 48px WCAG touch-target floor. `interactive` opts into the same
// press animation without a real handler (rare — prefer `onPress`).
// ─────────────────────────────────────────────────────────────────────────────

export interface CardProps {
  children: ReactNode;
  raised?: boolean;
  style?: ViewStyle;
  interactive?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
}

export function Card({
  children,
  raised = false,
  style,
  interactive = false,
  onPress,
  accessibilityLabel,
}: CardProps): React.JSX.Element {
  const { colors, radii, spacing, layout } = useTheme();
  const { animatedStyle, onPressIn, onPressOut } = usePressScale();

  const surfaceStyle: ViewStyle = {
    backgroundColor: raised ? colors.bgSurfaceRaised : colors.bgSurface,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.s4,
    ...(onPress != null ? { minHeight: layout.minTouchTarget } : null),
    ...style,
  };

  if (onPress == null && !interactive) {
    return (
      <Surface elevation={0} style={surfaceStyle}>
        {children}
      </Surface>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityRole={onPress != null ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel}
    >
      <Animated.View style={animatedStyle}>
        <Surface elevation={0} style={surfaceStyle}>
          {children}
        </Surface>
      </Animated.View>
    </Pressable>
  );
}
