// Composed Jest resolver for SDK 56 / reanimated 4.
//
// Reanimated 4 moved its worklet runtime into react-native-worklets, whose
// `NativeWorklets.native.ts` throws at import time under Jest ("Native part of
// Worklets doesn't seem to be initialized"). react-native-worklets ships a Jest
// resolver that strips the `native` platform extension so worklets resolve to
// their non-native (Jest-safe) build. But jest-expo already installs the
// React Native preset resolver (@react-native/jest-preset), and Jest allows only
// ONE `resolver`. So we apply the worklets extension-stripping ourselves and then
// delegate to the RN preset resolver (which handles all other RN/Expo resolution).
const rnPresetResolver = require('@react-native/jest-preset/jest/resolver');

module.exports = (request, options) => {
  if (
    options.basedir.includes('react-native-worklets') ||
    request.includes('react-native-worklets')
  ) {
    options = {
      ...options,
      extensions: options.extensions?.filter((ext) => !ext.includes('native')),
    };
  }
  return rnPresetResolver(request, options);
};
