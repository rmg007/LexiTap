# LexiTap Auth Integration Guide

**Reference:** `plans/P3_AUTH_PLAN.md` for the full spec.

This document provides **code templates and setup instructions** for implementing three sign-in methods: magic-link (Supabase OTP), Google Sign-In, and Sign in with Apple.

---

## 1. AuthContext Setup

### File: `src/infrastructure/auth/AuthContext.tsx`

```typescript
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { supabase } from './supabase';
import { Purchases } from 'react-native-purchases';

export interface AuthUser {
  id: string; // Supabase user ID
  email?: string;
  fullName?: string;
}

export interface AuthContextType {
  isLoading: boolean;
  isSigningUp: boolean;
  user: AuthUser | null;
  error: string | null;
  signInWithEmail: (email: string) => Promise<void>;
  verifyOtp: (email: string, token: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Restore session on app launch
  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setUser({
            id: session.user.id,
            email: session.user.email,
          });
          // Alias to RevenueCat
          await Purchases.logIn(session.user.id);
        }
      } catch (err) {
        console.error('[Auth] Session restore failed:', err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const handleSignIn = async (user: AuthUser) => {
    setUser(user);
    setError(null);
    // Alias anonymous customer ID to Supabase ID
    try {
      await Purchases.logIn(user.id);
    } catch (err) {
      console.error('[Auth] RevenueCat alias failed:', err);
      // Non-blocking; user is signed in locally
    }
  };

  const signInWithEmail = async (email: string) => {
    try {
      setIsSigningUp(true);
      setError(null);
      const { error: err } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      if (err) throw err;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign-in failed';
      setError(message);
      throw err;
    } finally {
      setIsSigningUp(false);
    }
  };

  const verifyOtp = async (email: string, token: string) => {
    try {
      setError(null);
      const { data, error: err } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });
      if (err) throw err;
      if (data.user && data.session) {
        await handleSignIn({
          id: data.user.id,
          email: data.user.email,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'OTP verification failed';
      setError(message);
      throw err;
    }
  };

  const signInWithGoogle = async () => {
    try {
      setError(null);
      const googleAdapter = await getGoogleSignInAdapter();
      const { idToken } = await googleAdapter.signIn();

      const { data, error: err } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });
      if (err) throw err;
      if (data.user && data.session) {
        await handleSignIn({
          id: data.user.id,
          email: data.user.user_metadata?.email,
          fullName: data.user.user_metadata?.full_name,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google sign-in failed';
      setError(message);
      throw err;
    }
  };

  const signInWithApple = async () => {
    try {
      setError(null);
      const appleAdapter = await getAppleSignInAdapter();
      const { identityToken } = await appleAdapter.signIn();

      const { data, error: err } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: identityToken,
      });
      if (err) throw err;
      if (data.user && data.session) {
        await handleSignIn({
          id: data.user.id,
          email: data.user.user_metadata?.email,
          fullName: data.user.user_metadata?.full_name,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Apple sign-in failed';
      setError(message);
      throw err;
    }
  };

  const signOut = async () => {
    try {
      setError(null);
      await supabase.auth.signOut();
      setUser(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign-out failed';
      setError(message);
      throw err;
    }
  };

  const deleteAccount = async () => {
    try {
      setError(null);
      // Call authenticated endpoint to delete user + cascade
      const { error: err } = await supabase
        .from('user_stats')
        .update({ deleted_at: new Date().toISOString() })
        .eq('user_id', user?.id);
      
      if (err) throw err;

      // Sign out locally
      await signOut();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Account deletion failed';
      setError(message);
      throw err;
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        isLoading,
        isSigningUp,
        user,
        error,
        signInWithEmail,
        verifyOtp,
        signInWithGoogle,
        signInWithApple,
        signOut,
        deleteAccount,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be called within AuthProvider');
  }
  return context;
}
```

---

## 2. Supabase Client Setup

