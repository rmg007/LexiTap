import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';
import { useTheme } from '@/presentation/theme';
import type { ColorTokens } from '@/presentation/theme/tokens';

// LexiTap icon system. Lean, hand-curated registry of the exact Lucide glyphs the
// app uses (NOT the full lucide-react-native set) — keeps the bundle small and
// matches the Figma design system 1:1 (Lucide, 24×24, stroke 2, round cap/join).
//
// Path data is the authentic Lucide source (lucide-static). To add a glyph: copy
// the <path>/<rect> primitives from the real SVG into GLYPHS — never hand-draw.
//
// Replaces the emoji that were previously used as icons (book / briefcase /
// graduation-cap / pencil / library / close, etc.) — emoji render inconsistently
// across platforms and fail the design system's "emoji 0" gate. (Hard rule:
// guardrails.mjs blocks emoji in mobile UI source, so describe them in words.)

type Primitive =
  | { t: 'path'; d: string }
  | { t: 'rect'; w: number; h: number; x: number; y: number; rx: number };

export type IconName =
  | 'book-open'
  | 'briefcase'
  | 'graduation-cap'
  | 'pencil'
  | 'library'
  | 'x'
  | 'flame'
  | 'snowflake'
  | 'check'
  | 'minus'
  | 'volume-2';

const GLYPHS: Record<IconName, Primitive[]> = {
  'book-open': [
    { t: 'path', d: 'M12 7v14' },
    {
      t: 'path',
      d: 'M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z',
    },
  ],
  briefcase: [
    { t: 'path', d: 'M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16' },
    { t: 'rect', w: 20, h: 14, x: 2, y: 6, rx: 2 },
  ],
  'graduation-cap': [
    {
      t: 'path',
      d: 'M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z',
    },
    { t: 'path', d: 'M22 10v6' },
    { t: 'path', d: 'M6 12.5V16a6 3 0 0 0 12 0v-3.5' },
  ],
  pencil: [
    {
      t: 'path',
      d: 'M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z',
    },
    { t: 'path', d: 'm15 5 4 4' },
  ],
  library: [
    { t: 'path', d: 'm16 6 4 14' },
    { t: 'path', d: 'M12 6v14' },
    { t: 'path', d: 'M8 8v12' },
    { t: 'path', d: 'M4 4v16' },
  ],
  x: [
    { t: 'path', d: 'M18 6 6 18' },
    { t: 'path', d: 'm6 6 12 12' },
  ],
  flame: [
    {
      t: 'path',
      d: 'M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4',
    },
  ],
  snowflake: [
    { t: 'path', d: 'm10 20-1.25-2.5L6 18' },
    { t: 'path', d: 'M10 4 8.75 6.5 6 6' },
    { t: 'path', d: 'm14 20 1.25-2.5L18 18' },
    { t: 'path', d: 'm14 4 1.25 2.5L18 6' },
    { t: 'path', d: 'm17 21-3-6h-4' },
    { t: 'path', d: 'm17 3-3 6 1.5 3' },
    { t: 'path', d: 'M2 12h6.5L10 9' },
    { t: 'path', d: 'm20 10-1.5 2 1.5 2' },
    { t: 'path', d: 'M22 12h-6.5L14 15' },
    { t: 'path', d: 'm4 10 1.5 2L4 14' },
    { t: 'path', d: 'm7 21 3-6-1.5-3' },
    { t: 'path', d: 'm7 3 3 6h4' },
  ],
  check: [{ t: 'path', d: 'M20 6 9 17l-5-5' }],
  minus: [{ t: 'path', d: 'M5 12h14' }],
  'volume-2': [
    {
      t: 'path',
      d: 'M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z',
    },
    { t: 'path', d: 'M16 9a5 5 0 0 1 0 6' },
    { t: 'path', d: 'M19.364 18.364a9 9 0 0 0 0-12.728' },
  ],
};

export interface IconProps {
  name: IconName;
  size?: number;
  // Theme color token (default textPrimary). Use `colorValue` for a raw color.
  color?: keyof ColorTokens;
  // Raw color string — overrides `color` (e.g. for a computed tint).
  colorValue?: string;
  strokeWidth?: number;
  // Decorative by default (accessible={false}); set a label to expose it.
  accessibilityLabel?: string;
}

export function Icon({
  name,
  size = 24,
  color = 'textPrimary',
  colorValue,
  strokeWidth = 2,
  accessibilityLabel,
}: IconProps): React.JSX.Element {
  const { colors } = useTheme();
  const stroke = colorValue ?? colors[color];
  const common = {
    stroke,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none' as const,
  };

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      accessible={accessibilityLabel !== undefined}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityLabel !== undefined ? 'image' : undefined}
    >
      {GLYPHS[name].map((p, i) =>
        p.t === 'path' ? (
          <Path key={i} d={p.d} {...common} />
        ) : (
          <Rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} rx={p.rx} {...common} />
        ),
      )}
    </Svg>
  );
}
