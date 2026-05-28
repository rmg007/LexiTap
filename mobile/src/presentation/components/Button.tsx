import React from 'react';
import { Pressable, View, type PressableProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Button as PaperButton } from 'react-native-paper';
import { useTheme } from '@/presentation/theme';
import { Text } from '@/presentation/components/Text';

// ─── Button ───────────────────────────────────────────────────────────────────
// Variants:
//   primary     → teal gradient CTA (64px height). Pressed: scale 0.95, op 0.9.
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

export function Button({
  label,
  variant = 'primary',
  fullWidth = false,
  disabled = false,
  ...rest
}: ButtonProps): React.JSX.Element {
  const { colors, radii } = useTheme();

  // ── Secondary / Tertiary / Destructive: delegate to Paper Button ──────────
  if (variant !== 'primary') {
    const mode =
      variant === 'secondary' ? ('outlined' as const) : ('text' as const);
    const textColor =
      variant === 'destructive' ? colors.destructive : undefined;

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

  // ── Primary: Pressable + LinearGradient ───────────────────────────────────
  // Gradient colors: default #20B2AA→#178F88, pressed shifts darker.
  const GRAD_DEFAULT = ['#20B2AA', '#178F88'] as const;
  const GRAD_PRESSED = ['#1A938C', '#0F6E68'] as const;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      className={fullWidth ? 'self-stretch' : 'self-start'}
      {...rest}
    >
      {({ pressed }) => (
        <View
          className="overflow-hidden"
          style={{
            borderRadius: radii.sm,
            opacity: disabled ? 0.3 : pressed ? 0.9 : 1,
            transform: [{ scale: pressed ? 0.95 : 1 }],
            // Teal glow shadow (primary CTA surface depth)
            shadowColor: '#20B2AA',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: disabled ? 0 : 0.3,
            shadowRadius: 20,
            elevation: disabled ? 0 : 6,
          }}
        >
          <LinearGradient
            colors={pressed ? GRAD_PRESSED : GRAD_DEFAULT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ height: 64, minWidth: 48 }}
            className="flex-row items-center justify-center px-s4"
          >
            <Text
              variant="headline"
              color="onAccent"
              style={{ fontFamily: 'Inter_700Bold' }}
            >
              {label}
            </Text>
          </LinearGradient>
        </View>
      )}
    </Pressable>
  );
}
