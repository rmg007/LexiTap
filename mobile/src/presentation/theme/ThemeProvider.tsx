import React, { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { type ColorScheme, type Theme, themeForScheme } from '@/presentation/theme/tokens';
import { darkPaperTheme, lightPaperTheme } from '@/presentation/theme/paperTheme';

// Theme context. Dark-mode-first: dark is the fallback when the OS appearance
// is unavailable (DESIGN_SYSTEM.md). A manual override (Settings) takes
// precedence over the OS setting.

export type ThemePreference = 'system' | ColorScheme;

interface ThemeContextValue {
  theme: Theme;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
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

  const value = useMemo<ThemeContextValue>(() => {
    // Dark is the fallback when "system" is unavailable.
    const resolved: ColorScheme =
      preference === 'system' ? (osScheme ?? 'dark') : preference;
    return { theme: themeForScheme(resolved), preference, setPreference };
  }, [preference, osScheme]);

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
