import React from 'react';
import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';
import { useTheme } from '@/presentation/theme';
import type { ColorTokens, Typography } from '@/presentation/theme';

// Typed text primitive. Maps a `variant` to a type-scale token and a `color`
// to a color token, so screens never hardcode font sizes or hex values.
// Counters use `mono` (tabular figures) so streak/progress numbers don't jiggle.

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
  const t = theme.typography[variant];
  const base: TextStyle = {
    fontSize: t.fontSize,
    lineHeight: t.lineHeight,
    fontWeight: t.fontWeight,
    color: theme.colors[color],
  };
  if (tabularNums || variant === 'mono') {
    base.fontVariant = ['tabular-nums'];
  }
  return <RNText style={[base, style]} {...rest} />;
}
