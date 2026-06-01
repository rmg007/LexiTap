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
  signInWithOtp(email: string): Promise<Result>;
  verifyOtp(email: string, token: string): Promise<Result<AuthSession>>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const { auth } = useServices();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  const signOut = useCallback(async () => {
    await auth.signOut();
    setSession(null);
  }, [auth]);

  return (
    <AuthContext.Provider value={{ session, isLoading, signInWithOtp, verifyOtp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === null) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
