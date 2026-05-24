module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: [],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@supabase/.*))',
  ],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
};
