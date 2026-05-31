import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'LexiTap',
  slug: 'lexitap',
  version: '0.1.0',
  orientation: 'portrait',
  scheme: 'lexitap',
  userInterfaceStyle: 'dark',
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.lexitap.app',
  },
  android: {
    package: 'com.lexitap.app',
  },
  plugins: [
    'expo-router',
    'expo-sqlite',
    ['expo-asset', { assets: ['./assets/vocab/words.db'] }],
  ],
  runtimeVersion: { policy: 'appVersion' },
  experiments: {
    typedRoutes: true,
  },
  extra: {
    router: { origin: false },
    eas: { projectId: '4f9ec642-cf69-483b-966c-ff36616c6d94' },
    revenueCatApiKey: process.env.EXPO_PUBLIC_REVENUCAT_API_KEY ?? null,
    sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? null,
  },
  owner: 'rmg007',
};

export default config;
