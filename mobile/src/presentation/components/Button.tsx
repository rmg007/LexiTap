import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '@/presentation/theme';
import { Text } from '@/presentation/components/Text';
import type { ColorTokens } from '@/presentation/theme';

// Button per DESIGN_SYSTEM.md. Variants: primary (filled accent), secondary
// (outlined), tertiary (text), destructive (text-only red, confirm elsewhere).
// Min 48x48 touch target enforced regardless of visual size (WCAG 2.2 AA).

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'destructive';

export interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  label: string;
  variant?: ButtonVariant;
  fullWidth?: boolean;
  disabled?: boolean;
}

function labelColor(variant: ButtonVariant): keyof ColorTokens {
  switch (variant) {
    case 'primary':
      return 'onAccent';
    case 'destructive':
      return 'destructive';
    case 'tertiary':
      return 'accent';
    case 'secondary':
    default:
      return 'textPrimary';
  }
}

export function Button({
  label,
  variant = 'primary',
  fullWidth = false,
  disabled = false,
  ...rest
}: ButtonProps): React.JSX.Element {
  const theme = useTheme();
  const { colors, radii, spacing, layout } = theme;
  const [pressed, setPressed] = useState(false);

  const container: ViewStyle = {
    minHeight: layout.minTouchTarget,
    borderRadius: radii.md,
    paddingHorizontal: spacing.s4,
    paddingVertical: spacing.s3,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: fullWidth ? 'stretch' : 'flex-start',
    opacity: disabled ? 0.4 : 1,
    transform: [{ scale: pressed && variant === 'primary' ? 0.98 : 1 }],
  };

  if (variant === 'primary') {
    container.backgroundColor = pressed ? colors.accentPressed : colors.accent;
  } else if (variant === 'secondary') {
    container.borderWidth = 1;
    container.borderColor = colors.borderStrong;
    container.backgroundColor = 'transparent';
  } else {
    container.backgroundColor = 'transparent';
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={styles.pressable}
      {...rest}
    >
      <View style={container}>
        <Text variant="label" color={labelColor(variant)}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Ensure the touchable spans the container width when full-width.
  pressable: { alignSelf: 'auto' },
});
