---
title: Phase 3 Auth Implementation Plan (AU1–AU3)
status: active
priority: P3
updated: 2026-05-31
blocks: BK1 (encrypted backup), B2B1 (seat activation), SUBMIT-2 (iOS App Review)
---

# Phase 3: Auth Implementation Plan (AU1–AU3)

**Magic-link (Supabase OTP)** + **Google Sign-In** + **Sign in with Apple**.

Locked commitment: Ship three auth pathways, no password, identity + entitlements wired end-to-end. User creates identity once, backs up encrypted data, activates B2B seats (if applicable), and passes iOS 4.8 (SIWA mandatory once Google added).

**Parallel P3 workstreams:** Auth unblocks [P3_BACKUP_PLAN.md](P3_BACKUP_PLAN.md) (BK1–BK2) and must ship *with or before* [P3_REVENUECAT_PLAN.md](P3_REVENUECAT_PLAN.md) (R1–R7). After sign-in, call `Purchases.logIn(supabaseUserId)` to alias RevenueCat's anonymous user ID.

---

## 1. Overview & Constraints

### Product Design

- **Three sign-in methods**, user picks one per device:
  - **AU1: Magic-link (Supabase `signInWithOtp`)** — Email → one-time password → session token. No password stored. Works offline after sign-in.
  - **AU2: Google Sign-In** — Taps Google account, native module returns ID token → Supabase OAuth → session token.
  - **AU3: Sign in with Apple** — Taps Apple ID, native module → Apple OAuth → Supabase session token. **Mandatory for iOS App Store v1+** (Guideline 4.8).

- **Entitlement alias model** (RevenueCat ↔ Supabase):
  - User signs in → gets `auth.uid()` (Supabase user ID).
  - RevenueCat anonymous user ID (generated at first app launch) persists separately in `AsyncStorage`.
  - When user signs in, call `Purchases.logIn(supabaseUserId)` (RevenueCat SDK method) to **alias anonymous customer ID to Supabase ID**.
  - Future purchases tied to `supabaseUserId`; backup restore carries identity → automatic entitlement grant via RevenueCat query (same `Purchases.getCustomerInfo()`).

- **Account deletion** (App Store 5.1.1 compliance):
  - User can request deletion from Settings.
  - API call: `POST /auth/delete` (authenticated) → deletes Supabase user → cascades to user.db backup + user_stats.
  - Offline quiz progress (in local user.db) **persists** (revoked on next sign-in, no recovery).

### Blockers Resolved

| Item | State | Ref |
|------|-------|-----|
| **Magic-link vs password?** | ✅ Magic-link. No passwords stored. | D3 in RELEASE_PLAN.md |
| **Auth timing (P5 vs P3)?** | ✅ P3. Hard dependency of backup + B2B. SIWA mandatory when Google ships (4.8). | RELEASE_PLAN.md § 3 |
| **Entitlements memory-only?** | ✅ RevenueCat in-memory via `Purchases.getCustomerInfo()`. User.db has NO local entitlement cache. | `mobile/REVENUE_MODEL_PRICING.md` |

---

## 2. Supabase Configuration (AU1, AU2, AU3)

### Prerequisites

- Supabase project created + domain (free tier okay for beta).
- `.env` file (local dev) with `SUPABASE_URL`, `SUPABASE_ANON_KEY` — never committed.
- `.env.example` listed (no actual values).

### AU1: Magic-Link (OTP)

**Supabase Auth Settings:**

```
Email Provider: Enabled
Email OTP: Enabled
Redirect URL (email confirmation): lexitap://auth/callback
```

**Email Template** (in Supabase dashboard → Auth → Email Templates):

```
Subject: Your LexiTap Login Code

Hi there!

Enter this code to sign in to LexiTap:

{{ .Token }}

This code expires in 15 minutes.

If you didn't request this, ignore this email.

—LexiTap Team
```

