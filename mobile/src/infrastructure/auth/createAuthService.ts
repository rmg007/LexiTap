import type { AuthPort } from "@/domain/auth/AuthPort";
import { StubAuthService } from "./StubAuthService";
import { getSupabaseEnv } from "./supabaseEnv";

// Factory. Returns SupabaseAuthService when BOTH EXPO_PUBLIC_SUPABASE_URL and
// EXPO_PUBLIC_SUPABASE_ANON_KEY are set (env-gate, same pattern as
// createAnalyticsService / createBackupService), otherwise StubAuthService. The
// env-gate is the build-time enforcement point for builds without a backend
// (tests, dev without creds).
//
// The credentials come from getSupabaseEnv() (see that module for why the read
// is isolated rather than inlined here).
export function createAuthService(): AuthPort {
  const { url, anonKey } = getSupabaseEnv();
  if (!url || !anonKey) return new StubAuthService();

  // Dynamic require keeps the Supabase + SecureStore SDKs out of the module
  // graph when credentials are absent (matches createAnalyticsService). Pass the
  // resolved credentials in so the service does not re-read env and the factory
  // stays the single env-gate.
  const { SupabaseAuthService } =
    require("./SupabaseAuthService") as typeof import("./SupabaseAuthService");
  return new SupabaseAuthService({ url, anonKey });
}
