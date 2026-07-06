import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/presentation/theme';
import { Text } from '@/presentation/components/Text';

// ─── SectionHeader ────────────────────────────────────────────────────────────
// Small-caps branded eyebrow label (11/0.15em, Inter Bold — `typography.smallCaps`).
// Consolidates the inline "MEANING n" / "EXAMPLES" pattern from LearnCardScreen
// and the dashboard reading-order eyebrows (Home/Progress section labels) into
// one shared primitive instead of each screen re-typing the same Text props.
// ─────────────────────────────────────────────────────────────────────────────

export interface SectionHeaderProps {
  children: string;
}

export function SectionHeader({ children }: SectionHeaderProps): React.JSX.Element {
  const { spacing } = useTheme();
  return (
    <View style={{ paddingBottom: spacing.s1 }}>
      <Text variant="smallCaps" color="textTertiary">
        {children}
      </Text>
    </View>
  );
}
