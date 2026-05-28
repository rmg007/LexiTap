import React, { type ReactNode } from 'react';
import { type ViewStyle } from 'react-native';
import { Surface } from 'react-native-paper';
import { useTheme } from '@/presentation/theme';

// ─── Card ─────────────────────────────────────────────────────────────────────
// Generic tactile surface container built on Paper's Surface primitive.
// Surface elevation is driven by the `raised` flag:
//   raised=false (default) → bgSurface  (#171A1C), subtle border
//   raised=true            → bgSurfaceRaised (#1F2426), subtle border
//
// The 1px hairline border replicates the Physical Surface depth system from the
// style guide (rgba(255,255,255,0.06) on dark; Paper theme drives this via
// `outline` in paperTheme.ts).
// ─────────────────────────────────────────────────────────────────────────────

export interface CardProps {
  children: ReactNode;
  raised?: boolean;
  style?: ViewStyle;
}

export function Card({ children, raised = false, style }: CardProps): React.JSX.Element {
  const { colors, radii, spacing } = useTheme();

  return (
    <Surface
      elevation={0}
      style={[
        {
          backgroundColor: raised ? colors.bgSurfaceRaised : colors.bgSurface,
          borderRadius: radii.sm,
          borderWidth: 1,
          borderColor: colors.borderSubtle,
          padding: spacing.s4,
        },
        style,
      ]}
    >
      {children}
    </Surface>
  );
}