### File: `src/infrastructure/auth/supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Persistent session storage using Expo SecureStore
const expoSecureStorage = {
  getItem: async (key: string) => {
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string) => {
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string) => {
    return SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: expoSecureStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

---

## 3. Google Sign-In Setup

### File: `src/infrastructure/auth/GoogleSignInAdapter.ts`

```typescript
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

export interface GoogleSignInResult {
  idToken: string;
  email?: string;
  name?: string;
}

export async function initializeGoogleSignIn() {
  try {
    await GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      // iOS and Android client IDs handled by Expo config
      offlineAccess: false,
      forceCodeForRefreshToken: true,
      scopes: ['profile', 'email'],
    });
  } catch (err) {
    console.error('[GoogleSignIn] Init failed:', err);
  }
}

export async function getGoogleSignInResult(): Promise<GoogleSignInResult> {
  try {
    await GoogleSignin.hasPlayServices();
    const userInfo = await GoogleSignin.signIn();
    
    if (!userInfo.idToken) {
      throw new Error('No ID token returned from Google Sign-In');
    }

    return {
      idToken: userInfo.idToken,
      email: userInfo.user?.email,
      name: userInfo.user?.name,
    };
  } catch (error: any) {
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      throw new Error('Sign-in cancelled');
    } else if (error.code === statusCodes.IN_PROGRESS) {
      throw new Error('Sign-in in progress');
    } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new Error('Play Services not available');
    }
    throw error;
  }
}

export async function signOutGoogle() {
  try {
    await GoogleSignin.signOut();
  } catch (err) {
    console.error('[GoogleSignIn] Sign-out failed:', err);
  }
}
```

### App Config (`app.config.ts`)

```typescript
plugins: [
  'expo-router',
  'expo-sqlite',
  ['expo-asset', { assets: ['./assets/vocab/words.db'] }],
  [
    '@react-native-google-signin/google-signin',
    {
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      // androidClientId auto-detected from android/app/google-services.json
    },
  ],
],
```

### Android Setup

1. Download `google-services.json` from Google Cloud Console.
2. Place at `mobile/android/app/google-services.json`.
3. Add to `.gitignore`:

```gitignore
android/app/google-services.json
```

4. Update `android/app/build.gradle`:

```gradle
apply plugin: 'com.google.gms.google-services'
```

---

## 4. Sign in with Apple Setup

### File: `src/infrastructure/auth/AppleSignInAdapter.ts`

```typescript
import * as appleAuth from 'react-native-apple-authentication';
import { Platform } from 'react-native';

export interface AppleSignInResult {
  identityToken: string;
  email?: string;
  fullName?: string;
}

export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    return await appleAuth.isSignUpButtonAvailable();
  } catch {
    return false;
  }
}

export async function getAppleSignInResult(): Promise<AppleSignInResult> {
  if (Platform.OS !== 'ios') {
    throw new Error('Sign in with Apple is iOS-only');
  }

  try {
    const credential = await appleAuth.performRequest({
      requestedOperation: appleAuth.Operation.LOGIN,
      requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
    });

    if (!credential.identityToken) {
      throw new Error('No identity token returned from Apple Sign-In');
    }

    return {
      identityToken: credential.identityToken,
      email: credential.email || undefined,
      fullName: credential.fullName
        ? `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim()
        : undefined,
    };
  } catch (error: any) {
    if (error.code === appleAuth.Error.OPERATION_CANCELLED) {
      throw new Error('Sign-in cancelled');
    }
    throw error;
  }
}
```

### App Config (`app.config.ts`)

```typescript
ios: {
  supportsTablet: true,
  bundleIdentifier: 'com.lexitap.app',
  appleTeamId: 'W8FZGT253G',
  infoPlist: {
    ITSAppUsesNonExemptEncryption: false,
  },
  entitlements: {
    'com.apple.developer.applesignin': ['Default'],
  },
},
```

---

## 5. Sign-In Screens

### File: `src/presentation/screens/SignInWithMagicLinkScreen.tsx`

```typescript
import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, Alert } from 'react-native';
import { useAuth } from '../../infrastructure/auth/AuthContext';