**Flow:**
1. User enters email on `SignInWithMagicLinkScreen`.
2. App calls `supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })`.
3. Supabase sends OTP email.
4. User receives email, taps link or copies code.
5. If link: deep link → `lexitap://auth/callback?code=…` → app parses code + calls `supabase.auth.verifyOtp({ email, token, type: 'email' })`.
6. If manual code: user enters on screen → same `verifyOtp` call.
7. On success: `supabase.auth.getSession()` returns `{ user: { id, email }, session: { access_token, ... } }`.
8. Store session in `AsyncStorage` (Expo), persist across app restarts.

**Pros:** No native modules. Works offline after auth. Email verified (no spam accounts).
**Cons:** Email delivery latency (5–30s typical, up to 2m under load).

---

### AU2: Google Sign-In

**Prerequisite: Google Cloud Console Setup**

1. Create OAuth 2.0 app: `google.com/cloud/console` → project → Credentials → OAuth 2.0 ID.
2. Android: Download JSON, extract SHA-1 fingerprint from `android/` build, register as authorized app.
3. iOS: Register app bundle ID (`com.lexitap.app`) + team ID (`W8FZGT253G`).
4. Supabase: Auth → Providers → Google → paste **Client ID** + **Client Secret**.
5. Supabase redirect URL: `https://<supabase-domain>.supabase.co/auth/v1/callback?provider=google`.

**Native Module: `@react-native-google-signin/google-signin`**

Already in the roadmap (A0 / native module gate). Setup:

```bash
cd mobile
npm install @react-native-google-signin/google-signin
```

Config in `app.config.ts`:

```typescript
plugins: [
  // ... other plugins
  ['@react-native-google-signin/google-signin', {
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    // iosServerClientId only for server-backend flows; N/A here.
    // androidClientId auto-detected from android/app/google-services.json (must be present)
  }],
]
```

**Flow:**

1. User taps "Sign in with Google" on `SignInWithGoogleScreen`.
2. Call `GoogleSignin.signIn()` (native bridge).
3. On success: returns `{ idToken, user: { id, email, name, ... } }`.
4. App sends `idToken` to Supabase: `supabase.auth.signInWithIdToken({ provider: 'google', token: idToken })`.
5. Supabase validates token + returns session.
6. If email never seen before: creates Supabase user (first sign-in auto-creates).
7. Store session in `AsyncStorage`.

**Pros:** Single tap. Biometric unlock on device. User data linked to Google account.
**Cons:** Requires Google account. Requires native module + enrollment.

---

### AU3: Sign in with Apple

**Prerequisite: Apple Setup**

1. App Store Connect → Identifiers → enable "Sign in with Apple" for bundle ID `com.lexitap.app`.
2. Create Service ID (for web/backend auth, not needed here but documented for completeness).
3. Supabase: Auth → Providers → Apple → paste **Client ID** (= bundle ID) + **Client Secret** (JWT signed with team private key — see Apple docs).

**Native Module: `@react-native-apple-authentication`**

Setup:

```bash
cd mobile
npm install @react-native-apple-authentication
```

Config in `app.config.ts` (no plugin required; native code configured via app.json):

```typescript
ios: {
  // ... other iOS config
  entitlements: {
    'com.apple.developer.applesignin': ['Default'],
  },
}
```

**Flow:**

1. User taps "Sign in with Apple" on `SignInWithAppleScreen`.
2. Call `appleAuth.performRequest({ requestedOperation: appleAuth.Operation.LOGIN, requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME] })`.
3. On success: returns `{ identityToken, user: { email, fullName, ... } }`.
4. App sends `identityToken` to Supabase: `supabase.auth.signInWithIdToken({ provider: 'apple', token: identityToken })`.
5. Supabase validates + returns session.
6. If first sign-in: user created. Note: Apple email is a **relay** (unique per app per device); never shared with app.
7. Store session.

