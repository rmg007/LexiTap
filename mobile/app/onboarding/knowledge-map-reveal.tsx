import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/presentation/screens/Screen';
import { Text, Button, Card } from '@/presentation/components';

// Onboarding step 5: Knowledge Map Reveal.
// Shows the learner a summary after the diagnostic — their starting point
// is now calibrated. Full animated vocabulary map is DIAG-A (post-launch).

export default function KnowledgeMapRevealRoute(): React.JSX.Element {
  return (
    <Screen>
      <View style={{ flex: 1, gap: 24 }}>
        <View style={{ gap: 8 }}>
          <Text variant="headline" color="textPrimary" accessibilityRole="header">
            Your vocabulary map
          </Text>
          <Text variant="body" color="textSecondary">
            Based on your answers, we've set your starting point. Each session will push
            your frontier a little further.
          </Text>
        </View>

        <Card>
          <View style={{ gap: 16 }}>
            <Text variant="label" color="textPrimary">
              ✓  Starting point calibrated
            </Text>
            <Text variant="body" color="textSecondary">
              Your daily reviews will focus on words just beyond what you already know — the
              fastest way to build lasting vocabulary.
            </Text>
          </View>
        </Card>

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
