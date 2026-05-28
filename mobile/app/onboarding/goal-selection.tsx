import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/presentation/screens/Screen';
import { Text, Button } from '@/presentation/components';

// Onboarding step 2: Goal Selection.
// Phase 4 will implement SelectionCard grid from .design-specs/html/screens/goal_selection*.html

export default function GoalSelectionRoute(): React.JSX.Element {
  return (
    <Screen>
      <View style={{ flex: 1, gap: 24 }}>
        <Text variant="headline" color="textPrimary" accessibilityRole="header">
          What's your goal?
        </Text>
        <Text variant="body" color="textSecondary">
          We'll personalise your word list around what matters most to you.
        </Text>
        <View style={{ flex: 1 }} />
        <Button
          label="Continue"
          variant="primary"
          fullWidth
          onPress={() => router.push('/onboarding/proficiency-assessment')}
        />
      </View>
    </Screen>
  );
}
