import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/presentation/theme';
import { Text } from '@/presentation/components/Text';
import type { StreakState } from '@/domain/index';
import type { ColorTokens } from '@/presentation/theme';

// Streak pill per DESIGN_SYSTEM.md. States: active (warm flame), at-risk (flame
// outline + caution ring when today's session isn't done), frozen (snowflake,
// when a freeze is consumed). No red, no guilt. The integer is `mono` tabular.
// Meaning is carried by glyph + label + color (three redundant channels).

export type StreakVisualState = 'active' | 'at_risk' | 'frozen' | 'none';

export interface StreakBadgeInput {
  currentStreak: number;
  atRisk: boolean;
  // A freeze was consumed to cover a lapse (outcome from applyStreakUpdate).
  freezeConsumed?: boolean;
}

/**
 * Pure mapping from streak data to a visual state. Exported for unit testing.
 * Precedence: a consumed freeze shows frozen; an at-risk active streak shows
 * at-risk; a positive streak is active; zero shows nothing notable.
 */
export function resolveStreakVisualState(input: StreakBadgeInput): StreakVisualState {
  if (input.freezeConsumed) return 'frozen';
  if (input.currentStreak <= 0) return 'none';
  if (input.atRisk) return 'at_risk';
  return 'active';
}

const GLYPH: Record<StreakVisualState, string> = {
  active: '🔥',
  at_risk: '🔥',
  frozen: '❄️',
  none: '🔥',
};

function tintFor(state: StreakVisualState): keyof ColorTokens {
  switch (state) {
    case 'at_risk':
      return 'caution';
    case 'frozen':
      return 'textSecondary';
    case 'active':
      return 'streak';
    case 'none':
    default:
      return 'textTertiary';
  }
}

function accessibilityLabelFor(state: StreakVisualState, days: number): string {
  switch (state) {
    case 'at_risk':
      return `${days} day streak, at risk — complete a session today to keep it`;
    case 'frozen':
      return `${days} day streak, a freeze was used to protect it`;
    case 'active':
      return `${days} day streak`;
    case 'none':
    default:
      return 'No active streak';
  }
}

export interface StreakBadgeProps {
  streak: Pick<StreakState, 'currentStreak'>;
  atRisk: boolean;
  freezeConsumed?: boolean;
}

export function StreakBadge({
  streak,
  atRisk,
  freezeConsumed = false,
}: StreakBadgeProps): React.JSX.Element {
  const { colors, radii, spacing } = useTheme();
  const state = resolveStreakVisualState({
    currentStreak: streak.currentStreak,
    atRisk,
    freezeConsumed,
  });
  const tint = tintFor(state);

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabelFor(state, streak.currentStreak)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.s1,
        paddingHorizontal: spacing.s3,
        paddingVertical: spacing.s1,
        borderRadius: radii.full,
        backgroundColor: colors.bgSurfaceRaised,
        borderWidth: state === 'at_risk' ? 1 : 0,
        borderColor: colors.caution,
      }}
    >
      <Text variant="label" color={tint} accessibilityElementsHidden>
        {GLYPH[state]}
      </Text>
      <Text variant="mono" color={tint} tabularNums accessibilityElementsHidden>
        {String(streak.currentStreak)}
      </Text>
    </View>
  );
}
