import React, { type ReactNode } from 'react';
import { Pressable, View, type PressableProps } from 'react-native';
import { useTheme } from '@/presentation/theme';
import { Text } from '@/presentation/components/Text';

// ─── SelectionCard ────────────────────────────────────────────────────────────
// Interactive tactile card used for single-selection lists (Goal Selection,
// Proficiency Assessment). Three visual states driven by `selected` + `disabled`:
//
//   Default  → dark gradient bg (145°, #1A1E1F→#141718), hairline border
//   Selected → teal-tinted bg (teal/12 → teal/4), full teal border
//   Disabled → Default appearance at 40% opacity, not pressable
//
// Layout: row — [icon box] [label] [check indicator]
// The icon box also adapts: outlined slate on default, teal-tinted on selected.
//
// Localization: uses `flexDirection: 'row'` — React Native mirrors this for RTL
// automatically. Do NOT hardcode left/right margins; use start/end.
// ─────────────────────────────────────────────────────────────────────────────

export interface SelectionCardProps extends Omit<PressableProps, 'style' | 'children'> {
  label: string;
  icon: ReactNode;
  selected?: boolean;
  disabled?: boolean;
}

export function SelectionCard({
  label,
  icon,
  selected = false,
  disabled = false,
  ...rest
}: SelectionCardProps): React.JSX.Element {
  const { colors, radii, spacing } = useTheme();

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      className="overflow-hidden"
      style={{ borderRadius: radii.sm, opacity: disabled ? 0.4 : 1 }}
      {...rest}
    >
      {({ pressed }) => (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: spacing.s4,
            paddingVertical: spacing.s4,
            borderRadius: radii.sm,
            borderWidth: 1,
            // Surface: teal-tinted when selected, dark gradient otherwise
            backgroundColor: selected
              ? 'rgba(32,178,170,0.08)'
              : pressed
                ? 'rgba(255,255,255,0.03)'
                : '#1A1E1F',
            borderColor: selected ? colors.accent : 'rgba(255,255,255,0.06)',
            // Inset teal glow when selected
            ...(selected && {
              shadowColor: colors.accent,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
            }),
          }}
        >
          {/* Icon box */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s3 }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: radii.sm,
                borderWidth: 1,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: selected
                  ? 'rgba(32,178,170,0.10)'
                  : 'rgba(255,255,255,0.05)',
                borderColor: selected
                  ? 'rgba(32,178,170,0.20)'
                  : 'rgba(255,255,255,0.10)',
              }}
            >
              {icon}
            </View>

            {/* Label */}
            <Text variant="label" color={selected ? 'textPrimary' : 'textPrimary'}>
              {label}
            </Text>
          </View>

          {/* Check indicator */}
          {selected ? (
            <View
              className="items-center justify-center"
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: colors.accent,
              }}
            >
              {/* Check mark — rendered as a rotated L-shape via borders */}
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
            </View>
          ) : (
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                borderWidth: 1.5,
                borderColor: 'rgba(255,255,255,0.20)',
              }}
            />
          )}
        </View>
      )}
    </Pressable>
  );
}
