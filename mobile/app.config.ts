import type { ExpoConfig } from 'expo/config';

// B3 — Sentry source-map upload (build-time only). The Expo plugin is added
// ONLY when SENTRY_ORG + SENTRY_PROJECT are set, so credential-less builds and
// Expo Go don't break. authToken is read from the SENTRY_AUTH_TOKEN env var
// (an EAS secret) at build time — never hardcoded here.
const sentryConfigured = Boolean(
  process.env.SENTRY_ORG && process.env.SENTRY_PROJECT,
);

const plugins: NonNullable<ExpoConfig['plugins']> = [
  'expo-router',
  'expo-sqlite',
  ['expo-asset', { assets: ['./assets/vocab/words.db'] }],
  // R1.3: RevenueCat native plugin. Requires `npx expo prebuild --clean` after
  // adding. API keys are EAS secrets (EXPO_PUBLIC_REVENUECAT_API_KEY_IOS /
  // EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID); no key → SDK silently disabled.
  'react-native-purchases',
];

if (sentryConfigured) {
  plugins.push([
    '@sentry/react-native/expo',
    {
      organization: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      url: 'https://sentry.io/',
    },
  ]);
}

const config: ExpoConfig = {
  name: 'LexiTap',
  slug: 'lexitap',
  version: '0.1.0',
  orientation: 'portrait',
  scheme: 'lexitap',
  userInterfaceStyle: 'dark',
  newArchEnabled: true,
  icon: './assets/icon.png',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#0D1B2A',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.lexitap.app',
    appleTeamId: 'W8FZGT253G',
    infoPlist: {
      // App only uses standard HTTPS/TLS — exempt from export compliance docs.
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'com.lexitap.app',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#0D1B2A',
    },
  },
  plugins,
  runtimeVersion: { policy: 'appVersion' },
  experiments: {
    typedRoutes: true,
  },
  extra: {
    router: { origin: false },
    eas: { projectId: '4f9ec642-cf69-483b-966c-ff36616c6d94' },
    revenueCatApiKey: process.env.EXPO_PUBLIC_REVENUCAT_API_KEY ?? null,
    sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? null,
    posthogApiKey: process.env.EXPO_PUBLIC_POSTHOG_API_KEY ?? null,
  },
  owner: 'rmg007',
};

export default config;
