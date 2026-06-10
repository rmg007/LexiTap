module.exports = function (api) {
  api.cache(true);
  const isTest = process.env.NODE_ENV === 'test';

  // nativewind/babel is a PRESET in NativeWind v4 (it returns { plugins: [...] });
  // it must live under `presets`, not `plugins`. It is skipped under Jest: the
  // className transform is irrelevant to logic tests and skipping keeps the test
  // transform fast and free of the worklets plugin.
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
  // Reanimated 4 split its Babel plugin out into react-native-worklets. It must
  // be listed last; skip in tests (worklet transform is irrelevant to logic tests).
  if (!isTest) {
    plugins.push('react-native-worklets/plugin');
  }

  return {
    presets,
    plugins,
  };
};
