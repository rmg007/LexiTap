import React, { useEffect, useState } from 'react';
import { Pressable, View, type ViewStyle, Switch, Linking } from 'react-native';
import { Screen } from '@/presentation/screens/Screen';
import { useTheme, useThemePreference, type ThemePreference } from '@/presentation/theme';
import { Text, Card } from '@/presentation/components';
import { APP_ID } from '@/config/app';
import { useServices, type ContentDbHealth } from '@/presentation/services';
import { getAnalyticsOptOut, setAnalyticsOptOut } from '@/infrastructure/analytics/AnalyticsOptOutStore';

// Settings: theme override (system / dark / light), analytics opt-out toggle, and
// app metadata. Destructive actions (reset progress, etc.) live behind a confirm sheet
// and are out of MVP scope here.

const THEME_OPTIONS: ReadonlyArray<{ value: ThemePreference; label: string }> = [
  { value: 'system', label: 'System' },
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
];

export function SettingsScreen(): React.JSX.Element {
  const { colors, radii, spacing } = useTheme();
  const { preference, setPreference } = useThemePreference();
  const { queries } = useServices();
  const [dbHealth, setDbHealth] = useState<ContentDbHealth | null>(null);
  const [hoverState, setHoverState] = useState<ThemePreference | null>(null);
  const [analyticsOptOut, setAnalyticsOptOutLocal] = useState(false);

  useEffect(() => {
    queries.getContentDbHealth().then(setDbHealth).catch(() => undefined);
    getAnalyticsOptOut().then(setAnalyticsOptOutLocal).catch(() => undefined);
  }, [queries]);

  const handleAnalyticsToggle = async (value: boolean) => {
    setAnalyticsOptOutLocal(value);
    await setAnalyticsOptOut(value);
  };

  return (
    <Screen>
      <Text variant="title" color="textPrimary" accessibilityRole="header">
        Settings
      </Text>

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
            accessibilityLabel="Delete account"
            onPress={() => {
              // TODO: Implement account deletion flow
              // Should show confirmation sheet with 30-second grace period
            }}
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
        {`${APP_ID} · v0.1.0`}
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
    </Screen>
  );
}
