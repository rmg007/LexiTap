import type { AuthPort, AuthSession, Result } from "@/domain/auth/AuthPort";
import { ok } from "@/domain/auth/AuthPort";

// In-memory AuthPort implementation. Used when Supabase is not configured
// (env vars absent) and as a test double — mirrors StubIapService: lets the app
// build and the auth flow exercise without a real backend. Sign-in always
// "succeeds" with a fake session so downstream screens render an authed state.
//
// Holds no real credentials and persists nothing across launches; the fake
// access token is obviously non-functional ('stub-access-token').
export class StubAuthService implements AuthPort {
  private session: AuthSession | null = null;
  private readonly listeners = new Set<(session: AuthSession | null) => void>();

  // One-hour fake expiry, far enough out that getSession looks valid in tests.
  private makeSession(email: string): AuthSession {
    return {
      user: { id: "stub-user-id", email },
      accessToken: "stub-access-token",
      expiresAt: Date.now() + 60 * 60 * 1000,
    };
  }

  private emit(): void {
    for (const listener of this.listeners) listener(this.session);
  }

  async signInWithOtp(_email: string): Promise<Result> {
    // No real email is sent; the "code" is accepted by any verifyOtp call.
    return ok();
  }

  async verifyOtp(email: string, _token: string): Promise<Result<AuthSession>> {
    this.session = this.makeSession(email);
    this.emit();
    return ok(this.session);
  }

  async verifyOtpLink(_tokenHash: string): Promise<Result<AuthSession>> {
    // Deep-link flow: no email in the URL, use a stub email.
    this.session = this.makeSession('stub-deeplink@example.com');
    this.emit();
    return ok(this.session);
  }

  async signOut(): Promise<void> {
    this.session = null;
    this.emit();
  }

  async deleteAccount(): Promise<Result> {
    await this.signOut();
    return ok();
  }

  async getSession(): Promise<AuthSession | null> {
    return this.session;
  }

  onAuthStateChange(
    callback: (session: AuthSession | null) => void,
  ): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }
}
