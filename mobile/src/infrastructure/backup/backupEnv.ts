// Single source of truth for the backup env-gate. Isolated in its own module so
// it can be mocked in tests with `jest.mock('./backupEnv')` — without mocking the
// service/factory under test, and without fighting babel-preset-expo's
// build-time inlining of `process.env.EXPO_PUBLIC_*` dot-reads.

// Read an EXPO_PUBLIC_ env var correctly in BOTH the real Expo bundle and Jest.
// `babel-preset-expo` statically inlines `process.env.<NAME>` dot-reads at build
// time, so in production this returns the EAS/.env value. In Jest those dot-reads
// inline to `undefined`, so we fall back to a runtime bracket read with a
// variable key (which babel does NOT inline) — that path is only exercised by
// tests and any host that puts the value on process.env at runtime.
function readPublicEnv(
  name: 'EXPO_PUBLIC_SUPABASE_URL' | 'EXPO_PUBLIC_SUPABASE_ANON_KEY',
): string | undefined {
  const inlined: Record<typeof name, string | undefined> = {
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  };
  const fromBuild = inlined[name];
  if (fromBuild !== undefined && fromBuild !== '') return fromBuild;
  return process.env[name];
}

// Whether both Supabase env vars are present (the prod env-gate). When absent,
// every backup call returns not_configured and the factory returns the Noop.
export function isBackupConfigured(): boolean {
  const url = readPublicEnv('EXPO_PUBLIC_SUPABASE_URL');
  const key = readPublicEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY');
  return url !== undefined && url !== '' && key !== undefined && key !== '';
}
