import React from 'react';
import { Tabs } from 'expo-router';
import { useTheme } from '@/presentation/theme';
import { Icon } from '@/presentation/components';

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
      <Tabs.Screen
        name="study-session"
        options={{
          title: 'Study',
          tabBarIcon: ({ color, size }) => (
            <Icon name="book-open" size={size} colorValue={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ color, size }) => (
            <Icon name="bar-chart-2" size={size} colorValue={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Icon name="settings" size={size} colorValue={color as string} />
          ),
        }}
      />
    </Tabs>
  );
}