**Pros:** Native Apple UI. Works on iPhone + iPad. One-tap biometric. Mandatory for App Store v1.
**Cons:** iOS only. Requires native module + Apple Developer enrollment.

---

## 3. Mobile App Integration (AU1.1–AU3.5)

### Task AU1: Magic-Link Implementation

| Task | Effort | Description |
|------|--------|-------------|
| **AU1.1** | S | Create `AuthContext` (React Context + Provider). State: `{ isLoading, user, session, error }`. Methods: `signInWithEmail`, `verifyOtp`, `signOut`, `deleteAccount`. Persist session to `AsyncStorage` at sign-in; restore on app launch. |
| **AU1.2** | S | `supabase.ts` adapter in `infrastructure/auth/`: initialize `SupabaseClient`, helper fns for OTP flow (`signInWithOtp`, `verifyOtp`, `getSession`). Store client instance (singleton). |
| **AU1.3** | S | `SignInWithMagicLinkScreen` (presentation layer). Email input → "Send Code" button → sends OTP → conditionally show "Enter Code" input (after OTP sent). On verify: dismiss + navigate to home. Error handling: invalid email, OTP expired, network offline. |
| **AU1.4** | S | Deep-link handler in `app/(root)/_layout.tsx`: catch `lexitap://auth/callback?code=…` → extract code → call `verifyOtp` + navigate. Test with dev email. |
| **AU1.5** | M | `AccountDeletionModal` (from Settings): request confirmation → POST auth/delete (authenticated) → sign out locally → navigate to SignInScreen. Handles server error + network offline. |
| **AU1.6** | M | Tests: AuthContext subscribe + restore, OTP round-trip (unit-test mocked Supabase), deep-link parse, error states. |

---

### Task AU2: Google Sign-In

| Task | Effort | Description |
|------|--------|-------------|
| **AU2.1** | S | Install + configure `@react-native-google-signin/google-signin` in `app.config.ts` (iosClientId env var). Generate Android `google-services.json` from Google Cloud Console, place in `android/app/`, add to `.gitignore` (contains API key). |
| **AU2.2** | S | `infrastructure/auth/GoogleSignInAdapter.ts`: init GoogleSignin in app startup hook, expose `signIn()` method (calls native bridge, returns idToken). |
| **AU2.3** | S | Extend `AuthContext` methods: `signInWithGoogle`. Flow: call adapter → get idToken → pass to Supabase `signInWithIdToken({ provider: 'google', ... })` → handle first-signin user creation. |
| **AU2.4** | S | `SignInWithGoogleScreen`: single button "Sign in with Google". Tap → calls `AuthContext.signInWithGoogle()`. Shows loading state + error toast. Auto-navigates to home on success. |
| **AU2.5** | S | Integration with RevenueCat: after successful Google sign-in, call `Purchases.logIn(supabaseUserId)` (entitlement alias). Store supabaseUserId in AsyncStorage for future app launches. |
| **AU2.6** | M | Tests: adapter init, idToken extraction, Supabase call, RevenueCat alias, error handling (user cancelled, network, invalid token). |

---

### Task AU3: Sign in with Apple

| Task | Effort | Description |
|------|--------|-------------|
| **AU3.1** | S | Install + configure `@react-native-apple-authentication` (iOS only). Add iOS entitlements in `app.config.ts`. |
| **AU3.2** | S | `infrastructure/auth/AppleSignInAdapter.ts`: init auth + expose `signIn()` method (calls native `performRequest`). Handle user cancelled vs error. |
| **AU3.3** | S | Extend `AuthContext`: `signInWithApple`. Flow: adapter → identityToken → Supabase `signInWithIdToken({ provider: 'apple', ... })` → user creation. |
| **AU3.4** | S | `SignInWithAppleScreen` (iOS only, hidden on Android): button "Sign in with Apple". Same UX as Google. |
| **AU3.5** | M | RevenueCat alias + entitlements (same as AU2). Tests: adapter, token flow, error handling, Android graceful fallback (hide button). |