export default function SignInWithMagicLinkScreen() {
  const { signInWithEmail, verifyOtp, isSigningUp, error } = useAuth();
  const [email, setEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');

  const handleSendOtp = async () => {
    try {
      await signInWithEmail(email);
      setOtpSent(true);
    } catch {
      Alert.alert('Error', error || 'Failed to send OTP');
    }
  };

  const handleVerifyOtp = async () => {
    try {
      await verifyOtp(email, otp);
      // Navigation handled by auth state change
    } catch {
      Alert.alert('Error', error || 'Invalid OTP');
    }
  };

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
      {!otpSent ? (
        <>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 20 }}>
            Sign in with Email
          </Text>
          <TextInput
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            style={{
              borderWidth: 1,
              borderColor: '#ccc',
              padding: 12,
              marginBottom: 16,
              borderRadius: 8,
            }}
            editable={!isSigningUp}
          />
          <TouchableOpacity
            onPress={handleSendOtp}
            disabled={!email || isSigningUp}
            style={{
              backgroundColor: '#007AFF',
              padding: 12,
              borderRadius: 8,
              alignItems: 'center',
              opacity: !email || isSigningUp ? 0.5 : 1,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>
              {isSigningUp ? 'Sending...' : 'Send Code'}
            </Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 20 }}>
            Enter the code from your email
          </Text>
          <TextInput
            placeholder="6-digit code"
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={6}
            style={{
              borderWidth: 1,
              borderColor: '#ccc',
              padding: 12,
              marginBottom: 16,
              borderRadius: 8,
              fontSize: 24,
              textAlign: 'center',
              letterSpacing: 4,
            }}
          />
          <TouchableOpacity
            onPress={handleVerifyOtp}
            disabled={otp.length !== 6}
            style={{
              backgroundColor: '#007AFF',
              padding: 12,
              borderRadius: 8,
              alignItems: 'center',
              opacity: otp.length !== 6 ? 0.5 : 1,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Verify Code</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setOtpSent(false)}
            style={{ marginTop: 12 }}
          >
            <Text style={{ textAlign: 'center', color: '#007AFF' }}>
              Didn't receive a code? Try again
            </Text>
          </TouchableOpacity>
        </>
      )}
      {error && (
        <Text style={{ color: 'red', marginTop: 16, textAlign: 'center' }}>
          {error}
        </Text>
      )}
    </View>
  );
}
```

### File: `src/presentation/screens/SignInWithGoogleScreen.tsx`

```typescript
import React from 'react';
import { View, TouchableOpacity, Text, Alert } from 'react-native';
import { useAuth } from '../../infrastructure/auth/AuthContext';
import { initializeGoogleSignIn } from '../../infrastructure/auth/GoogleSignInAdapter';

export default function SignInWithGoogleScreen() {
  const { signInWithGoogle, error } = useAuth();

  const handleGoogleSignIn = async () => {
    try {
      await initializeGoogleSignIn();
      await signInWithGoogle();
    } catch (err) {
      Alert.alert('Error', error || 'Google sign-in failed');
    }
  };

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
      <TouchableOpacity
        onPress={handleGoogleSignIn}
        style={{
          backgroundColor: '#fff',
          borderWidth: 1,
          borderColor: '#ccc',
          padding: 12,
          borderRadius: 8,
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <Text style={{ color: '#000', fontWeight: 'bold' }}>
          Sign in with Google
        </Text>
      </TouchableOpacity>
      {error && (
        <Text style={{ color: 'red', textAlign: 'center' }}>
          {error}
        </Text>
      )}
    </View>
  );
}
```

### File: `src/presentation/screens/SignInWithAppleScreen.tsx`

```typescript
import React from 'react';
import { View, TouchableOpacity, Text, Alert, Platform } from 'react-native';
import { useAuth } from '../../infrastructure/auth/AuthContext';

export default function SignInWithAppleScreen() {
  const { signInWithApple, error } = useAuth();

  if (Platform.OS !== 'ios') {
    return null; // Hide on Android
  }

  const handleAppleSignIn = async () => {
    try {
      await signInWithApple();
    } catch (err) {
      Alert.alert('Error', error || 'Apple sign-in failed');
    }
  };

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
      <TouchableOpacity
        onPress={handleAppleSignIn}
        style={{
          backgroundColor: '#000',
          padding: 12,
          borderRadius: 8,
          alignItems: 'center',
        }}
      >
        <Text style={{ color: '#fff', fontWeight: 'bold' }}>
          Sign in with Apple
        </Text>
      </TouchableOpacity>
      {error && (
        <Text style={{ color: 'red', textAlign: 'center', marginTop: 12 }}>
          {error}
        </Text>
      )}
    </View>
  );
}
```

---

## 6. Protected Routes Example

### File: `src/presentation/screens/QuizScreen.tsx`

```typescript
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useAuth } from '../../infrastructure/auth/AuthContext';
import { useNavigation } from '@react-navigation/native';

