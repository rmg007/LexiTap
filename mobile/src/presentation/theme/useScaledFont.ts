import { useFontScale } from '@/presentation/theme/ThemeProvider';
import { useTheme } from '@/presentation/theme/ThemeProvider';
import { fontScaleMax } from '@/presentation/theme/tokens';
import type { Typography } from '@/presentation/theme/tokens';

// useScaledFont — returns clamped font metrics for a given typography token,
// respecting the OS Dynamic Type / font-size accessibility setting.
//
// Formula: ScaledSize = BaseSize * clamp(fontScale, 0.85, maxMultiplier)
//
// Max multipliers are defined per-token in fontScaleMax (tokens.ts).
// The `mono` token never scales (maxMultiplier = 1.0) so numeric badges
// maintain their fixed layout. Use allowFontScaling={false} on those Text
// nodes as a belt-and-suspenders guard.

export interface ScaledFontMetrics {
  fontSize: number;
  lineHeight: number;
}

export function useScaledFont(variant: keyof Typography): ScaledFontMetrics {
  const { typography } = useTheme();
  const fontScale = useFontScale();
  const token = typography[variant];
  const maxMult = fontScaleMax[variant];

  const clampedScale = Math.min(Math.max(fontScale, 0.85), maxMult);
  return {
    fontSize: Math.round(token.fontSize * clampedScale),
    lineHeight: Math.round(token.lineHeight * clampedScale),
  };
}
