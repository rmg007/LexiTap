import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

const banned = (patterns) => ({
  'no-restricted-imports': ['error', { patterns }],
});

export default [
  {
    files: ['src/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}'],
    languageOptions: { parser: tsparser },
    plugins: { '@typescript-eslint': tseslint },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': 'error',
      'import/no-default-export': 'off',
    },
  },
  // domain/: pure TS. No React, RN, SQLite, Supabase, Expo, or outer layers.
  {
    files: ['src/domain/**/*.ts'],
    rules: banned([
      'react',
      'react-native',
      'expo*',
      '@supabase/*',
      '@react-native-async-storage/*',
      '@/application/*',
      '@/infrastructure/*',
      '@/presentation/*',
    ]),
  },
  // application/: may import domain only. No React/RN/infra concretes.
  {
    files: ['src/application/**/*.ts'],
    rules: banned([
      'react',
      'react-native',
      'expo*',
      '@supabase/*',
      '@/infrastructure/*',
      '@/presentation/*',
    ]),
  },
  // infrastructure/: may not import application or presentation.
  {
    files: ['src/infrastructure/**/*.ts'],
    rules: banned(['@/application/*', '@/presentation/*']),
  },
  // presentation/: must not reach into infrastructure concretes directly.
  {
    files: ['src/presentation/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}'],
    rules: banned(['@/infrastructure/db/*', '@/infrastructure/sync/*', '@/infrastructure/iap/*']),
  },
  // expo-router route files require default exports.
  {
    files: ['app/**/*.{ts,tsx}'],
    rules: { 'no-restricted-syntax': 'off' },
  },
];
