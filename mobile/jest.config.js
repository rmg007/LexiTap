module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: [],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // Never load the native Sentry module in tests (see src/__mocks__).
    '^@sentry/react-native$': '<rootDir>/src/__mocks__/@sentry/react-native.ts',
    // Never load the native AsyncStorage module in tests (see src/__mocks__).
    '^@react-native-async-storage/async-storage$': '<rootDir>/src/__mocks__/@react-native-async-storage/async-storage.ts',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@supabase/.*))',
  ],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
};
