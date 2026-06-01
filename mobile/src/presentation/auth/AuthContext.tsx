import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { AuthSession, Result } from '@/domain/auth/AuthPort';
import { useServices } from '@/presentation/services';

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
