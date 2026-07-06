import { useCallback } from 'react';
import type { ViewStyle } from 'react-native';
import { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useMotion } from '@/presentation/theme/useMotion';

// usePressScale — shared tactile press feedback (scale + opacity dip),
// extracted from Button's PrimaryButton so every tappable in the app snaps
// the same way instead of just dropping opacity. Reduce Motion is handled by
// useMotion().spring() returning a zero-duration config — no manual guard needed.

export interface PressScaleOptions {
  /** Scale value while pressed. Default 0.97 (Button's primary press). */
  pressedScale?: number;
}

export interface PressScaleHandlers {
  animatedStyle: ReturnType<typeof useAnimatedStyle<ViewStyle>>;
  onPressIn: () => void;
  onPressOut: () => void;
}

export function usePressScale({ pressedScale = 0.97 }: PressScaleOptions = {}): PressScaleHandlers {
  const { spring } = useMotion();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle<ViewStyle>(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const onPressIn = useCallback(() => {
    scale.value = withSpring(pressedScale, spring('snap'));
    opacity.value = withTiming(0.9, { duration: 80 });
  }, [scale, opacity, spring, pressedScale]);

  const onPressOut = useCallback(() => {
    scale.value = withSpring(1.0, spring('snap'));
    opacity.value = withTiming(1, { duration: 120 });
  }, [scale, opacity, spring]);

  return { animatedStyle, onPressIn, onPressOut };
}
