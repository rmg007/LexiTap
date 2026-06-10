import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { AppState, Linking } from 'react-native';
import { router } from 'expo-router';
import type { AuthSession, Result } from '@/domain/auth/AuthPort';
import { AppleSignInAdapter } from '@/infrastructure/auth/AppleSignInAdapter';
import { GoogleSignInAdapter } from '@/infrastructure/auth/GoogleSignInAdapter';
import { useServices } from '@/presentation/services';

// Extract ?token_hash=... from a lexitap://auth/callback deep-link URL.
// Regex avoids URL constructor which is unreliable in some RN versions.
function parseTokenHash(url: string): string | null {
  const match = /[?&]token_hash=([^&#]+)/.exec(url);
  const group = match?.[1];
  return group ? decodeURIComponent(group) : null;
}

// Auth state + actions surfaced to the presentation layer.
// Lives here (not on Services) because it manages React state (session,
// isLoading) that must propagate via context, not direct service calls.

interface AuthContextValue {
  readonly session: AuthSession | null;
  // true only during the initial getSession() restore on mount.
  readonly isLoading: boolean;
  // Whether the native provider buttons should render at all. appleAvailable
  // resolves async (isAvailableAsync); googleAvailable is a build-time constant
  // (EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID present).
  readonly appleAvailable: boolean;
  readonly googleAvailable: boolean;
  signInWithOtp(email: string): Promise<Result>;
  verifyOtp(email: string, token: string): Promise<Result<AuthSession>>;
  // Native provider flows: present the OS sheet, exchange the ID token for a
  // Supabase session. err kind 'cancelled' means the user dismissed the sheet —
  // callers show NO error for it.
  signInWithApple(): Promise<Result<AuthSession>>;
  signInWithGoogle(): Promise<Result<AuthSession>>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// The adapters that drive the native provider sheets. The slices AuthProvider
// needs are structural so tests inject fakes via AuthProvider props.
export interface AppleSignIn {
  isAvailable(): Promise<boolean>;
  signIn(): Promise<Result<string>>;
}
export interface GoogleSignIn {
  isConfigured(): boolean;
  signIn(): Promise<Result<string>>;
}

// Module-level singletons: construction is side-effect free (no native calls
// until isAvailable/signIn), so this is safe at import time.
const defaultAppleAdapter: AppleSignIn = new AppleSignInAdapter();
const defaultGoogleAdapter: GoogleSignIn = new GoogleSignInAdapter();

interface AuthProviderProps {
  children: ReactNode;
  // Injectable for tests; default to the real native adapters.
  apple?: AppleSignIn;
  google?: GoogleSignIn;
}

export function AuthProvider({
  children,
  apple = defaultAppleAdapter,
  google = defaultGoogleAdapter,
}: AuthProviderProps): React.JSX.Element {
  const { auth } = useServices();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const googleAvailable = google.isConfigured();

  useEffect(() => {
    let cancelled = false;
    apple.isAvailable().then((available) => {
      if (!cancelled) setAppleAvailable(available);
    });
    return () => {
      cancelled = true;
    };
  }, [apple]);

  useEffect(() => {
    let cancelled = false;
    // Restore the persisted keychain session on mount. SupabaseAuthService keeps
    // the token fresh (autoRefreshToken: true) so this is usually near-instant.
    auth.getSession().then((s) => {
      if (!cancelled) {
        setSession(s);
        setIsLoading(false);
      }
    });
    // Mirror token refreshes and remote sign-outs from the SDK event loop.
    const unsub = auth.onAuthStateChange((s) => {
      if (!cancelled) setSession(s);
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, [auth]);

  // Re-sync session when the app returns to the foreground. The Supabase SDK
  // refreshes the JWT automatically (autoRefreshToken: true) but React state
  // may lag if the app was backgrounded for a long time before the event fires.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        auth.getSession().then((s) => setSession(s)).catch(() => {});
      }
    });
    return () => sub.remove();
  }, [auth]);

  // Deep-link handler for lexitap://auth/callback?token_hash=…&type=email.
  // Supabase sends this link in the magic-link email alongside the 6-digit code;
  // tapping it exchanges the token_hash for a full session without entering a code.
  useEffect(() => {
    const handleUrl = (url: string): void => {
      if (!url.includes('auth/callback')) return;
      const tokenHash = parseTokenHash(url);
      if (!tokenHash) return;
      auth.verifyOtpLink(tokenHash).then((result) => {
        if (result.ok) {
          setSession(result.value);
          router.replace('/');
        }
      }).catch(() => {});
    };

    // Cold-start: app was not running when the link was tapped.
    Linking.getInitialURL().then((url) => { if (url) handleUrl(url); }).catch(() => {});
    // Warm: app already running (background or foreground).
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, [auth]);

  const signInWithOtp = useCallback(
    (email: string) => auth.signInWithOtp(email),
    [auth],
  );

  const verifyOtp = useCallback(
    async (email: string, token: string): Promise<Result<AuthSession>> => {
      const result = await auth.verifyOtp(email, token);
      if (result.ok) setSession(result.value);
      return result;
    },
    [auth],
  );

  // Compose: native sheet → provider ID token → Supabase session. Adapter
  // failures (cancelled / unavailable / unknown) pass through unchanged — the
  // err branch of Result<string> is identical to Result<AuthSession>'s.
  const signInWithApple = useCallback(async (): Promise<Result<AuthSession>> => {
    const token = await apple.signIn();
    if (!token.ok) return token;
    const result = await auth.signInWithIdToken('apple', token.value);
    if (result.ok) setSession(result.value);
    return result;
  }, [apple, auth]);

  const signInWithGoogle = useCallback(async (): Promise<Result<AuthSession>> => {
    const token = await google.signIn();
    if (!token.ok) return token;
    const result = await auth.signInWithIdToken('google', token.value);
    if (result.ok) setSession(result.value);
    return result;
  }, [google, auth]);

  const signOut = useCallback(async () => {
    await auth.signOut();
    setSession(null);
  }, [auth]);

  return (
    <AuthContext.Provider
      value={{
        session,
        isLoading,
        appleAvailable,
        googleAvailable,
        signInWithOtp,
        verifyOtp,
        signInWithApple,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === null) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
