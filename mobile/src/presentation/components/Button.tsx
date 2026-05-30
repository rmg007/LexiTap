import React, { useCallback } from 'react';
import { Pressable, type PressableProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Button as PaperButton } from 'react-native-paper';
import { useTheme } from '@/presentation/theme';
import { useMotion } from '@/presentation/theme/useMotion';
import { Text } from '@/presentation/components/Text';

// ─── Button ───────────────────────────────────────────────────────────────────
// Variants:
//   primary     → teal gradient CTA (64px height). Press: spring to 0.97.
//                 Disabled: op 0.3.  Uses Pressable + LinearGradient so the
//                 gradient surface is preserved across all states.
//   secondary   → Paper outlined button — thin border, transparent bg.
//   tertiary    → Paper text button — teal label, no chrome.
//   destructive → Red text button, confirm-modal use only.
//
// WCAG 2.2 AA: minimum 48×48 touch target enforced on primary; Paper handles
// it internally for secondary/tertiary.
// ─────────────────────────────────────────────────────────────────────────────

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'destructive';

export interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  label: string;
  variant?: ButtonVariant;
  fullWidth?: boolean;
  disabled?: boolean;
}

// Separate component so Reanimated hooks are always called unconditionally.
function PrimaryButton({
  label,
  fullWidth,
  disabled,
  ...rest
}: ButtonProps): React.JSX.Element {
  const { radii } = useTheme();
  const { spring } = useMotion();

  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.97, spring('snap'));
    opacity.value = withTiming(0.9, { duration: 80 });
  }, [scale, opacity, spring]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1.0, spring('snap'));
    opacity.value = withTiming(1, { duration: 120 });
  }, [scale, opacity, spring]);

  const GRAD_DEFAULT = ['#20B2AA', '#178F88'] as const;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={fullWidth ? { alignSelf: 'stretch' } : { alignSelf: 'flex-start' }}
      {...rest}
    >
      <Animated.View
        style={[
          animatedStyle,
          {
            borderRadius: radii.sm,
            opacity: disabled ? 0.3 : undefined,
            shadowColor: '#20B2AA',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: disabled ? 0 : 0.3,
            shadowRadius: 20,
            elevation: disabled ? 0 : 6,
            overflow: 'hidden',
          },
        ]}
      >
        <LinearGradient
          colors={GRAD_DEFAULT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            height: 64,
            minWidth: 48,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text variant="headline" color="onAccent" style={{ fontFamily: 'Inter_700Bold' }}>
            {label}
          </Text>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

export function Button({
  label,
  variant = 'primary',
  fullWidth = false,
  disabled = false,
  ...rest
}: ButtonProps): React.JSX.Element {
  const { colors } = useTheme();

  if (variant === 'primary') {
    return (
      <PrimaryButton label={label} variant={variant} fullWidth={fullWidth} disabled={disabled} {...rest} />
    );
  }

  const mode = variant === 'secondary' ? ('outlined' as const) : ('text' as const);
  const textColor = variant === 'destructive' ? colors.destructive : undefined;

  return (
    <PaperButton
      mode={mode}
      onPress={rest.onPress as () => void}
      disabled={disabled}
      textColor={textColor}
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={fullWidth ? { alignSelf: 'stretch' } : undefined}
      contentStyle={{ height: 48 }}
      labelStyle={{ fontFamily: 'Inter_600SemiBold', fontSize: 15 }}
    >
      {label}
    </PaperButton>
  );
}


