import AsyncStorage from '@react-native-async-storage/async-storage';

// Opt-out storage for analytics. User can disable PostHog event tracking via
// Settings toggle. Persisted to AsyncStorage; checked by PostHogAnalyticsService
// before capture(). Opt-out is independent of env-gate (EXPO_PUBLIC_POSTHOG_API_KEY).

const OPT_OUT_KEY = 'lexitap.analytics_opt_out';

export async function getAnalyticsOptOut(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(OPT_OUT_KEY);
    return value === 'true';
  } catch {
    return false; // Assume opt-in if storage fails.
  }
}

export async function setAnalyticsOptOut(optOut: boolean): Promise<void> {
  try {
    if (optOut) {
      await AsyncStorage.setItem(OPT_OUT_KEY, 'true');
    } else {
      await AsyncStorage.removeItem(OPT_OUT_KEY);
    }
  } catch {
    // Swallow: storage failure must not crash the app.
  }
}
