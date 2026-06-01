import {
  createClient,
  isAuthRetryableFetchError,
  type AuthError as SupabaseAuthError,
  type Session as SupabaseSession,
  type SupabaseClient,
} from "@supabase/supabase-js";

import type { AuthPort, AuthSession, Result } from "@/domain/auth/AuthPort";
import { err, ok } from "@/domain/auth/AuthPort";
import { secureStoreAdapter, type SecureStorage } from "./secureStoreAdapter";

// Supabase adapter for AuthPort (magic-link / email OTP). The ONLY auth module
// that imports @supabase/supabase-js, per the hexagonal rule. Env-gated on
// EXPO_PUBLIC_SUPABASE_URL + EXPO_PUBLIC_SUPABASE_ANON_KEY exactly like
// createAnalyticsService reads its key: when unset, every method fails closed
// with kind 'not_configured' and no client is constructed. The factory
// (createAuthService) normally returns StubAuthService when env is absent, so
// this branch is a defensive backstop for direct instantiation.
//
// Session persistence: tokens are stored in the OS keychain via
// secureStoreAdapter (NOT AsyncStorage). persistSession + autoRefreshToken let
// the SDK keep the session fresh; detectSessionInUrl is off (native app, no
// URL-based callback).
//
// All raw Supabase errors are caught and mapped to a tagged AuthError, returned
// via Result. Raw errors never leak out of this class.

interface SupabaseAuthServiceDeps {
  // Credentials. Normally injected by createAuthService (which reads the
  // EXPO_PUBLIC_* env-gate); fall back to process.env so direct instantiation
  // still works in app code. Injecting them also makes the env-gate
  // unit-testable: babel-preset-expo inlines `process.env.EXPO_PUBLIC_*` to a
  // literal at transform time, so tests cannot toggle it at runtime — they pass
  // url/anonKey in instead (mirrors how PostHogAnalyticsService takes apiKey).
  readonly url?: string;
  readonly anonKey?: string;
  // Injectable for tests; defaults to the real SecureStore-backed adapter.
  readonly storage?: SecureStorage;
}

function toSession(s: SupabaseSession): AuthSession {
  return {
    user: { id: s.user.id, email: s.user.email ?? null },
    accessToken: s.access_token,
    // Supabase `expires_at` is epoch SECONDS; the port contracts ms. When the
    // SDK omits it (shouldn't for a confirmed login) fall back to expires_in.
    expiresAt:
      s.expires_at !== undefined
        ? s.expires_at * 1000
        : Date.now() + s.expires_in * 1000,
  };
}

// Map a raw Supabase/network error onto the tagged AuthError union. Order
// matters: retryable-fetch is checked first (no HTTP status), then status code.
function mapError(error: unknown): Result<never> {
  // Transient connectivity / fetch failure (no response received).
  if (isAuthRetryableFetchError(error)) {
    return err({
      kind: "network",
      message: "Network error. Check your connection.",
    });
  }

  const status = (error as Partial<SupabaseAuthError>)?.status;

  if (status === 429) {
    return err({
      kind: "rate_limited",
      message: "Too many attempts. Try again later.",
    });
  }
  // 0 / 5xx → treat as network (server unreachable or transient server fault).
  if (status === 0 || (typeof status === "number" && status >= 500)) {
    return err({
      kind: "network",
      message: "Network error. Check your connection.",
    });
  }
  // 4xx on an OTP/verify path → bad or expired code / email.
  if (typeof status === "number" && status >= 400 && status < 500) {
    return err({
      kind: "invalid_otp",
      message: "That code is invalid or has expired.",
    });
  }

  return err({
    kind: "unknown",
    message: "Something went wrong. Please try again.",
  });
}

const NOT_CONFIGURED: Result<never> = err({
  kind: "not_configured",
  message: "Authentication is not configured.",
});

export class SupabaseAuthService implements AuthPort {
  private readonly client: SupabaseClient | null;

  constructor(deps: SupabaseAuthServiceDeps = {}) {
    const url = deps.url ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
    const anonKey = deps.anonKey ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      // Env-gate: no credentials → inert client. Every method returns
      // not_configured rather than constructing a half-wired client.
      this.client = null;
      return;
    }

    this.client = createClient(url, anonKey, {
      auth: {
        storage: deps.storage ?? secureStoreAdapter,
        persistSession: true,
        autoRefreshToken: true,
        // Native app: no URL-based session detection (that is web-only and
        // would try to read window.location).
        detectSessionInUrl: false,
      },
    });
  }

  async signInWithOtp(email: string): Promise<Result> {
    if (!this.client) return NOT_CONFIGURED;
    try {
      const { error } = await this.client.auth.signInWithOtp({ email });
      if (error) return mapError(error);
      return ok();
    } catch (caught) {
      return mapError(caught);
    }
  }

  async verifyOtp(email: string, token: string): Promise<Result<AuthSession>> {
    if (!this.client) return NOT_CONFIGURED;
    try {
      const { data, error } = await this.client.auth.verifyOtp({
        email,
        token,
        type: "email",
      });
      if (error) return mapError(error);
      if (!data.session) {
        // Verified without a session is unexpected; treat as invalid so the UI
        // re-prompts rather than silently appearing signed-in.
        return err({
          kind: "invalid_otp",
          message: "That code is invalid or has expired.",
        });
      }
      return ok(toSession(data.session));
    } catch (caught) {
      return mapError(caught);
    }
  }

  async signOut(): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.auth.signOut();
    } catch {
      // Swallow: sign-out is best-effort and must never throw. The local
      // session is cleared by the SDK before any network call.
    }
  }

  async getSession(): Promise<AuthSession | null> {
    if (!this.client) return null;
    try {
      const { data, error } = await this.client.auth.getSession();
      if (error || !data.session) return null;
      return toSession(data.session);
    } catch {
      return null;
    }
  }

  onAuthStateChange(
    callback: (session: AuthSession | null) => void,
  ): () => void {
    if (!this.client) return () => {};
    const { data } = this.client.auth.onAuthStateChange((_event, session) => {
      callback(session ? toSession(session) : null);
    });
    return () => {
      data.subscription.unsubscribe();
    };
  }
}
