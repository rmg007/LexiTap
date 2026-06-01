import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack, router } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider } from '@/presentation/theme';
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

// Root layout. Opens the database and wires the composition root, then provides
// the resulting `Services` to the tree. The quiz/review path is offline-first,
// so bootstrap only awaits local SQLite (sync is bound lazily and never blocks).
// Until services resolve, a splash spinner renders; screens calling useServices()
// only mount inside the provider.

function RootLayout(): React.JSX.Element {
  const [services, setServices] = useState<Services | null>(null);

  useEffect(() => {
    let cancelled = false;
    createContainer()
      .then((c) => {
        if (!cancelled) setServices(c.services);
      })
      .catch((error) => {
        logger.error('Failed to initialize app container', { error: String(error) });
        captureException(error);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
          <StatusBar style="light" />
          {services === null ? (
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
