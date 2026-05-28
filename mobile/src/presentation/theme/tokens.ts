// Design tokens from DESIGN_SYSTEM.md. Dark mode is canonical; light is a
// derived mapping. Presentation-layer only — the domain never imports these
// (hexagonal boundary). Consumed via useTheme().

export interface ColorTokens {
  readonly bgBase: string;
  readonly bgSurface: string;
  readonly bgSurfaceRaised: string;
  readonly bgSurfaceSunken: string;
  readonly borderSubtle: string;
  readonly borderStrong: string;
  readonly textPrimary: string;
  readonly textSecondary: string;
  readonly textTertiary: string;
  readonly accent: string;
  readonly accentPressed: string;
  readonly accentSubtle: string;
  // Label color used on top of the filled accent button (AA contrast on teal).
  readonly onAccent: string;
  readonly success: string;
  readonly successSubtle: string;
  readonly caution: string;
  readonly cautionSubtle: string;
  readonly streak: string;
  // True destructive red — confirmations only, never quiz feedback.
  readonly destructive: string;
}

// Dark theme (canonical).
export const darkColors: ColorTokens = {
  bgBase: '#0E1112',
  bgSurface: '#171A1C',
  bgSurfaceRaised: '#1F2426',
  bgSurfaceSunken: '#0A0C0D',
  borderSubtle: '#262B2E',
  borderStrong: '#3A4145',
  textPrimary: '#F2F5F6',
  textSecondary: '#A9B2B6',
  textTertiary: '#6E777B',
  accent: '#20B2AA',
  accentPressed: '#1A938C',
  accentSubtle: '#13322F',
  onAccent: '#062826',
  success: '#4CAF50',
  successSubtle: '#16301A',
  caution: '#FFC107',
  cautionSubtle: '#33290A',
  streak: '#FF9A3D',
  destructive: '#E5484D',
};

// Light theme (derived). Accent/success/caution darkened for AA on light.
export const lightColors: ColorTokens = {
  bgBase: '#FBFCFC',
  bgSurface: '#FFFFFF',
  bgSurfaceRaised: '#F7F9F9',
  bgSurfaceSunken: '#F1F3F4',
  borderSubtle: '#E6E9EA',
  borderStrong: '#C4CBCE',
  textPrimary: '#1A1D1E',
  textSecondary: '#52595C',
  textTertiary: '#878F92',
  accent: '#178F88',
  accentPressed: '#0F6E68',
  accentSubtle: '#DCF0EE',
  onAccent: '#FFFFFF',
  success: '#2E7D32',
  successSubtle: '#E3F1E4',
  caution: '#B58100',
  cautionSubtle: '#F8EFD6',
  streak: '#E07B2E',
  destructive: '#CC3A3F',
};

// 8pt base spacing grid.
export const spacing = {
  s1: 4,
  s2: 8,
  s3: 12,
  s4: 16,
  s5: 24,
  s6: 32,
  s7: 48,
  s8: 64,
} as const;

export type Spacing = typeof spacing;

// Border radii.
export const radii = {
  sm: 8,
  md: 12,
  lg: 20,
  full: 999,
} as const;

export type Radii = typeof radii;

// Type scale. fontFamily names reference expo-google-fonts packages that must
// be loaded by the root layout before screens render (see expo-font).
// Localization: React Native applies RTL mirroring automatically; font metrics
// scale correctly for all supported locales including CJK and Arabic.
export interface TypeStyle {
  readonly fontSize: number;
  readonly lineHeight: number;
  readonly fontWeight: '400' | '500' | '600' | '700';
  // Font family name as loaded by expo-font. Omit to inherit system default.
  readonly fontFamily?: string;
  // Uppercase + letter-spacing label pattern (Small-Caps Branded).
  readonly letterSpacing?: number;
  readonly textTransform?: 'uppercase' | 'lowercase' | 'capitalize' | 'none';
}

export const typography = {
  // ── Design-spec canonical levels (style_guide.png) ─────────────────────
  // H1 Display  44/1.1  — Playfair Display Bold
  h1: { fontSize: 44, lineHeight: 48, fontWeight: '700', fontFamily: 'PlayfairDisplay_700Bold' },
  // H2 Editorial 34/1.1 — Playfair Display Bold
  display: { fontSize: 34, lineHeight: 38, fontWeight: '700', fontFamily: 'PlayfairDisplay_700Bold' },
  // H3 Section   18/1.2 — Inter Bold
  headline: { fontSize: 18, lineHeight: 22, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  // Body Standard 15/1.6 — Inter Regular
  body: { fontSize: 15, lineHeight: 24, fontWeight: '400', fontFamily: 'Inter_400Regular' },
  // Small-Caps Branded 11/0.15em — Inter Bold
  smallCaps: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1.65, // 11 * 0.15 = 1.65
    textTransform: 'uppercase' as const,
  },

  // ── Extended scale (intermediate UI density steps) ─────────────────────
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  bodyLg: { fontSize: 18, lineHeight: 26, fontWeight: '400', fontFamily: 'Inter_400Regular' },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400', fontFamily: 'Inter_400Regular' },
  mono: { fontSize: 14, lineHeight: 20, fontWeight: '500', fontFamily: 'Inter_500Medium' },
} as const satisfies Record<string, TypeStyle>;

export type Typography = typeof typography;

// Functional motion durations (ms).
export const motion = {
  fast: 120,
  base: 220,
  slow: 360,
} as const;

export type Motion = typeof motion;

// Layout constants.
export const layout = {
  screenGutter: spacing.s4,
  contentMaxWidth: 600,
  // WCAG 2.2 AA minimum touch target (ACCESSIBILITY_REQUIREMENTS.md).
  minTouchTarget: 48,
} as const;

export type Layout = typeof layout;

export type ColorScheme = 'dark' | 'light';

export interface Theme {
  readonly scheme: ColorScheme;
  readonly colors: ColorTokens;
  readonly spacing: Spacing;
  readonly radii: Radii;
  readonly typography: Typography;
  readonly motion: Motion;
  readonly layout: Layout;
}

export const darkTheme: Theme = {
  scheme: 'dark',
  colors: darkColors,
  spacing,
  radii,
  typography,
  motion,
  layout,
};

export const lightTheme: Theme = {
  scheme: 'light',
  colors: lightColors,
  spacing,
  radii,
  typography,
  motion,
  layout,
};

export function themeForScheme(scheme: ColorScheme): Theme {
  return scheme === 'light' ? lightTheme : darkTheme;
}