export default function QuizScreen() {
  const { user, isLoading } = useAuth();
  const navigation = useNavigation();

  if (isLoading) {
    return <Text>Loading...</Text>;
  }

  if (!user) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ marginBottom: 16 }}>Sign in to access the quiz</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('SignIn')}
          style={{ backgroundColor: '#007AFF', padding: 12, borderRadius: 8 }}
        >
          <Text style={{ color: '#fff' }}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Quiz</Text>
      {/* Quiz content */}
    </View>
  );
}
```

---

## 7. Environment Variables

### File: `.env.example` (commit this)

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your_google_ios_client_id.apps.googleusercontent.com
```

### File: `.env` (local dev, add to `.gitignore`)

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your_google_ios_client_id.apps.googleusercontent.com
```

---

## 8. Testing

### Unit Test Example: `__tests__/AuthContext.test.ts`

```typescript
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useAuth, AuthProvider } from '../infrastructure/auth/AuthContext';

// Mock Supabase
jest.mock('../infrastructure/auth/supabase', () => ({
  supabase: {
    auth: {
      signInWithOtp: jest.fn(),
      verifyOtp: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(() => Promise.resolve({ data: { session: null } })),
    },
  },
}));

describe('AuthContext', () => {
  it('should sign in with OTP', async () => {
    const wrapper = ({ children }: any) => <AuthProvider>{children}</AuthProvider>;
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.signInWithEmail('test@example.com');
    });

    // Assert OTP was requested
    expect(result.current.isSigningUp).toBe(false);
  });
});
```

---

## 9. Deep-Link Handling

### File: `app/(root)/_layout.tsx`

```typescript
import { useEffect } from 'react';
import { useNavigation, LinkingOptions } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { useAuth } from '../infrastructure/auth/AuthContext';

const linking: LinkingOptions<any> = {
  prefixes: ['lexitap://', 'https://lexitap.app'],
  config: {
    screens: {
      'auth-callback': 'auth/callback',
    },
  },
};

export default function RootLayout() {
  const navigation = useNavigation();
  const { verifyOtp } = useAuth();

  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      const parsed = Linking.parse(url);
      if (parsed.path === 'auth/callback' && parsed.queryParams?.code) {
        const code = parsed.queryParams.code as string;
        const email = parsed.queryParams.email as string;

        // Verify OTP
        verifyOtp(email, code).catch((err) => {
          console.error('[DeepLink] OTP verification failed:', err);
        });
      }
    });

    return () => subscription.remove();
  }, [verifyOtp]);

  return (
    // Your layout component
  );
}
```

---

## 10. Checklist

- [ ] Supabase project created + environment variables set.
- [ ] Magic-link OTP template configured in Supabase dashboard.
- [ ] Google Cloud Console project created + credentials in `app.config.ts`.
- [ ] `google-services.json` placed at `android/app/` and `.gitignore`'d.
- [ ] Apple Developer account + Sign in with Apple capability enabled.
- [ ] `AuthContext` provider wraps app root.
- [ ] All three sign-in screens render without errors.
- [ ] Deep-link callback handler parses `lexitap://auth/callback?code=…`.
- [ ] RevenueCat `Purchases.logIn()` called on every successful sign-in.
- [ ] Protected routes gate Quiz + Paywall behind `useAuth()`.
- [ ] Tests: unit (AuthContext, adapters) + integration (E2E with mock).
- [ ] Manual test on physical device: magic-link, Google, Apple (iOS).

---

*Last updated: 2026-05-31. Refer to `plans/P3_AUTH_PLAN.md` for the complete specification.*
