import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack, router } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';
import { ThemeProvider, useTheme } from '@/presentation/theme';
import { ServicesProvider, type Services } from '@/presentation/services';
import { AuthProvider } from '@/presentation/auth';
import { createContainer } from '@/composition/container';
import { useSessionLifecycle } from '@/presentation/hooks/useSessionLifecycle';
import { logger } from '@/lib/logger';
import { captureException, initCrashReporting, wrapRoot } from '@/infrastructure/crash';
import '../global.css';

// Initialise crash reporting at module load — before any rendering — so startup
// crashes are captured. Inert until a DSN is configured (see infrastructure/crash).
initCrashReporting();

// Hold the native splash screen until fonts + the services container both
// resolve — every `typography` token in tokens.ts names one of these families;
// without this, screens silently fall back to the system font.
SplashScreen.preventAutoHideAsync().catch(() => {
  // Expo Go / a second call can reject; the splash simply won't be manually
  // held in that case, which is a harmless no-op degrade.
});

// Root layout. Opens the database and wires the composition root, then provides
// the resulting `Services` to the tree. The quiz/review path is offline-first,
// so bootstrap only awaits local SQLite (sync is bound lazily and never blocks).
// Until services resolve, a splash spinner renders; screens calling useServices()
// only mount inside the provider.

// Status bar text must invert with the active color scheme — "light" content is
// invisible against the light theme's near-white bgBase.
function ThemedStatusBar(): React.JSX.Element {
  const { scheme } = useTheme();
  return <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />;
}

function RootLayout(): React.JSX.Element {
  const [services, setServices] = useState<Services | null>(null);
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    PlayfairDisplay_700Bold,
  });

  useEffect(() => {
    let cancelled = false;
    createContainer()
      .then((c) => {
        if (!cancelled) setServices(c.services);
      })
      .catch((error) => {
        // A superseded attempt (Fast Refresh remounted this effect before the
        // prior createContainer() settled) must not surface as a live failure —
        // only the `then` branch checked `cancelled`, so a doomed first attempt
        // racing a second, successful one still logged + reported a spurious
        // error even though the app booted fine on the surviving attempt.
        if (cancelled) return;
        logger.error('Failed to initialize app container', { error: String(error) });
        captureException(error);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (fontError) {
      logger.error('Failed to load fonts', { error: String(fontError) });
      captureException(fontError);
    }
  }, [fontError]);

  const ready = services !== null && (fontsLoaded || fontError != null);

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync().catch(() => {
        // Already hidden or unsupported host (Expo Go) — no-op.
      });
    }
  }, [ready]);

  useSessionLifecycle(services);

  // First-run gate: once services resolve, send a brand-new user (no completion
  // flag yet) into the onboarding diagnostic before the tabs mount.
  useEffect(() => {
    if (services === null) return;
    let cancelled = false;
    services.onboarding
      .isComplete()
      .then((done) => {
        if (!cancelled && !done) router.replace('/onboarding');
      })
      .catch((error) => {
        logger.warn('Onboarding gate check failed; skipping', { error: String(error) });
      });
    return () => {
      cancelled = true;
    };
  }, [services]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ThemedStatusBar />
          {!ready || services === null ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator />
            </View>
          ) : (
            <ServicesProvider value={services}>
              <AuthProvider>
                <Stack screenOptions={{ headerShown: false }} />
              </AuthProvider>
            </ServicesProvider>
          )}
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// Wrap with Sentry's error boundary + touch breadcrumbs. No-op wrapper until a
// DSN is configured.
export default wrapRoot(RootLayout);
