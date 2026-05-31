const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// ─── nativewind@4 / react-native-css-interop compat shim ──────────────────────
//
// nativewind@4 bundles react-native-css-interop@0.2.4 in its OWN node_modules
// alongside react-native@0.83+ (built for a newer RN than Expo SDK 52 ships).
//
// The Babel JSX transform (importSource: "react-native-css-interop") generates
// runtime imports of react-native-css-interop/jsx-runtime in every file.  Metro
// must resolve that package.  But if we let Metro resolve it from nativewind's
// nested deps it also resolves react-native transitively from NATIVEWIND's RN
// (0.83+), which has Flow syntax that Metro's JS parser rejects on SDK 52.
//
// Fix: alias react-native-css-interop to nativewind's copy, AND intercept any
// react-native import that originates INSIDE nativewind's own node_modules,
// re-routing it to the project-root react-native@0.76.9.  Everything else is
// left to Metro's normal resolution.

const CSS_INTEROP_PATH = path.join(
  __dirname,
  'node_modules/nativewind/node_modules/react-native-css-interop',
);
const ROOT_RN = path.join(__dirname, 'node_modules/react-native');
const NATIVEWIND_DEPS = path.join(__dirname, 'node_modules/nativewind/node_modules');

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'react-native-css-interop': CSS_INTEROP_PATH,
};

const _prevResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // When a file inside nativewind's own node_modules imports react-native (or
  // any react-native/* sub-path), redirect to the project-root version so we
  // don't bundle nativewind's bundled RN 0.83+ by mistake.
  const origin = context.originModulePath;
  if (
    origin.startsWith(NATIVEWIND_DEPS) &&
    (moduleName === 'react-native' || moduleName.startsWith('react-native/'))
  ) {
    // Resolve the same path but from root node_modules
    const redirected = moduleName === 'react-native'
      ? ROOT_RN
      : path.join(ROOT_RN, moduleName.slice('react-native/'.length));
    return { type: 'sourceFile', filePath: require.resolve(redirected) };
  }
  if (_prevResolve) return _prevResolve(context, moduleName, platform);
  return context.resolveRequest(context, moduleName, platform);
};

// ──────────────────────────────────────────────────────────────────────────────

// Bundle the read-only content database (words.db) as a Metro asset so it can be
// `require`d and copied into expo-sqlite's directory at launch (see
// infrastructure/db/contentDb.ts). Without this, `require('words.db')` fails to
// resolve and the app ships with no content.
config.resolver.assetExts.push('db');

module.exports = withNativeWind(config, { input: './global.css' });
