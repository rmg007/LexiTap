import React from 'react';
import { Tabs } from 'expo-router';
import { useTheme } from '@/presentation/theme';

// Tab bar: 4 tabs per the locked MVP screen set (Home, Quiz, Progress,
// Settings). Active tab uses accent, inactive uses text.tertiary
// (DESIGN_SYSTEM.md). Icons would come from a line family (Lucide) at
// integration; labels are always present so meaning is never icon-only.

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
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="quiz" options={{ title: 'Quiz' }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
