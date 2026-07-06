import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/presentation/theme';
import { Text } from '@/presentation/components/Text';
import { Button, type ButtonVariant } from '@/presentation/components/Button';
import { Icon, type IconName } from '@/presentation/components/Icon';
import type { ColorTokens } from '@/presentation/theme/tokens';

// ─── EmptyState ───────────────────────────────────────────────────────────────
// Shared empty/done-state layout (Figma `EmptyState`, 302:75 / 377:135):
// centered icon + headline + optional body + optional single CTA. Every empty
// screen in the app (Learn all-caught-up, Saved Words empty, Progress
// first-run, Quiz pool-exhausted) composes this instead of hand-rolling the
// same View/Text/Button stack with slightly different spacing each time.
// ─────────────────────────────────────────────────────────────────────────────

export interface EmptyStateProps {
  icon?: IconName;
  /** Icon color token. Default 'textTertiary' (neutral empty state); pass
   * 'success' for an earned/accomplishment moment (e.g. session complete). */
  iconColor?: keyof ColorTokens;
  headline: string;
  body?: string;
  ctaLabel?: string;
  onPressCta?: () => void;
  ctaVariant?: ButtonVariant;
}

export function EmptyState({
  icon,
  iconColor = 'textTertiary',
  headline,
  body,
  ctaLabel,
  onPressCta,
  ctaVariant = 'primary',
}: EmptyStateProps): React.JSX.Element {
  const { spacing } = useTheme();

  return (
    <View style={{ alignItems: 'center', gap: spacing.s3, paddingVertical: spacing.s6 }}>
      {icon != null && <Icon name={icon} size={40} color={iconColor} />}
      <Text
        variant="headline"
        color="textPrimary"
        accessibilityRole="header"
        style={{ textAlign: 'center' }}
      >
        {headline}
      </Text>
      {body != null && (
        <Text variant="body" color="textSecondary" style={{ textAlign: 'center' }}>
          {body}
        </Text>
      )}
      {ctaLabel != null && onPressCta != null && (
        <Button label={ctaLabel} variant={ctaVariant} onPress={onPressCta} />
      )}
    </View>
  );
}
