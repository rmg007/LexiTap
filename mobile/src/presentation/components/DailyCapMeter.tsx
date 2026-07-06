import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/presentation/theme';
import { useMotion } from '@/presentation/theme/useMotion';
import { Icon } from '@/presentation/components/Icon';
import { clampProgress } from '@/presentation/components/ProgressBar';

// ─── DailyCapMeter ────────────────────────────────────────────────────────────
// Home's daily-goal meter (Figma `300:14`) — a taller, teal-gradient meter
// distinct from the generic 8px ProgressBar, matching the finalized Figma
// (the shipped code buried the daily goal in the plain thin bar). Same
// gradient stops as the primary Button (#20B2AA→#178F88) so the one scarce
// teal moment on Home reads as the same brand gesture.
//
// Fill animates 0→value on mount and on every value change via
// useMotion().timing('base'). At completion the fill flips to a solid
// `success` color with a check icon — color never carries the done state
// alone (WCAG 1.4.1).
// ─────────────────────────────────────────────────────────────────────────────

export interface DailyCapMeterProps {
  completed: number;
  cap: number;
  height?: number;
}

const GRADIENT = ['#20B2AA', '#178F88'] as const;

export function DailyCapMeter({ completed, cap, height = 34 }: DailyCapMeterProps): React.JSX.Element {
  const { colors, radii } = useTheme();
  const { timing } = useMotion();
  const value = cap > 0 ? clampProgress(completed / cap) : 0;
  const complete = value >= 1;

  const width = useSharedValue(0);
  useEffect(() => {
    width.value = withTiming(value * 100, timing('base'));
  }, [value, width, timing]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${width.value}%` }));

  const label = `${completed} of ${cap} reviews`;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={complete ? `${label}, complete` : label}
      accessibilityValue={{ min: 0, max: 1, now: value }}
      style={{
        height,
        borderRadius: radii.full,
        overflow: 'hidden',
        backgroundColor: colors.borderSubtle,
      }}
    >
      <Animated.View style={[{ height, overflow: 'hidden' }, fillStyle]}>
        {complete ? (
          <View
            style={{
              flex: 1,
              backgroundColor: colors.success,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'flex-end',
              paddingRight: 8,
            }}
          >
            <Icon name="check" size={height - 16} colorValue={colors.onAccent} />
          </View>
        ) : (
          <LinearGradient
            colors={GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ flex: 1, height }}
          />
        )}
      </Animated.View>
    </View>
  );
}
