import React, { useCallback } from 'react';
import { Pressable, type PressableProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/presentation/theme';
import { useMotion } from '@/presentation/theme/useMotion';
import { Text } from '@/presentation/components/Text';

// ─── Button ───────────────────────────────────────────────────────────────────
// Variants:
//   primary     → teal gradient CTA (64px height). Press: spring to 0.97.
//   secondary   → outlined border, accent text, 48px height.
//   tertiary    → no chrome, accent text label, 48px height.
//   destructive → red text, no chrome, confirm-modal use only.
//
// ALL variants use Pressable (not PaperButton) so testID/accessibilityLabel
// propagate correctly through XCUITest on New Architecture.
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
  const { colors, radii } = useTheme();

  if (variant === 'primary') {
    return (
      <PrimaryButton label={label} variant={variant} fullWidth={fullWidth} disabled={disabled} {...rest} />
    );
  }

  const labelColor =
    variant === 'destructive' ? colors.destructive : colors.accentText;
  const isOutlined = variant === 'secondary';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      style={({ pressed }) => [
        {
          height: 48,
          minWidth: 48,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: radii.sm,
          opacity: disabled ? 0.3 : pressed ? 0.7 : 1,
        },
        isOutlined && { borderWidth: 1, borderColor: colors.accent },
        fullWidth ? { alignSelf: 'stretch' } : { alignSelf: 'flex-start' },
      ]}
      {...rest}
    >
      <Text
        variant="body"
        style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: labelColor }}
      >
        {label}
      </Text>
    </Pressable>
  );
}


