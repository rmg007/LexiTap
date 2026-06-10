const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Bundle the read-only content database (words.db) as a Metro asset so it can be
// `require`d and copied into expo-sqlite's directory at launch (see
// infrastructure/db/contentDb.ts). Without this, `require('words.db')` fails to
// resolve and the app ships with no content.
config.resolver.assetExts.push('db');

// NOTE (SDK 56): the large resolveRequest/extraNodeModules shim that used to live
// here is gone. It existed only to work around Expo SDK 52 problems — nativewind
// bundling its own RN 0.83+/react@19 (dual-React crash) and posthog's
// "@posthog/core/*" subpath imports failing under a Metro that didn't follow
// package `exports`. On SDK 56 nativewind no longer nests its own React/RN and
// Metro enables package exports by default, so plain resolution is correct.

module.exports = withNativeWind(config, { input: './global.css' });