---

### Task AU4: Auth State Persistence & Protected Routes

| Task | Effort | Description |
|------|--------|-------------|
| **AU4.1** | S | App initialization hook: on launch, check `AsyncStorage` for stored session. If present + valid: restore user + skip sign-in screens. If absent or expired: route to sign-in. |
| **AU4.2** | S | `useAuth` hook: expose `isAuthenticated`, `user`, `signOut`, for conditional navigation. |
| **AU4.3** | M | Protected routes: gate Quiz, Paywall, Settings behind auth check. If not authenticated: show overlay "Sign in to continue" → redirect to sign-in screen. Allow read-only home + onboarding pre-sign-in. |
| **AU4.4** | M | Session refresh: on app resume, call `Supabase.auth.refreshSession()` if session exists + token near expiry. Handle token expiry gracefully (sign out + ask to sign in again). |
| **AU4.5** | M | Tests: session restore from AsyncStorage, expiry refresh, protected route gating. |

---

### Task AU5: Account Linking & Multi-Device

| Task | Effort | Description |
|------|--------|-------------|
| **AU5.1** | M | Settings screen: show "Linked Accounts" section. Display email + sign-in method (Magic-link / Google / Apple). Show "Sign Out" (this device only, not account-wide). |
| **AU5.2** | M | Post-launch: allow linking multiple methods to same account (e.g., email + Google). Requires Supabase identity linking API. Deferred to Phase 4. |
| **AU5.3** | M | Session management: one session per device. Signing in on Device B doesn't sign out Device A. Signing out only clears local AsyncStorage. |

---

## 4. Database Schema Changes (AU1–AU3)

### Supabase Auth Table (Managed by Supabase)

No schema changes required. Supabase auto-manages `auth.users` on OTP verification + OAuth sign-in.

### User Stats Schema (Mobile)

`user_stats` table already has `user_id` (foreign key to Supabase). On first auth:

```sql
UPDATE user_stats
SET user_id = '<supabase-uid>'
WHERE user_id IS NULL AND (device_id = '<current-device-id>' OR user_id IS NULL);
```

**Or simpler:** Auto-populate on auth:

```typescript
// In AuthContext after successful sign-in
await saveUserStats({ 
  user_id: supabaseUser.id, 
  // ... other fields 
});
```

No new tables required. Entitlements live in RevenueCat only (never in user.db).

---

## 5. API Endpoints Required

### Auth Backend (Supabase Edge Functions or custom backend)

These can be Supabase Edge Functions or a lightweight Node backend (deferred to Phase 4 if using Supabase RLS + `auth.uid()` checks).

| Endpoint | Method | Auth | Body | Response | Notes |
|----------|--------|------|------|----------|-------|
| `/auth/delete` | POST | Bearer token | — | `{ success: true }` | Deletes user + cascades. Offline user.db persists. |
| `/user/profile` | GET | Bearer token | — | `{ id, email, created_at }` | Read signed-in user data. |
| `/backup/upload` | POST | Bearer token | encrypted user.db blob | `{ uploaded_at, checksum }` | Writes to Supabase Storage (path: `{uid}/user.db`). Phase 3. |
| `/backup/download` | GET | Bearer token | — | encrypted user.db blob | Phase 3. |

**Simple approach for Phase 3:** Use Supabase RLS (Row Level Security) + Auth Context. Row-restrict `/auth/delete` at the database level. Defer REST endpoints to Phase 4.

---

## 6. Critical Integration Points

### RevenueCat Alias (ON EVERY SIGN-IN)

```typescript
// After successful auth (magic-link, Google, Apple)
const { user, session } = await supabase.auth.getSession();
await Purchases.logIn(user.id); // Alias anonymous customer to Supabase ID
```

**Why:** RevenueCat anonymous customer ID (assigned at app install) must be tied to Supabase ID so that:
1. Purchases are attributed correctly after sign-in.
2. Backup restore on new device can query `Purchases.getCustomerInfo()` with same Supabase ID → re-grant entitlements.

