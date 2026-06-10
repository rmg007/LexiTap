import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, Share, View, type ViewStyle, Switch, Linking } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { Screen } from '@/presentation/screens/Screen';
import { useTheme, useThemePreference, type ThemePreference } from '@/presentation/theme';
import { Text, Card } from '@/presentation/components';
import { APP_ID } from '@/config/app';
import { useServices, type ContentDbHealth } from '@/presentation/services';
import { useAuth } from '@/presentation/auth';
import { getAnalyticsOptOut, setAnalyticsOptOut } from '@/infrastructure/analytics/AnalyticsOptOutStore';

// Settings: theme override (system / dark / light), analytics opt-out toggle, and
// app metadata. Destructive actions (reset progress, etc.) live behind a confirm sheet
// and are out of MVP scope here.

const THEME_OPTIONS: ReadonlyArray<{ value: ThemePreference; label: string }> = [
  { value: 'system', label: 'System' },
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
];

const DELETE_COUNTDOWN_SECS = 30;

export function SettingsScreen(): React.JSX.Element {
  const { colors, radii, spacing } = useTheme();
  const { preference, setPreference } = useThemePreference();
  const services = useServices();
  const { queries } = services;
  const { session, signOut } = useAuth();
  const [dbHealth, setDbHealth] = useState<ContentDbHealth | null>(null);
  const [hoverState, setHoverState] = useState<ThemePreference | null>(null);
  const [analyticsOptOut, setAnalyticsOptOutLocal] = useState(false);

  // Delete-account modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteCountdown, setDeleteCountdown] = useState(DELETE_COUNTDOWN_SECS);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Restore-from-backup modal state
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState<'ok' | 'no_backup' | 'error' | null>(null);

  // Restore-purchases (IAP) state: idle | busy | error | restored count.
  const [purchasesRestore, setPurchasesRestore] = useState<'idle' | 'busy' | 'error' | number>(
    'idle',
  );

  useEffect(() => {
    queries.getContentDbHealth().then(setDbHealth).catch(() => undefined);
    getAnalyticsOptOut().then(setAnalyticsOptOutLocal).catch(() => undefined);
  }, [queries]);

  useEffect(() => {
    if (!showDeleteModal) {
      if (countdownRef.current) clearInterval(countdownRef.current);
      return;
    }
    setDeleteCountdown(DELETE_COUNTDOWN_SECS);
    setDeleteError(null);
    countdownRef.current = setInterval(() => {
      setDeleteCountdown((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [showDeleteModal]);

  const handleAnalyticsToggle = async (value: boolean) => {
    setAnalyticsOptOutLocal(value);
    await setAnalyticsOptOut(value);
  };

  const handleRestore = async () => {
    setRestoring(true);
    setRestoreResult(null);
    const result = await services.backup.forceRestore();
    setRestoreResult(result);
    setRestoring(false);
  };

  // App Store guideline 3.1.1: a restore mechanism must be reachable for
  // non-consumables — always visible, sign-in not required (store-side identity).
  const handleRestorePurchases = async () => {
    setPurchasesRestore('busy');
    void services.analytics.track('restore_purchases_initiated');
    try {
      const results = await services.iap.restorePurchases();
      setPurchasesRestore(results.length);
      void services.analytics.track('restore_purchases_completed', { count: results.length });
    } catch {
      // IapPort.restorePurchases returns [] on SDK errors; defensive only.
      setPurchasesRestore('error');
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      const result = await services.auth.deleteAccount();
      // not_configured means no real backend — still wipe local data.
      if (!result.ok && result.error.kind !== 'not_configured') {
        setDeleteError(result.error.message);
        setDeleting(false);
        return;
      }
      await services.clearUserData();
      router.replace('/onboarding');
    } catch {
      setDeleteError('Failed to delete account. Please try again.');
      setDeleting(false);
    }
  };

  const handleExportData = async () => {
    try {
      const json = await services.exportUserData.execute();
      await Share.share({ message: json, title: 'My LexiTap Data' });
    } catch {
      Alert.alert('Export failed', 'Could not export your data. Please try again.');
    }
  };

  return (
    <Screen>
      <Text variant="title" color="textPrimary" accessibilityRole="header">
        Settings
      </Text>

      <Card>
        <View style={{ gap: spacing.s3 }}>
          <Text variant="headline" color="textPrimary">
            Account
          </Text>
          {session !== null ? (
            <View style={{ gap: spacing.s2 }}>
              <Text variant="body" color="textSecondary">
                {session.user.email ?? 'Signed in'}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Restore progress from backup"
                onPress={() => { setRestoreResult(null); setShowRestoreModal(true); }}
                style={{ paddingVertical: spacing.s2, paddingHorizontal: spacing.s1, borderRadius: 8 }}
              >
                <Text variant="body" color="accent">
                  Restore from backup
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Sign out"
                onPress={() => signOut()}
                style={{ paddingVertical: spacing.s2, paddingHorizontal: spacing.s1, borderRadius: 8 }}
              >
                <Text variant="body" color="accent">
                  Sign out
                </Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sign in to sync your progress"
              onPress={() => router.push('/auth/sign-in')}
              style={{ paddingVertical: spacing.s2, paddingHorizontal: spacing.s1, borderRadius: 8 }}
            >
              <Text variant="body" color="accent">
                Sign in
              </Text>
              <Text variant="caption" color="textTertiary" style={{ marginTop: spacing.s1 }}>
                Sync and back up your learning progress
              </Text>
            </Pressable>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Restore purchases"
            accessibilityState={{ disabled: purchasesRestore === 'busy' }}
            onPress={handleRestorePurchases}
            disabled={purchasesRestore === 'busy'}
            style={{ paddingVertical: spacing.s2, paddingHorizontal: spacing.s1, borderRadius: 8 }}
          >
            <Text variant="body" color="accent">
              Restore purchases
            </Text>
            {purchasesRestore === 'busy' ? (
              <ActivityIndicator
                size="small"
                color={colors.accent}
                style={{ alignSelf: 'flex-start', marginTop: spacing.s1 }}
              />
            ) : typeof purchasesRestore === 'number' ? (
              <Text
                variant="caption"
                color={purchasesRestore > 0 ? 'success' : 'textSecondary'}
                style={{ marginTop: spacing.s1 }}
              >
                {purchasesRestore > 0
                  ? `Restored ${purchasesRestore} purchase${purchasesRestore === 1 ? '' : 's'}.`
                  : 'No previous purchases found.'}
              </Text>
            ) : purchasesRestore === 'error' ? (
              <Text variant="caption" color="destructive" style={{ marginTop: spacing.s1 }}>
                Could not restore purchases. Please try again.
              </Text>
            ) : null}
          </Pressable>
        </View>
      </Card>

      <Card>
        <View style={{ gap: spacing.s3 }}>
          <Text variant="headline" color="textPrimary">
            Appearance
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.s2 }}>
            {THEME_OPTIONS.map((option) => {
              const selected = preference === option.value;
              const isHovered = hoverState === option.value;
              const chip: ViewStyle = {
                flex: 1,
                minHeight: 48,
                borderRadius: radii.full,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: spacing.s3,
                backgroundColor: selected
                  ? isHovered
                    ? colors.accentPressed
                    : colors.accentSubtle
                  : isHovered
                    ? colors.bgSurfaceRaised
                    : colors.bgSurfaceRaised,
                borderWidth: 1,
                borderColor: selected ? colors.accent : colors.borderSubtle,
              };
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityLabel={`${option.label} appearance`}
                  accessibilityState={{ selected }}
                  onPress={() => setPreference(option.value)}
                  onPressIn={() => setHoverState(option.value)}
                  onPressOut={() => setHoverState(null)}
                  style={chip}
                >
                  <Text variant="label" color={selected ? 'accent' : 'textPrimary'}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Card>

      <Card>
        <View style={{ gap: spacing.s3 }}>
          <Text variant="headline" color="textPrimary">
            Privacy
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, marginRight: spacing.s2 }}>
              <Text variant="label" color="textPrimary">
                Disable Analytics
              </Text>
              <Text variant="caption" color="textTertiary" style={{ marginTop: spacing.s1 }}>
                Help improve LexiTap (usage only, no personal data)
              </Text>
            </View>
            <Switch
              value={analyticsOptOut}
              onValueChange={handleAnalyticsToggle}
              trackColor={{ false: colors.borderSubtle, true: colors.accentSubtle }}
              thumbColor={analyticsOptOut ? colors.accent : colors.bgSurface}
              accessibilityRole="switch"
              accessibilityLabel="Disable analytics"
              accessibilityHint="Toggle to stop sending usage data"
              accessible
            />
          </View>
        </View>
      </Card>

      <Card>
        <View style={{ gap: spacing.s3 }}>
          <Text variant="headline" color="textPrimary">
            Legal
          </Text>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Privacy policy"
            onPress={() => Linking.openURL('https://lexitap.app/privacy.html')}
            style={{
              paddingVertical: spacing.s2,
              paddingHorizontal: spacing.s1,
              borderRadius: 8,
            }}
          >
            <Text variant="body" color="accent" style={{ textDecorationLine: 'underline' }}>
              Privacy Policy
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Terms of service"
            onPress={() => Linking.openURL('https://lexitap.app/terms.html')}
            style={{
              paddingVertical: spacing.s2,
              paddingHorizontal: spacing.s1,
              borderRadius: 8,
            }}
          >
            <Text variant="body" color="accent" style={{ textDecorationLine: 'underline' }}>
              Terms of Service
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Export my data"
            onPress={handleExportData}
            style={{
              paddingVertical: spacing.s2,
              paddingHorizontal: spacing.s1,
              borderRadius: 8,
            }}
          >
            <Text variant="body" color="accent">
              Export my data
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Delete account"
            onPress={() => setShowDeleteModal(true)}
            style={{
              paddingVertical: spacing.s2,
              paddingHorizontal: spacing.s1,
              borderRadius: 8,
            }}
          >
            <Text variant="body" color="destructive" style={{ textDecorationLine: 'underline' }}>
              Delete Account
            </Text>
          </Pressable>
        </View>
      </Card>

      <Text variant="caption" color="textTertiary">
        {(() => {
          const version = Constants.expoConfig?.version ?? '—';
          const build = Constants.nativeBuildVersion ?? '—';
          const rawDate = Constants.expoConfig?.extra?.buildDate as string | undefined;
          const date = rawDate
            ? new Date(rawDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
            : null;
          return [APP_ID, `v${version}`, `build ${build}`, date].filter(Boolean).join(' · ');
        })()}
      </Text>

      {dbHealth !== null && (
        <View style={{ gap: spacing.s1 }}>
          <Text variant="caption" color="textTertiary">
            Content DB
          </Text>
          <Text variant="caption" color="textTertiary">
            {`Foundation tier · ${dbHealth.wordCount} words`}
          </Text>
          <Text variant="caption" color="textTertiary">
            {`Schema v${dbHealth.dbVersion}`}
          </Text>
        </View>
      )}

      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => !deleting && setShowDeleteModal(false)}
        accessibilityViewIsModal
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.6)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: spacing.s4,
          }}
        >
          <View
            style={{
              backgroundColor: colors.bgSurface,
              borderRadius: radii.lg,
              padding: spacing.s4,
              width: '100%',
              maxWidth: 360,
              gap: spacing.s3,
            }}
          >
            <Text variant="headline" color="destructive" accessibilityRole="header">
              Delete Account
            </Text>
            <Text variant="body" color="textPrimary">
              This will permanently delete your account and all learning progress. This cannot be undone.
            </Text>

            {deleteCountdown > 0 ? (
              <View
                style={{
                  alignItems: 'center',
                  paddingVertical: spacing.s2,
                  borderRadius: radii.md,
                  backgroundColor: colors.bgSurfaceRaised,
                }}
              >
                <Text variant="caption" color="textTertiary">
                  Please wait
                </Text>
                <Text variant="title" color="textSecondary">
                  {String(deleteCountdown)}
                </Text>
              </View>
            ) : null}

            {deleteError !== null ? (
              <Text variant="caption" color="destructive">
                {deleteError}
              </Text>
            ) : null}

            <View style={{ flexDirection: 'row', gap: spacing.s2, marginTop: spacing.s1 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel account deletion"
                onPress={() => setShowDeleteModal(false)}
                disabled={deleting}
                style={{
                  flex: 1,
                  minHeight: 48,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: radii.md,
                  backgroundColor: colors.bgSurfaceRaised,
                  borderWidth: 1,
                  borderColor: colors.borderSubtle,
                  opacity: deleting ? 0.5 : 1,
                }}
              >
                <Text variant="label" color="textPrimary">Cancel</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Confirm account deletion"
                accessibilityState={{ disabled: deleteCountdown > 0 || deleting }}
                onPress={handleDeleteAccount}
                disabled={deleteCountdown > 0 || deleting}
                style={{
                  flex: 1,
                  minHeight: 48,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: radii.md,
                  backgroundColor: colors.bgSurfaceRaised,
                  borderWidth: 1,
                  borderColor: deleteCountdown > 0 || deleting ? colors.borderSubtle : colors.destructive,
                  opacity: deleteCountdown > 0 ? 0.4 : 1,
                }}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color={colors.destructive} />
                ) : (
                  <Text
                    variant="label"
                    color={deleteCountdown > 0 ? 'textTertiary' : 'destructive'}
                  >
                    Delete Account
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showRestoreModal}
        transparent
        animationType="fade"
        onRequestClose={() => !restoring && setShowRestoreModal(false)}
        accessibilityViewIsModal
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.6)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: spacing.s4,
          }}
        >
          <View
            style={{
              backgroundColor: colors.bgSurface,
              borderRadius: radii.lg,
              padding: spacing.s4,
              width: '100%',
              maxWidth: 360,
              gap: spacing.s3,
            }}
          >
            <Text variant="headline" color="textPrimary" accessibilityRole="header">
              Restore from backup
            </Text>

            {restoreResult === null ? (
              <Text variant="body" color="textPrimary">
                This replaces your local progress with your cloud backup the next time you open the app. Continue?
              </Text>
            ) : restoreResult === 'ok' ? (
              <Text variant="body" color="success">
                Backup downloaded. Quit and reopen LexiTap to finish restoring your progress.
              </Text>
            ) : restoreResult === 'no_backup' ? (
              <Text variant="body" color="textSecondary">
                No backup found for your account.
              </Text>
            ) : (
              <Text variant="body" color="destructive">
                Restore failed. Check your connection and try again.
              </Text>
            )}

            <View style={{ flexDirection: 'row', gap: spacing.s2, marginTop: spacing.s1 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel restore"
                onPress={() => setShowRestoreModal(false)}
                disabled={restoring}
                style={{
                  flex: 1,
                  minHeight: 48,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: radii.md,
                  backgroundColor: colors.bgSurfaceRaised,
                  borderWidth: 1,
                  borderColor: colors.borderSubtle,
                  opacity: restoring ? 0.5 : 1,
                }}
              >
                <Text variant="label" color="textPrimary">
                  {restoreResult !== null ? 'Close' : 'Cancel'}
                </Text>
              </Pressable>

              {restoreResult === null && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Confirm restore from backup"
                  accessibilityState={{ disabled: restoring }}
                  onPress={handleRestore}
                  disabled={restoring}
                  style={{
                    flex: 1,
                    minHeight: 48,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: radii.md,
                    backgroundColor: colors.bgSurfaceRaised,
                    borderWidth: 1,
                    borderColor: colors.accent,
                    opacity: restoring ? 0.5 : 1,
                  }}
                >
                  {restoring ? (
                    <ActivityIndicator size="small" color={colors.accent} />
                  ) : (
                    <Text variant="label" color="accent">
                      Restore
                    </Text>
                  )}
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
