import React from 'react';
import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';
import { useTheme } from '@/presentation/theme';
import { useScaledFont } from '@/presentation/theme/useScaledFont';
import { fontScaleMax } from '@/presentation/theme/tokens';
import type { ColorTokens, Typography } from '@/presentation/theme';

// Typed text primitive. Maps a `variant` to a type-scale token and a `color`
// to a color token, so screens never hardcode font sizes or hex values.
// Counters use `mono` (tabular figures) so streak/progress numbers don't jiggle.
//
// Dynamic Type: font sizes are clamped per-token via useScaledFont(), matching
// the OS accessibility font-scale setting while preventing layout breakage at
// extreme scale factors. maxFontSizeMultiplier is also passed to RNText so the
// OS renderer applies the same ceiling. The `mono` variant disables scaling
// entirely to preserve fixed-width badge layouts.

type Variant = keyof Typography;
type ColorKey = keyof ColorTokens;

export interface TextProps extends RNTextProps {
  variant?: Variant;
  color?: ColorKey;
  tabularNums?: boolean;
}

export function Text({
  variant = 'body',
  color = 'textPrimary',
  tabularNums = false,
  style,
  ...rest
}: TextProps): React.JSX.Element {
  const theme = useTheme();
  const t = theme.typography[variant] as import('@/presentation/theme').TypeStyle;
  const scaled = useScaledFont(variant);
  const maxMult = fontScaleMax[variant];

  const base: TextStyle = {
    fontSize: scaled.fontSize,
    lineHeight: scaled.lineHeight,
    fontWeight: t.fontWeight,
    color: theme.colors[color],
    ...(t.fontFamily ? { fontFamily: t.fontFamily } : {}),
    ...(t.letterSpacing ? { letterSpacing: t.letterSpacing } : {}),
    ...(t.textTransform ? { textTransform: t.textTransform } : {}),
  };
  if (tabularNums || variant === 'mono') {
    base.fontVariant = ['tabular-nums'];
  }

  // mono never scales — allowFontScaling={false} guards badge layout.
  const allowFontScaling = variant !== 'mono';

  return (
    <RNText
      allowFontScaling={allowFontScaling}
      maxFontSizeMultiplier={maxMult}
      style={[base, style]}
      {...rest}
    />
  );
}

