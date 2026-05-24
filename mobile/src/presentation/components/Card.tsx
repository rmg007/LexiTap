import React, { type ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import { useTheme } from '@/presentation/theme';

// Card per DESIGN_SYSTEM.md: bg.surface, radius.md, border.subtle, space.4
// padding. No drop shadow in dark mode (layers separate by surface lightness).

export interface CardProps {
  children: ReactNode;
  raised?: boolean;
  style?: ViewStyle;
}

export function Card({ children, raised = false, style }: CardProps): React.JSX.Element {
  const { colors, radii, spacing } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: raised ? colors.bgSurfaceRaised : colors.bgSurface,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: colors.borderSubtle,
          padding: spacing.s4,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
