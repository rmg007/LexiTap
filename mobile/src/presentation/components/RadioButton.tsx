import React from 'react';
import { Pressable, View, type PressableProps } from 'react-native';
import { useTheme } from '@/presentation/theme';

// ─── RadioButton ──────────────────────────────────────────────────────────────
// From component library inputs_106: 20×20 circle indicator.
//   Unselected → white/20 border, transparent fill
//   Selected   → teal border, teal inner dot (w-2.5 h-2.5)
//   Disabled   → 40% opacity, not interactive
//
// WCAG 2.2 AA: accessibilityRole="radio" + accessibilityState.
// Localization: symmetric — no directional concern.
// ─────────────────────────────────────────────────────────────────────────────

export interface RadioButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  selected: boolean;
  disabled?: boolean;
  label?: string;
}

export function RadioButton({
  selected,
  disabled = false,
  label,
  ...rest
}: RadioButtonProps): React.JSX.Element {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      className="items-center justify-center"
      style={{ minWidth: 48, minHeight: 48, opacity: disabled ? 0.4 : 1 }}
      {...rest}
    >
      {/* Outer ring */}
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          borderWidth: 2,
          alignItems: 'center',
          justifyContent: 'center',
          borderColor: selected ? colors.accent : 'rgba(255,255,255,0.20)',
        }}
      >
        {/* Inner dot — only visible when selected */}
        {selected && (
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: colors.accent,
            }}
          />
        )}
      </View>
    </Pressable>
  );
}
