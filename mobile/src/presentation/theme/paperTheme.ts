import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';
import { darkColors, lightColors, radii } from '@/presentation/theme/tokens';

// ─── Physical Surface System ──────────────────────────────────────────────────
// Paper v5 (MD3): `roundness` is applied directly as borderRadius in most
// components. We lock it to `radii.sm` (8px) to match the design spec.
//
// Hairline border: 1px, rgba(255,255,255,0.06) on dark surfaces replicates the
// tactile depth effect from the style guide's "Standard Surface" definition.
// ─────────────────────────────────────────────────────────────────────────────

const ROUNDNESS = radii.sm; // 8px — overrides Paper's 4px default

const HAIRLINE_DARK = 'rgba(255,255,255,0.06)';
const HAIRLINE_LIGHT = 'rgba(0,0,0,0.06)';

function makePaperTheme(
  base: MD3Theme,
  c: typeof darkColors,
  hairline: string,
): MD3Theme {
  return {
    ...base,
    roundness: ROUNDNESS,
    colors: {
      ...base.colors,
      // Primary = Teal
      primary: c.accent,
      onPrimary: c.onAccent,
      primaryContainer: c.accentSubtle,
      onPrimaryContainer: c.accent,
      // Secondary = Amber (caution / streak cues)
      secondary: c.caution,
      onSecondary: '#000000',
      secondaryContainer: c.cautionSubtle,
      onSecondaryContainer: c.caution,
      // Backgrounds & surfaces
      background: c.bgBase,
      onBackground: c.textPrimary,
      surface: c.bgSurface,
      onSurface: c.textPrimary,
      surfaceVariant: c.bgSurfaceRaised,
      onSurfaceVariant: c.textSecondary,
      // Borders: `outline` drives the hairline; `outlineVariant` for dividers
      outline: hairline,
      outlineVariant: c.borderSubtle,
      // Error
      error: c.destructive,
      onError: '#FFFFFF',
      errorContainer: '#5C0A0D',
      onErrorContainer: c.destructive,
    },
  };
}

export const darkPaperTheme = makePaperTheme(MD3DarkTheme, darkColors, HAIRLINE_DARK);
export const lightPaperTheme = makePaperTheme(MD3LightTheme, lightColors, HAIRLINE_LIGHT);
