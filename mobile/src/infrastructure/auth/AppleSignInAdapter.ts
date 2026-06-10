import { Platform } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";

import type { Result } from "@/domain/auth/AuthPort";
import { err, ok } from "@/domain/auth/AuthPort";

// Wraps expo-apple-authentication behind a tiny seam so the AuthContext can
// compose "native sheet → identityToken → AuthPort.signInWithIdToken('apple')"
// without touching the Expo SDK directly, and tests can inject a fake module.
//
// Error mapping (per AuthErrorKind contract):
// - ERR_REQUEST_CANCELED  → 'cancelled'  (user dismissed the sheet; UI silent)
// - missing identityToken → 'unknown'    (Apple returned a credential without
//                                         the JWT — nothing we can exchange)
// - platform/module unusable → 'unavailable' (non-iOS, or the native module is
//                                         absent / reports unavailable)

// The slice of expo-apple-authentication this adapter consumes. Injectable so
// tests pass a fake (babel-inlined env + native modules cannot be toggled at
// runtime in Jest — same seam pattern as SupabaseAuthServiceDeps).
export interface AppleAuthModule {
  isAvailableAsync(): Promise<boolean>;
  signInAsync(options?: {
    requestedScopes?: AppleAuthentication.AppleAuthenticationScope[];
  }): Promise<{ identityToken: string | null }>;
}

interface AppleSignInAdapterDeps {
  // Defaults to the real expo-apple-authentication module.
  readonly module?: AppleAuthModule;
  // Defaults to Platform.OS; injectable so tests exercise the non-iOS branch.
  readonly platformOs?: string;
}

// expo-apple-authentication rejects with this code when the user dismisses
// the native sheet.
const ERR_REQUEST_CANCELED = "ERR_REQUEST_CANCELED";

function errorCode(e: unknown): string | undefined {
  return (e as { code?: string } | null)?.code;
}

export class AppleSignInAdapter {
  private readonly module: AppleAuthModule;
  private readonly platformOs: string;

  constructor(deps: AppleSignInAdapterDeps = {}) {
    this.module = deps.module ?? AppleAuthentication;
    this.platformOs = deps.platformOs ?? Platform.OS;
  }

  // True only on iOS where the OS supports Sign in with Apple. Never throws —
  // any module failure reads as "not available" so the UI just hides the button.
  async isAvailable(): Promise<boolean> {
    if (this.platformOs !== "ios") return false;
    try {
      return await this.module.isAvailableAsync();
    } catch {
      return false;
    }
  }

  // Present the native sheet and resolve the Apple identityToken (a JWT the
  // backend exchanges via AuthPort.signInWithIdToken('apple', token)).
  async signIn(): Promise<Result<string>> {
    if (!(await this.isAvailable())) {
      return err({
        kind: "unavailable",
        message: "Sign in with Apple is not available on this device.",
      });
    }
    try {
      const credential = await this.module.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) {
        return err({
          kind: "unknown",
          message: "Something went wrong. Please try again.",
        });
      }
      return ok(credential.identityToken);
    } catch (caught) {
      if (errorCode(caught) === ERR_REQUEST_CANCELED) {
        // User dismissed the sheet — not an error; callers show nothing.
        return err({ kind: "cancelled", message: "Sign-in was cancelled." });
      }
      return err({
        kind: "unknown",
        message: "Something went wrong. Please try again.",
      });
    }
  }
}
