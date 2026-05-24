import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SyncError } from '@/infrastructure/sync/errors';

// Supabase client factory. Reads credentials from EXPO_PUBLIC_* env vars
// (CLAUDE.md: never hardcode secrets; .env in dev, EAS secrets in prod). The
// anon key is public-by-design (RLS enforces row access), but URL/key still
// come from env so builds target the right project without code changes.
//
// EXPO_PUBLIC_-prefixed vars are inlined by the Expo bundler at build time and
// are safe to read via process.env in app code.
export function createSupabaseClient(): SupabaseClient {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (url === undefined || url === '' || anonKey === undefined || anonKey === '') {
    throw new SyncError(
      'Supabase credentials missing: set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY',
    );
  }
  return createClient(url, anonKey, {
    auth: {
      // Mobile offline-first: persist the session and refresh tokens lazily;
      // there is no URL-based session detection in a native app.
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
}
