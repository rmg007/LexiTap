import React from 'react';
import { Tabs } from 'expo-router';
import { useTheme } from '@/presentation/theme';

// Core loop tab bar: 2 tabs — Study Session (primary engine) and Settings
// (global controls). Active tab uses accent, inactive uses textTertiary.
// Icons come from a line family (Lucide) at integration; labels are always
// present so meaning is never icon-only.

export default function TabsLayout(): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.bgSurface,
          borderTopColor: colors.borderSubtle,
        },
      }}
    >
      <Tabs.Screen name="study-session" options={{ title: 'Study' }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
