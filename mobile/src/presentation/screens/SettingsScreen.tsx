import React, { useEffect, useState } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import { Screen } from '@/presentation/screens/Screen';
import { useTheme, useThemePreference, type ThemePreference } from '@/presentation/theme';
import { Text, Card } from '@/presentation/components';
import { APP_ID } from '@/config/app';
import { useServices, type ContentDbHealth } from '@/presentation/services';

// Settings: theme override (system / dark / light) plus app metadata. The
// destructive actions (reset progress, etc.) live behind a confirm sheet and
// are out of MVP scope here; this screen only owns the theme preference.

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

  useEffect(() => {
    queries.getContentDbHealth().then(setDbHealth).catch(() => undefined);
  }, [queries]);

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
