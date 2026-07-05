import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  Share,
  StyleSheet,
  View,
  type ViewStyle,
  Switch,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { Screen } from '@/presentation/screens/Screen';
import { useTheme, useThemePreference, type ThemePreference } from '@/presentation/theme';
import { Text, Card, Icon } from '@/presentation/components';
import type { ColorTokens } from '@/presentation/theme/tokens';
import { APP_ID } from '@/config/app';
import { useServices, type ContentDbHealth } from '@/presentation/services';
import { useAuth } from '@/presentation/auth';
import { getAnalyticsOptOut, setAnalyticsOptOut } from '@/infrastructure/analytics/AnalyticsOptOutStore';

const THEME_OPTIONS: ReadonlyArray<{ value: ThemePreference; label: string }> = [
  { value: 'system', label: 'System' },
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
];

const DELETE_COUNTDOWN_SECS = 30;

// ─── Internal layout primitives ───────────────────────────────────────────────

function SectionHeader({ children }: { readonly children: string }): React.JSX.Element {
  const { spacing } = useTheme();
  return (
    <View style={{ paddingHorizontal: spacing.s5, paddingTop: spacing.s4, paddingBottom: spacing.s2 }}>
      <Text variant="headline" color="textPrimary">
        {children}
      </Text>
    </View>
  );
}

function RowDivider(): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View
      style={{
        height: StyleSheet.hairlineWidth,
        backgroundColor: colors.borderSubtle,
        marginLeft: 20,
      }}
    />
  );
}

interface SettingsRowProps {
  label: string;
  subtitle?: string;
  onPress?: () => void;
  disabled?: boolean;
  labelColor?: keyof ColorTokens;
  accessibilityRole?: 'button' | 'link';
  right?: React.ReactNode;
  showChevron?: boolean;
}

