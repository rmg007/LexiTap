import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/presentation/screens/Screen';
import { Text, Button } from '@/presentation/components';
import { useTheme } from '@/presentation/theme';
import { useAuth } from '@/presentation/auth';

// Two-phase magic-link sign-in:
//   'email' — user enters email address → tap "Send code" → Supabase sends OTP email
//   'verify' — user enters 6-digit code → tap "Verify" → session created → navigate home

type Phase = 'email' | 'verify';

export function SignInScreen(): React.JSX.Element {
  const { colors, spacing, radii } = useTheme();
  const { signInWithOtp, verifyOtp } = useAuth();

  const [phase, setPhase] = useState<Phase>('email');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputBase = {
    height: 48,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.bgSurfaceRaised,
    color: colors.textPrimary,
    paddingHorizontal: spacing.s3,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  };

  const handleSend = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setError('Enter your email address.');
      return;
    }
    setLoading(true);
    setError(null);
    const result = await signInWithOtp(trimmed);
    setLoading(false);
    if (result.ok) {
      setToken('');
      setPhase('verify');
    } else {
      setError(result.error.message);
    }
  };

  const handleVerify = async () => {
    const trimmed = token.trim();
    if (trimmed.length < 6) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    setLoading(true);
    setError(null);
    const result = await verifyOtp(email.trim(), trimmed);
    setLoading(false);
    if (result.ok) {
      router.replace('/');
    } else {
      setError(result.error.message);
    }
  };

  const handleBack = () => {
    setError(null);
    setToken('');
    setPhase('email');
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1, justifyContent: 'center', gap: spacing.s5 }}>
          <View style={{ gap: spacing.s2 }}>
            <Text variant="title" color="textPrimary" accessibilityRole="header">
              {phase === 'email' ? 'Sign in' : 'Check your email'}
            </Text>
            <Text variant="body" color="textSecondary">
              {phase === 'email'
                ? 'Enter your email to receive a sign-in code. No password needed.'
                : `We sent a 6-digit code to ${email}. Enter it below.`}
            </Text>
          </View>

          {phase === 'email' ? (
            <View style={{ gap: spacing.s3 }}>
              <TextInput
                value={email}
                onChangeText={(v) => { setEmail(v); setError(null); }}
                placeholder="your@email.com"
                placeholderTextColor={colors.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                returnKeyType="send"
                onSubmitEditing={handleSend}
                style={inputBase}
                accessibilityLabel="Email address"
                editable={!loading}
              />
              <Button
                label={loading ? 'Sending…' : 'Send code'}
                variant="primary"
                fullWidth
                disabled={loading}
                onPress={handleSend}
              />
            </View>
          ) : (
            <View style={{ gap: spacing.s3 }}>
              <TextInput
                value={token}
                onChangeText={(v) => { setToken(v.replace(/\D/g, '').slice(0, 6)); setError(null); }}
                placeholder="123456"
                placeholderTextColor={colors.textTertiary}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                returnKeyType="done"
                onSubmitEditing={handleVerify}
                style={[inputBase, { letterSpacing: 8, textAlign: 'center', fontSize: 28 }]}
                accessibilityLabel="Sign-in code"
                maxLength={6}
                editable={!loading}
              />
              <Button
                label={loading ? 'Verifying…' : 'Verify code'}
                variant="primary"
                fullWidth
                disabled={loading || token.trim().length < 6}
                onPress={handleVerify}
              />

              {loading ? (
                <ActivityIndicator size="small" color={colors.textTertiary} />
              ) : null}

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.s1 }}>
                <Pressable
                  onPress={handleBack}
                  accessibilityRole="button"
                  accessibilityLabel="Back to email entry"
                  style={{ paddingVertical: spacing.s2, paddingHorizontal: spacing.s1 }}
                >
                  <Text variant="label" color="textTertiary">← Back</Text>
                </Pressable>
                <Pressable
                  onPress={handleSend}
                  disabled={loading}
                  accessibilityRole="button"
                  accessibilityLabel="Resend sign-in code"
                  style={{ paddingVertical: spacing.s2, paddingHorizontal: spacing.s1 }}
                >
                  <Text variant="label" color="accent">Resend code</Text>
                </Pressable>
              </View>
            </View>
          )}

          {error !== null ? (
            <Text variant="caption" color="destructive" accessibilityRole="alert">
              {error}
            </Text>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
