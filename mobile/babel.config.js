module.exports = function (api) {
  api.cache(true);
  const isTest = process.env.NODE_ENV === 'test';

  // nativewind/babel is a PRESET in NativeWind v4 (it returns { plugins: [...] });
  // it must live under `presets`, not `plugins` (the latter triggers ".plugins is
  // not a valid Plugin property"). It is skipped under Jest: it transitively loads
  // react-native-worklets/plugin (a reanimated-v4 artifact) which is not installed
  // on reanimated 3, and the className transform is irrelevant to logic tests.
  const presets = ['babel-preset-expo'];
  if (!isTest) {
    presets.push('nativewind/babel');
  }

  const plugins = [
    [
      'module-resolver',
      {
        alias: { '@': './src' },
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
      },
    ],
  ];
  // Reanimated plugin must be listed last; skip in test env (incompatible with Jest).
  if (!isTest) {
    plugins.push('react-native-reanimated/plugin');
  }

  return {
    presets,
    plugins,
  };
};
