# Auth Integration (AUTH-1)

> Rewritten 2026-06-10 when AU2/AU3 landed. The previous version of this file
> was a pre-implementation template (different file layout, different SDKs —
> e.g. `react-native-apple-authentication`); the shipped code below is the
> truth. Spec history: `plans/P3_AUTH_PLAN.md`.

Three sign-in paths, all producing the same Supabase session (persisted to the
OS keychain via `secureStoreAdapter`, auto-refreshed by the SDK):

| Path | Flow | Code |
|---|---|---|
| **Magic-link / OTP** | email → 6-digit code (or deep link `lexitap://auth/callback?token_hash=…`) | `SupabaseAuthService.signInWithOtp` / `verifyOtp` / `verifyOtpLink` |
| **Sign in with Apple** | native sheet (`expo-apple-authentication`) → `identityToken` | `AppleSignInAdapter.signIn()` → `AuthPort.signInWithIdToken('apple', token)` |
| **Google Sign-In** | native sheet (`@react-native-google-signin/google-signin` v16) → `idToken` | `GoogleSignInAdapter.signIn()` → `AuthPort.signInWithIdToken('google', token)` |

Composition lives in `src/presentation/auth/AuthContext.tsx`
(`signInWithApple` / `signInWithGoogle` + `appleAvailable` / `googleAvailable`).
UI: `SignInScreen` email phase shows the official `AppleAuthenticationButton`
(only when `isAvailableAsync()` resolves true) and a "Continue with Google"
button (only when the build carries a Google iOS client ID). An err of kind
`cancelled` (user dismissed the OS sheet) is a silent no-op — never an error
message. `unavailable` means the provider can't be used on this device/build —
the entry point is hidden rather than erroring.

## Env vars

| Var | Scope | Effect when unset |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` | runtime (babel-inlined) | `StubAuthService` — all auth is an in-memory fake |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | build + runtime (babel-inlined) | Google button hidden; `@react-native-google-signin` config plugin skipped, so credential-less builds stay green |

Apple needs no env var — the capability comes from `ios.usesAppleSignIn: true`
plus the `expo-apple-authentication` plugin in `app.config.ts`. Android Google
sign-in is deferred (iOS-only path).

## Ryan's remaining dashboard steps (code is done; these are the exact gaps)

1. **Supabase → Authentication → Providers → Apple**: enable, and add
   `com.lexitap.app` to **Authorized Client IDs** (the native flow validates
   the identityToken against the bundle ID; no Service ID / client secret is
   needed for native-only sign-in).
2. **Google Cloud Console → APIs & Services → Credentials → Create OAuth
   client ID → type iOS**: bundle ID `com.lexitap.app`. Copy the client ID
   (`XXXX.apps.googleusercontent.com`).
3. **Supabase → Authentication → Providers → Google**: enable, and add that
   iOS client ID to **Authorized Client IDs** (web client ID/secret not needed
   for the native ID-token flow).
4. **Set `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` as an EAS secret** (expo.dev
   project → Environment variables, or `eas env:create`) so store builds carry
   it; put the same value in local `.env` for dev builds.
5. **New EAS build required** — both packages add native modules (plus the
   Sign in with Apple entitlement), so this CANNOT ship via EAS Update. The
   Sign in with Apple capability is picked up from the entitlement on the next
   build.

Note: Sign in with Apple is mandatory (App Store Guideline 4.8) once Google
sign-in ships — they go out in the same build.
