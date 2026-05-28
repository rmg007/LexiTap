import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider } from '@/presentation/theme';
import { ServicesProvider, type Services } from '@/presentation/services';
import { createContainer } from '@/composition/container';
import { logger } from '@/lib/logger';
import '../global.css';

// Root layout. Opens the database and wires the composition root, then provides
// the resulting `Services` to the tree. The quiz/review path is offline-first,
// so bootstrap only awaits local SQLite (sync is bound lazily and never blocks).
// Until services resolve, a splash spinner renders; screens calling useServices()
// only mount inside the provider.

export default function RootLayout(): React.JSX.Element {
  const [services, setServices] = useState<Services | null>(null);

  useEffect(() => {
    let cancelled = false;
    createContainer()
      .then((c) => {
        if (!cancelled) setServices(c.services);
      })
      .catch((error) => {
        logger.error('Failed to initialize app container', { error: String(error) });
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
    <SafeAreaProvider>
      <ThemeProvider>
        <StatusBar style="light" />
        {services === null ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator />
          </View>
        ) : (
          <ServicesProvider value={services}>
            <Stack screenOptions={{ headerShown: false }} />
          </ServicesProvider>
        )}
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
