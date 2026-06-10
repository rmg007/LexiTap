import type { Result } from "@/domain/auth/AuthPort";
import { err, ok } from "@/domain/auth/AuthPort";

// Wraps @react-native-google-signin/google-signin (v16 response-object API)
// behind a tiny seam so the AuthContext can compose "native sheet → idToken →
// AuthPort.signInWithIdToken('google')" without touching the SDK directly.
//
// Env-gated on EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID (iOS only — Android is
// deferred; the project is on the iOS-only path). When the env var is unset,
// isConfigured() is false (UI hides the button) and signIn() fails closed with
// 'unavailable'. The native module is require()d lazily on first signIn so a
// credential-less build never loads it (mirrors createAuthService's dynamic
// require of the Supabase SDK).
//
// v16 API (verified against the installed package, NOT training memory):
//   GoogleSignin.configure({ iosClientId })             — sync
//   GoogleSignin.signIn() → Promise<SignInResponse>
//     SignInResponse = { type: 'success', data: User }  (User.idToken: string|null)
//                    | { type: 'cancelled', data: null }
//   Non-cancel native failures REJECT (cancellation is translated to the
//   typed response by the SDK's translateCancellationError).

// The slice of the SDK this adapter consumes. Injectable for tests (babel
// inlines EXPO_PUBLIC_* env at transform time, so tests inject both the env
// value and the module rather than toggling process.env).
export interface GoogleSignInModule {
  configure(options: { iosClientId?: string }): void;
  signIn(): Promise<
    | { type: "success"; data: { idToken: string | null } }
    | { type: "cancelled"; data: null }
  >;
}

interface GoogleSignInAdapterDeps {
  // Defaults to the babel-inlined EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID read.
  readonly iosClientId?: string;
  // Defaults to a lazy require of the real SDK on first signIn().
  readonly module?: GoogleSignInModule;
}

const UNAVAILABLE: Result<never> = err({
  kind: "unavailable",
  message: "Google Sign-In is not configured in this build.",
});

const UNKNOWN: Result<never> = err({
  kind: "unknown",
  message: "Something went wrong. Please try again.",
});

export class GoogleSignInAdapter {
  private readonly iosClientId: string | undefined;
  private readonly injectedModule: GoogleSignInModule | undefined;
  private module: GoogleSignInModule | null = null;
  private configured = false;

  constructor(deps: GoogleSignInAdapterDeps = {}) {
    this.iosClientId =
      deps.iosClientId ?? process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
    this.injectedModule = deps.module;
  }

  // True when a Google iOS client ID is baked into this build. Synchronous so
  // the UI can decide button visibility without an effect.
  isConfigured(): boolean {
    return Boolean(this.iosClientId);
  }

  // Lazily resolve the SDK so unconfigured builds never load the native module
  // (its JS entry touches the TurboModule at import time).
  private resolveModule(): GoogleSignInModule {
    if (this.injectedModule) return this.injectedModule;
    if (!this.module) {
      const { GoogleSignin } =
        require("@react-native-google-signin/google-signin") as {
          GoogleSignin: GoogleSignInModule;
        };
      this.module = GoogleSignin;
    }
    return this.module;
  }

  // Present the native sheet and resolve the Google idToken (exchanged via
  // AuthPort.signInWithIdToken('google', token)).
  async signIn(): Promise<Result<string>> {
    if (!this.isConfigured()) return UNAVAILABLE;
    try {
      const module = this.resolveModule();
      if (!this.configured) {
        // configure() is idempotent but only needs to run once per process.
        module.configure({ iosClientId: this.iosClientId });
        this.configured = true;
      }
      const response = await module.signIn();
      if (response.type === "cancelled") {
        // User dismissed the sheet — not an error; callers show nothing.
        return err({ kind: "cancelled", message: "Sign-in was cancelled." });
      }
      if (!response.data.idToken) return UNKNOWN;
      return ok(response.data.idToken);
    } catch {
      // Non-cancel native failure (cancellation never throws in v16 — the SDK
      // translates it to the typed 'cancelled' response).
      return UNKNOWN;
    }
  }
}
