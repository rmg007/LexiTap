import React, { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Dimensions, PixelRatio, useColorScheme } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { type ColorScheme, type Theme, themeForScheme } from '@/presentation/theme/tokens';
import { darkPaperTheme, lightPaperTheme } from '@/presentation/theme/paperTheme';

// Theme context. Dark-mode-first: dark is the fallback when the OS appearance
// is unavailable (DESIGN_SYSTEM.md). A manual override (Settings) takes
// precedence over the OS setting.
//
// Also exposes:
//   reduceMotion — true when the OS "Reduce Motion" accessibility setting is on.
//                  Consumers collapse animations to instant cross-fades when set.
//   fontScale    — current OS font scale factor, clamped per-token in useScaledFont().

export type ThemePreference = 'system' | ColorScheme;

interface ThemeContextValue {
  theme: Theme;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  reduceMotion: boolean;
  fontScale: number;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: ReactNode;
  // Test/Storybook seam: force an initial preference.
  initialPreference?: ThemePreference;
}

export function ThemeProvider({
  children,
  initialPreference = 'system',
}: ThemeProviderProps): React.JSX.Element {
  const osScheme = useColorScheme();
  const [preference, setPreference] = useState<ThemePreference>(initialPreference);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [fontScale, setFontScale] = useState(() => PixelRatio.getFontScale());

  // Subscribe to OS accessibility changes.
  useEffect(() => {
    let cancelled = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (!cancelled) setReduceMotion(enabled);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  // Re-read font scale when display/orientation changes. Android fires a
  // Dimensions change event when the accessibility font-size slider moves.
  useEffect(() => {
    function handleChange(): void {
      setFontScale(PixelRatio.getFontScale());
    }
    const sub = Dimensions.addEventListener('change', handleChange);
    return () => sub.remove();
  }, []);

  const value = useMemo<ThemeContextValue>(() => {
    // Dark is the fallback when "system" is unavailable. RN 0.85 widened
    // useColorScheme() to include 'unspecified', so narrow explicitly.
    const resolved: ColorScheme =
      preference === 'system'
        ? osScheme === 'light' || osScheme === 'dark'
          ? osScheme
          : 'dark'
        : preference;
    return { theme: themeForScheme(resolved), preference, setPreference, reduceMotion, fontScale };
  }, [preference, osScheme, reduceMotion, fontScale]);

  const paperTheme = value.theme.scheme === 'dark' ? darkPaperTheme : lightPaperTheme;

  return (
    <ThemeContext.Provider value={value}>
      <PaperProvider theme={paperTheme}>{children}</PaperProvider>
    </ThemeContext.Provider>
  );
}

/** Active theme tokens. Throws if used outside a ThemeProvider. */
export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (ctx === null) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx.theme;
}

/** Theme preference controls (for Settings). Throws outside a ThemeProvider. */
export function useThemePreference(): {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
} {
  const ctx = useContext(ThemeContext);
  if (ctx === null) {
    throw new Error('useThemePreference must be used within a ThemeProvider');
  }
  return { preference: ctx.preference, setPreference: ctx.setPreference };
}

/**
 * Returns true when the OS "Reduce Motion" accessibility setting is enabled.
 * Consumers should substitute instant cross-fades for all spring/timing animations.
 */
export function useReduceMotion(): boolean {
  const ctx = useContext(ThemeContext);
  if (ctx === null) {
    throw new Error('useReduceMotion must be used within a ThemeProvider');
  }
  return ctx.reduceMotion;
}

/**
 * Returns the current OS font scale factor (raw, unclamped).
 * Use useScaledFont() for per-token clamped sizes.
 */
export function useFontScale(): number {
  const ctx = useContext(ThemeContext);
  if (ctx === null) {
    throw new Error('useFontScale must be used within a ThemeProvider');
  }
  return ctx.fontScale;
}
