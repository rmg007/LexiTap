import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/presentation/screens/Screen';
import { Text, Button } from '@/presentation/components';

// Onboarding step 5: Knowledge Map Reveal.
// Phase 4 will implement the animated vocabulary-map reveal from
// .design-specs/html/screens/knowledge_map*.html

export default function KnowledgeMapRevealRoute(): React.JSX.Element {
  return (
    <Screen>
      <View style={{ flex: 1, gap: 24 }}>
        <Text variant="headline" color="textPrimary" accessibilityRole="header">
          Your vocabulary map
        </Text>
        <Text variant="body" color="textSecondary">
          Here's what we've found. Let's fill in the gaps together.
        </Text>
        <View style={{ flex: 1 }} />
        <Button
          label="See my plan"
          variant="primary"
          fullWidth
          onPress={() => router.push('/onboarding/paywall')}
        />
      </View>
    </Screen>
  );
}
