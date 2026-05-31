import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/presentation/screens/Screen';
import { Text, Button } from '@/presentation/components';

// Onboarding step O-1: Welcome.
// User has passed age gate. Phase 4 will implement the full design-spec layout from .design-specs/html/screens/welcome*.html

export default function WelcomeRoute(): React.JSX.Element {
  return (
    <Screen>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24 }}>
        <Text variant="h1" color="textPrimary" accessibilityRole="header">
          LexiTap
        </Text>
        <Text variant="body" color="textSecondary">
          Build real English vocabulary — one word at a time.
        </Text>
        <Button
          label="Get started"
          variant="primary"
          fullWidth
          onPress={() => router.push('/onboarding/goal-selection')}
        />
      </View>
    </Screen>
  );
}
