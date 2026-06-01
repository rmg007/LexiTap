// Single read-point for the Supabase env-gate credentials.
//
// Why a separate module instead of reading process.env inline in the factory
// (as createAnalyticsService does): babel-preset-expo inlines static
// `process.env.EXPO_PUBLIC_*` references to literals at transform time, so the
// gate is a build-time constant that runtime tests cannot toggle. Isolating the
// read here lets tests `jest.mock('./supabaseEnv')` to exercise BOTH the
// configured and unconfigured factory branches, while production keeps the
// correct inlined static reads (EXPO_PUBLIC_* are only reliably available via
// the inlined static form in a release bundle — never via dynamic access).
export interface SupabaseEnv {
  readonly url: string | undefined;
  readonly anonKey: string | undefined;
}

export function getSupabaseEnv(): SupabaseEnv {
  return {
    url: process.env.EXPO_PUBLIC_SUPABASE_URL,
    anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  };
}