function SettingsRow({
  label,
  subtitle,
  onPress,
  disabled = false,
  labelColor = 'textPrimary',
  accessibilityRole = 'button',
  right,
  showChevron = true,
}: SettingsRowProps): React.JSX.Element {
  const { spacing } = useTheme();

  const rowContent = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.s3,
        paddingHorizontal: spacing.s5,
        minHeight: 50,
      }}
    >
      <View style={{ flex: 1, marginRight: spacing.s2 }}>
        <Text variant="body" color={labelColor}>
          {label}
        </Text>
        {subtitle !== undefined && (
          <Text variant="caption" color="textTertiary" style={{ marginTop: 2 }}>
            {subtitle}
          </Text>
        )}
      </View>
      {right !== undefined
        ? right
        : showChevron && onPress !== undefined
          ? <Icon name="chevron-right" size={18} color="textTertiary" />
          : null}
    </View>
  );

  if (onPress === undefined) return rowContent;

  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }: { pressed: boolean }): ViewStyle => ({
        opacity: pressed || disabled ? 0.55 : 1,
      })}
    >
      {rowContent}
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export function SettingsScreen(): React.JSX.Element {
  const { colors, radii, spacing } = useTheme();
  const { preference, setPreference } = useThemePreference();
  const services = useServices();
  const { queries } = services;
  const { session, signOut } = useAuth();
  const [dbHealth, setDbHealth] = useState<ContentDbHealth | null>(null);
  const [hoverState, setHoverState] = useState<ThemePreference | null>(null);
  const [analyticsOptOut, setAnalyticsOptOutLocal] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteCountdown, setDeleteCountdown] = useState(DELETE_COUNTDOWN_SECS);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState<'ok' | 'no_backup' | 'error' | null>(null);

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

  const announceRestoreOutcome = (message: string) => {
    AccessibilityInfo.announceForAccessibility(message);
  };

  const handleRestorePurchases = async () => {
    setPurchasesRestore('busy');
    void services.analytics.track('restore_purchases_initiated');
    const results = await services.iap.restorePurchases();
    if (results === null) {
      setPurchasesRestore('error');
      void services.analytics.track('restore_purchases_failed');
      announceRestoreOutcome('Could not restore purchases.');
      return;
    }
    setPurchasesRestore(results.length);
    void services.analytics.track('restore_purchases_completed', { count: results.length });
    announceRestoreOutcome(
      results.length > 0
        ? `Restored ${results.length} purchase${results.length === 1 ? '' : 's'}.`
        : 'No previous purchases found.',
    );
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      const result = await services.auth.deleteAccount();
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

  const versionLine = (() => {
    const version = Constants.expoConfig?.version ?? '—';
    const build = Constants.nativeBuildVersion ?? '—';
    const rawDate = Constants.expoConfig?.extra?.buildDate as string | undefined;
    const date = rawDate
      ? new Date(rawDate).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : null;
    return [APP_ID, `v${version}`, `build ${build}`, date].filter(Boolean).join(' · ');
  })();

  return (
    <Screen>
      <Text variant="title" color="textPrimary" accessibilityRole="header">
        Settings
      </Text>

      {/* ── Account ── */}
      <Card style={{ padding: 0 }}>
        <SectionHeader>Account</SectionHeader>
        <RowDivider />
        {session !== null ? (
          <>
            <SettingsRow
              label={session.user.email ?? 'Signed in'}
              subtitle="Your account"
              showChevron={false}
            />
            <RowDivider />
            <SettingsRow
              label="Restore from backup"
              onPress={() => { setRestoreResult(null); setShowRestoreModal(true); }}
            />
            <RowDivider />
            <SettingsRow
              label="Sign out"
              onPress={() => signOut()}
            />
          </>
        ) : (
          <SettingsRow
            label="Sign in"
            subtitle="Sync and back up your learning progress"
            onPress={() => router.push('/auth/sign-in')}
          />
        )}
        <RowDivider />
        <SettingsRow
          label="Restore purchases"
          onPress={purchasesRestore !== 'busy' ? handleRestorePurchases : undefined}
          disabled={purchasesRestore === 'busy'}
          right={
            purchasesRestore === 'busy'
              ? <ActivityIndicator size="small" color={colors.accent} />
              : undefined
          }
          showChevron={purchasesRestore !== 'busy'}
        />
        {typeof purchasesRestore === 'number' || purchasesRestore === 'error' ? (
          <View style={{ paddingHorizontal: spacing.s5, paddingBottom: spacing.s3 }}>
            <Text
              variant="caption"
              color={
                purchasesRestore === 'error'
                  ? 'destructive'
                  : (purchasesRestore as number) > 0
                    ? 'success'
                    : 'textSecondary'
              }
              accessibilityLiveRegion="polite"
            >
              {purchasesRestore === 'error'
                ? 'Could not restore purchases. Please try again.'
                : (purchasesRestore as number) > 0
                  ? `Restored ${purchasesRestore as number} purchase${(purchasesRestore as number) === 1 ? '' : 's'}.`
                  : 'No previous purchases found.'}
            </Text>
          </View>
        ) : null}
      </Card>

      {/* ── Appearance ── */}
      <Card style={{ padding: 0 }}>
        <SectionHeader>Appearance</SectionHeader>
        <RowDivider />
        <View style={{ padding: spacing.s5 }}>
          <View style={{ flexDirection: 'row', gap: spacing.s2 }}>
            {THEME_OPTIONS.map((option) => {
              const selected = preference === option.value;
              const isHovered = hoverState === option.value;
              const chip: ViewStyle = {
                flex: 1,
                minHeight: 44,
                borderRadius: radii.full,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: spacing.s3,
                backgroundColor: selected
                  ? isHovered
                    ? colors.accentPressed
                    : colors.accentSubtle
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

      {/* ── Privacy ── */}
      <Card style={{ padding: 0 }}>
        <SectionHeader>Privacy</SectionHeader>
        <RowDivider />
        <SettingsRow
          label="Disable Analytics"
          subtitle="Usage only, no personal data"
          showChevron={false}
          right={
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
          }
        />
      </Card>

      {/* ── Legal ── */}
      <Card style={{ padding: 0 }}>
        <SectionHeader>Legal</SectionHeader>
        <RowDivider />
        <SettingsRow
          label="Privacy Policy"
          accessibilityRole="link"
          onPress={() => Linking.openURL('https://lexitap.app/privacy')}
        />
        <RowDivider />
        <SettingsRow
          label="Terms of Service"
          accessibilityRole="link"
          onPress={() => Linking.openURL('https://lexitap.app/terms')}
        />
        <RowDivider />
        <SettingsRow
          label="Export my data"
          onPress={handleExportData}
        />
        <RowDivider />
        <SettingsRow
          label="Delete Account"
          labelColor="destructive"
          showChevron={false}
          onPress={() => setShowDeleteModal(true)}
        />
      </Card>

      {/* ── Footer ── */}
      <View style={{ gap: spacing.s1, paddingBottom: spacing.s2 }}>
        <Text variant="caption" color="textTertiary">
          {versionLine}
        </Text>
        {dbHealth !== null && (
          <Text variant="caption" color="textTertiary">
            {`Content DB · ${dbHealth.wordCount} words · Schema v${dbHealth.dbVersion}`}
          </Text>
        )}
      </View>

      {/* ── Delete Account Modal ── */}
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
              This will permanently delete your account and all learning progress. This cannot be
              undone.
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
                <Text variant="label" color="textPrimary">
                  Cancel
                </Text>
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
                  borderColor:
                    deleteCountdown > 0 || deleting ? colors.borderSubtle : colors.destructive,
                  opacity: deleteCountdown > 0 ? 0.4 : 1,
                }}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color={colors.destructive} />
                ) : (
                  <Text variant="label" color={deleteCountdown > 0 ? 'textTertiary' : 'destructive'}>
                    Delete Account
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Restore from Backup Modal ── */}
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
                This replaces your local progress with your cloud backup the next time you open the
                app. Continue?
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