### Protected Routes Example

```typescript
// app/(auth)/quiz.tsx (or any paid route)
export default function QuizScreen() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingSpinner />;
  if (!user) {
    return (
      <SignInPrompt
        message="Sign in to access the quiz"
        onSignIn={() => navigation.navigate('SignIn')}
      />
    );
  }

  return <QuizContent />;
}
```

### Session Restore on App Launch

```typescript
// In app root layout or a boot hook
useEffect(() => {
  const restoreSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setUser(session.user);
      // Alias to RevenueCat
      await Purchases.logIn(session.user.id);
    }
  };
  restoreSession();
}, []);
```

---

## 7. Entitlements Access Check

No change to existing check (already correct in codebase):

```typescript
// In tier unlock logic
function hasAccess(tier: Tier, entitlements: string[]): boolean {
  if (tier.unlock.kind === 'free') return true;
  
  if (tier.unlock.kind === 'exam_pack') {
    return entitlements.includes(tier.unlock.entitlementId);
  }
  
  return false;
}
```

Entitlements array passed from RevenueCat (`Purchases.getCustomerInfo()`) — no changes needed here.

---

## 8. Testing Strategy

### Unit Tests

- **AuthContext**: sign-in methods, error states, session persistence.
- **Adapters**: `GoogleSignInAdapter`, `AppleSignInAdapter`, OTP flow.
- **Protected routes**: conditional rendering based on `useAuth()`.

### Integration Tests

- **E2E mock Supabase**: use `supabase-js` in-memory client for dev tests.
- **RevenueCat alias**: mock `Purchases.logIn()`, verify it's called on sign-in.
- **Deep-link parsing**: test `lexitap://auth/callback?code=…` handling.

### Manual Testing (Physical Device)

- **AU1**: Send OTP email, tap link, verify sign-in.
- **AU2**: Sign in with real Google account (requires Google Cloud Console + development sandbox).
- **AU3**: Sign in with real Apple ID (requires physical iOS device or simulator with Apple ID).
- **Multi-device**: Sign in on Device A, verify session persists; sign in on Device B with different method, verify separate sessions.
- **Entitlements**: Purchase exam pack, verify `Purchases.getCustomerInfo()` reflects new entitlement + access check works.

---

## 9. Deployment & Configuration

### Environment Variables (`.env` — never committed)

```env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=xxxx
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=xxxx.apps.googleusercontent.com
# Android client ID auto-detected from google-services.json
```

### Secrets in EAS (for CI builds)

```json
// eas.json
{
  "build": {
    "production": {
      "env": {
        "SUPABASE_URL": "@env SUPABASE_URL",
        "SUPABASE_ANON_KEY": "@env SUPABASE_ANON_KEY",
        "EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID": "@env EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID"
      }
    }
  }
}
```

### Android Configuration

Place `google-services.json` (downloaded from Google Cloud Console) at `mobile/android/app/google-services.json`. Add to `.gitignore`.

```gradle
// android/app/build.gradle
apply plugin: 'com.google.gms.google-services'
```

### iOS Configuration

No additional setup beyond `app.config.ts` entitlements. Xcode auto-provisioning handles signing.

---

## 10. Risk Register

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| **OTP email delivery delayed** | Medium | Frustration, abandoned sign-up | Document latency (up to 2m); offer resend after 30s. Provide fallback manual code entry. |
| **Google OAuth scope creep** | Low | Privacy violation, App Review rejection | Lock scopes to `{ email, profile }`; never request contacts/calendar/files. Document in privacy policy. |
| **Apple email relay breaks** | Low | Lost user identity on device switch | Document Apple's relay behavior; suggest email backup method post-sign-in. |
| **RevenueCat alias fails silently** | Low | Entitlements don't apply after sign-in | Add error logging + retry logic. Test e2e with mock Purchases SDK. |
| **Session expiry mid-flow** | Low | UX break (user booted mid-quiz) | Refresh token before critical ops; show "Your session expired, sign in again" toast. |
| **Account deletion cascade incomplete** | Low | Orphaned backups / privacy leak | Test deletion flow in staging; verify Supabase RLS + app-level cleanup. |

