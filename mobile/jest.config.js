module.exports = {
  preset: 'jest-expo',
  // SDK 56 / reanimated 4: resolve react-native-worklets to its Jest-safe
  // (non-native) build, then delegate to the RN preset resolver. See jest-resolver.js.
  resolver: '<rootDir>/jest-resolver.js',
  setupFilesAfterEnv: [],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // Never load the native Sentry module in tests (see src/__mocks__).
    '^@sentry/react-native$': '<rootDir>/src/__mocks__/@sentry/react-native.ts',
    // Never load the native AsyncStorage module in tests (see src/__mocks__).
    '^@react-native-async-storage/async-storage$': '<rootDir>/src/__mocks__/@react-native-async-storage/async-storage.ts',
    // Never load the native RevenueCat SDK in tests (see src/__mocks__).
    '^react-native-purchases$': '<rootDir>/src/__mocks__/react-native-purchases.ts',
    // Never load the native Apple Authentication module in tests (see src/__mocks__).
    '^expo-apple-authentication$': '<rootDir>/src/__mocks__/expo-apple-authentication.tsx',
    // Never load the native Google Sign-In TurboModule in tests (see src/__mocks__).
    '^@react-native-google-signin/google-signin$':
      '<rootDir>/src/__mocks__/@react-native-google-signin/google-signin.ts',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@supabase/.*))',
  ],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
};
