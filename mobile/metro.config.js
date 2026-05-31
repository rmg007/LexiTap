const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Bundle the read-only content database (words.db) as a Metro asset so it can be
// `require`d and copied into expo-sqlite's directory at launch (see
// infrastructure/db/contentDb.ts). Without this, `require('words.db')` fails to
// resolve and the app ships with no content.
config.resolver.assetExts.push('db');

module.exports = withNativeWind(config, { input: './global.css' });
