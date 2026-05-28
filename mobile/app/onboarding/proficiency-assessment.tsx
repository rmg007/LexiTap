import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/presentation/screens/Screen';
import { Text, Button } from '@/presentation/components';

// Onboarding step 3: Proficiency Assessment.
// Phase 4 will implement radio-button level picker from .design-specs/html/screens/proficiency*.html

export default function ProficiencyAssessmentRoute(): React.JSX.Element {
  return (
    <Screen>
      <View style={{ flex: 1, gap: 24 }}>
        <Text variant="headline" color="textPrimary" accessibilityRole="header">
          How's your English?
        </Text>
        <Text variant="body" color="textSecondary">
          Pick the level that feels right — you can change it later.
        </Text>
        <View style={{ flex: 1 }} />
        <Button
          label="Continue"
          variant="primary"
          fullWidth
          onPress={() => router.push('/onboarding/diagnostic')}
        />
      </View>
    </Screen>
  );
}
