import React from 'react';
import { Pressable, View, type PressableProps } from 'react-native';
import { useTheme } from '@/presentation/theme';

// ─── Checkbox ─────────────────────────────────────────────────────────────────
// From component library inputs_106: 20×20 rounded-md checkbox.
//   Unchecked → white/20 border, transparent fill, 4px radius
//   Checked   → teal fill, white check mark
//   Disabled  → 40% opacity, not interactive
//
// WCAG 2.2 AA: accessibilityRole="checkbox" + accessibilityState.
// ─────────────────────────────────────────────────────────────────────────────

export interface CheckboxProps extends Omit<PressableProps, 'style' | 'children'> {
  checked: boolean;
  disabled?: boolean;
  label?: string;
}

export function Checkbox({
  checked,
  disabled = false,
  label,
  ...rest
}: CheckboxProps): React.JSX.Element {
  const { colors, radii } = useTheme();

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      className="items-center justify-center"
      style={{ minWidth: 48, minHeight: 48, opacity: disabled ? 0.4 : 1 }}
      {...rest}
    >
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: radii.sm / 2, // 4px — "rounded-md" equivalent
          borderWidth: checked ? 0 : 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: checked ? colors.accent : 'transparent',
          borderColor: 'rgba(255,255,255,0.20)',
        }}
      >
        {/* Check mark — L-shape rotated 45° */}
        {checked && (
          <View
            style={{
              width: 6,
              height: 10,
              borderBottomWidth: 2,
              borderEndWidth: 2,
              borderColor: colors.onAccent,
              transform: [{ rotate: '45deg' }, { translateY: -1 }],
            }}
          />
        )}
      </View>
    </Pressable>
  );
}
