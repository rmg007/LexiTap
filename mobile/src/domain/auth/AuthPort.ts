// Domain port for authentication. Implemented in infrastructure/auth
// (SupabaseAuthService for real auth, StubAuthService for tests/unconfigured).
// The application layer depends on this interface — never on @supabase/* — so
// auth is swappable and test-doubles are trivial. Pure TS: no SDK imports here
// (the domain eslint rule bans react/expo/@supabase imports from this layer).

// The authenticated user. `email` may be null because Supabase users can exist
// without a confirmed email (e.g. phone-only) and the field is optional in the
// SDK's User type; callers must tolerate null.
export interface AuthUser {
  readonly id: string;
  readonly email: string | null;
}

// An active session. `accessToken` is the JWT used for authenticated requests.
// `expiresAt` is epoch MILLISECONDS (comparable to Date.now()); the adapter
// normalises Supabase's epoch-seconds `expires_at` into ms at the boundary.
export interface AuthSession {
  readonly user: AuthUser;
  readonly accessToken: string;
  readonly expiresAt: number;
}

// Tagged auth failure. Concrete adapters map every raw SDK/network error onto
// one of these kinds so callers branch on a stable, vendor-agnostic union and
// never see a raw Supabase error.
//
// - not_configured: env vars unset (Supabase URL/anon key missing).
// - network:        transient connectivity / fetch / 5xx failure — retryable.
// - invalid_otp:    the email or one-time code was rejected (expired/wrong).
// - rate_limited:   too many requests (HTTP 429); back off and retry later.
// - unknown:        anything that does not map to the above.
export type AuthErrorKind =
  | "not_configured"
  | "network"
  | "invalid_otp"
  | "rate_limited"
  | "unknown";

export interface AuthError {
  readonly kind: AuthErrorKind;
  // Human-readable, non-PII summary for logs/UI. Never contains the raw token.
  readonly message: string;
}

// Discriminated result. Adapters return failures as values (never throw) so the
// application layer handles auth errors without try/catch at every call site.
export type Result<T = void> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: AuthError };

// Convenience constructors for the Result union (keep call sites terse).
export function ok<T>(value: T): Result<T>;
export function ok(): Result<void>;
export function ok<T>(value?: T): Result<T> {
  return { ok: true, value: value as T };
}

export function err<T = never>(error: AuthError): Result<T> {
  return { ok: false, error };
}

export interface AuthPort {
  // Send a one-time login code (magic-link / email OTP) to `email`. Resolves ok
  // once the email is dispatched; the user then supplies the code to verifyOtp.
  signInWithOtp(email: string): Promise<Result>;

  // Exchange the emailed `token` for a session. On success the session is
  // persisted by the adapter and returned.
  verifyOtp(email: string, token: string): Promise<Result<AuthSession>>;

  // Clear the persisted session. Best-effort and idempotent; never throws.
  signOut(): Promise<void>;

  // Current persisted session, or null if signed out / none. Does not throw.
  getSession(): Promise<AuthSession | null>;

  // Subscribe to auth state transitions (sign-in, sign-out, token refresh).
  // Returns an unsubscribe function; call it to stop receiving callbacks.
  onAuthStateChange(
    callback: (session: AuthSession | null) => void,
  ): () => void;
}
