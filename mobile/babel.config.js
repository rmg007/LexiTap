module.exports = function (api) {
  api.cache(true);
  const plugins = [
    [
      'module-resolver',
      {
        alias: { '@': './src' },
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
      },
    ],
    'nativewind/babel',
  ];
  // Reanimated plugin must be listed last; skip in test env (incompatible with Jest).
  if (process.env.NODE_ENV !== 'test') {
    plugins.push('react-native-reanimated/plugin');
  }
  return {
    presets: ['babel-preset-expo'],
    plugins,
  };
};