---

## 11. Deliverables Checklist

- [ ] `AuthContext` provider + `useAuth` hook
- [ ] Magic-link flow end-to-end (email → OTP → sign-in)
- [ ] Google Sign-In native integration + Supabase OAuth
- [ ] Sign in with Apple + Supabase OAuth
- [ ] Deep-link callback handler (`lexitap://auth/callback`)
- [ ] Account deletion UI + API integration
- [ ] RevenueCat alias on sign-in
- [ ] Protected routes (Quiz, Paywall gated)
- [ ] Session persistence + restore on launch
- [ ] Tests: unit + integration (E2E via mock Supabase)
- [ ] Documentation: `mobile/AUTH_INTEGRATION.md` (templates + setup)
- [ ] EAS + environment variable configuration
- [ ] Manual test plan: AU1 (email), AU2 (Google sandbox), AU3 (physical iOS device)

---

## 12. Effort Summary

| Phase | Task | Effort | Notes |
|-------|------|--------|-------|
| **AU1** | Magic-link OTP | 4S + 2M = **~5 days** | Auth flow + deep-link + account deletion |
| **AU2** | Google Sign-In | 2S + 2M = **~3 days** | Native module + Supabase OAuth + RevenueCat alias |
| **AU3** | Sign in with Apple | 2S + 2M = **~3 days** | Native module + Apple OAuth (iOS only) |
| **AU4** | Session persistence + protected routes | 2S + 4M = **~5 days** | State restore, protected route gating, refresh logic |
| **AU5** | Account linking (deferred) | — | Post-launch |
| **Testing + Deployment** | E2E tests, EAS config, docs | 2M = **~2 days** | Manual test on physical devices |
| **Total** | **~18 days (3 weeks)** | Parallel: AU2/AU3 while AU1 in code review; AU4/AU5 follow. | Tests run parallel to development. |

**Critical path:** AU1 (magic-link) → AU2/AU3 (Google + Apple, parallel) → AU4 (session + protected routes) → test.

---

## 13. Definition of Done (Exit Gate: P3.AU)

- [ ] All three sign-in methods functional on physical iOS + Android device.
- [ ] Magic-link OTP received + verified (use test email).
- [ ] Google OAuth completes + entitlements alias works.
- [ ] Sign in with Apple works on physical iOS + Apple ID.
- [ ] Account deletion tested: user deleted → can re-sign-up with same email.
- [ ] Session persists across app restarts (test force-kill app).
- [ ] Protected routes enforce sign-in: unauthenticated user redirected to sign-in screen.
- [ ] RevenueCat `getCustomerInfo()` reflects correct entitlements post-sign-in.
- [ ] Tests pass: unit (AuthContext, adapters) + integration (E2E with mock Supabase).
- [ ] `npm run check` green (mobile).
- [ ] Documentation: `mobile/AUTH_INTEGRATION.md` written + linked from README.

---

## 14. Post-Phase 3 (P4/P5)

- **A5.2 (Account linking):** Link email + Google + Apple to same Supabase account. Requires Supabase identity linking API + UI in Settings.
- **Refresh token rotation:** Long-lived refresh tokens → shorter access tokens for security.
- **Passwordless email fallback:** If user forgets which social provider, send magic-link to email as recovery.
- **Multi-factor authentication:** Deferred; may add post-launch if user base requests.

---

*Supersedes the "AU1–AU3 deferred to Phase 5" ordering in published ROADMAP.md. Auth is a Phase 3 hard dependency of backup + B2B + App Store 4.8 (SIWA mandatory). Authoritative: RELEASE_PLAN.md § 3.*
