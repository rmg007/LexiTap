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
  // AUTH-1: Sign in with Apple (AU3) — entitlement wired by the plugin +
  // ios.usesAppleSignIn below. Mandatory per App Store Guideline 4.8 once
  // Google sign-in ships.
  'expo-apple-authentication',
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

// AUTH-1: Google Sign-In (AU2) — plugin added ONLY when the iOS OAuth client ID
// is present so credential-less builds don't break (the plugin throws without
// iosUrlScheme). iosUrlScheme is the client ID reversed:
// 'XXXX.apps.googleusercontent.com' → 'com.googleusercontent.apps.XXXX'.
const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
if (googleIosClientId) {
  const iosUrlScheme = googleIosClientId.split('.').reverse().join('.');
  plugins.push(['@react-native-google-signin/google-signin', { iosUrlScheme }]);
}

const config: ExpoConfig = {
  name: 'LexiTap',
  slug: 'lexitap',
  version: '0.0.1',
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
    // must be built with iOS 26 SDK). Build 2 = first iOS-26-SDK upload (on
    // TestFlight). Build 3 adds the AUTH-1 native modules (Sign in with Apple
    // entitlement + Google Sign-In) — every new store upload must bump this.
    buildNumber: '3',
    // AUTH-1: Sign in with Apple capability (com.apple.developer.applesignin).
    usesAppleSignIn: true,
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
    // revenueCatApiKey removed: it read a typo'd env var
    // (EXPO_PUBLIC_REVENUCAT_API_KEY) and had zero consumers — the IAP factory
    // reads EXPO_PUBLIC_REVENUECAT_API_KEY_IOS/_ANDROID from process.env directly.
    sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? null,
    posthogApiKey: process.env.EXPO_PUBLIC_POSTHOG_API_KEY ?? null,
    buildDate: new Date().toISOString(),
  },
  owner: 'rmg007',
};

export default config;
