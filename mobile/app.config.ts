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
  // iOS 26 SDK / Xcode 26 forces a stricter Clang that rejects RN's bundled
  // fmt (consteval). This local plugin disables FMT_USE_CONSTEVAL in the
  // generated Podfile. Drop it when on an Expo SDK that builds clean under
  // Xcode 26. See plugins/withFmtConstevalFix.js.
  './plugins/withFmtConstevalFix.js',
  // R1.3: RevenueCat — native dep wired via autolinking + Pods (Podfile.lock has
  // RNPurchases/RevenueCat/PurchasesHybridCommon). Plugin string removed because
  // react-native-purchases@10.2.0 has no app.plugin.js, so Expo falls back to
  // loading the package main which imports react-native (Flow syntax) → crashes
  // the [CP-User] Generate app.config build phase. No plugin entry needed; Pods
  // wire the native code. Re-evaluate if upgrading to a version with app.plugin.js.
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
    // Build 1 (iOS 18.2 SDK) was rejected by App Store Connect (error 90725 —
    // must be built with iOS 26 SDK). Build 2 is the first iOS-26-SDK upload.
    buildNumber: '2',
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
    buildDate: new Date().toISOString(),
  },
  owner: 'rmg007',
};

export default config;
