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
const ROOT_REACT = path.join(__dirname, 'node_modules/react');
const NATIVEWIND_DEPS = path.join(__dirname, 'node_modules/nativewind/node_modules');
const POSTHOG_CORE = path.join(__dirname, 'node_modules/@posthog/core');

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'react-native-css-interop': CSS_INTEROP_PATH,
};

const _prevResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // posthog-react-native@4 imports subpath exports of @posthog/core
  // (e.g. "@posthog/core/surveys"). Metro on SDK 52 does not follow the package
  // `exports` map, so these subpaths fail to resolve and the bundle dies.
  // Redirect them straight to the built dist files. require.resolve cannot be
  // used here — the `exports` field makes Node refuse deep paths with
  // ERR_PACKAGE_PATH_NOT_EXPORTED — so we join the absolute path ourselves.
  // Bare "@posthog/core" is left alone: its `main` field resolves fine.
  if (moduleName.startsWith('@posthog/core/')) {
    const sub = moduleName.slice('@posthog/core/'.length);
    const filePath = sub.startsWith('vendor/')
      ? path.join(POSTHOG_CORE, 'dist', `${sub}.js`)
      : path.join(POSTHOG_CORE, 'dist', sub, 'index.js');
    return { type: 'sourceFile', filePath };
  }

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

  // Same problem, different package: nativewind bundles its OWN react@19 (it pairs
  // with the RN 0.85 it drags in). The Babel JSX transform routes every component
  // through react-native-css-interop's jsx-runtime, which imports `react/jsx-runtime`
  // — and from inside nativewind's nested node_modules that resolves to react@19,
  // NOT the project-root react@18.3.1 that actually renders the tree. The element
  // factories then stamp a $$typeof React 18 doesn't recognise → every screen dies
  // with "Objects are not valid as a React child". Redirect react (and react/jsx-*)
  // imports that originate inside nativewind's deps back to the single root react.
  if (
    origin.startsWith(NATIVEWIND_DEPS) &&
    (moduleName === 'react' || moduleName.startsWith('react/'))
  ) {
    const redirected = moduleName === 'react'
      ? ROOT_REACT
      : path.join(ROOT_REACT, moduleName.slice('react/'.length));
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
