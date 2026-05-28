import React, { useCallback } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/presentation/screens/Screen';
import { Text, Button } from '@/presentation/components';
import { useServices } from '@/presentation/services';

// Onboarding step 6: Premium Paywall — final gate.
// Marks onboarding complete (regardless of plan choice) then replaces to '/'.
// Phase 4 will implement the full paywall design from .design-specs/html/screens/paywall*.html

export default function PaywallRoute(): React.JSX.Element {
  const { onboarding } = useServices();

  const handleComplete = useCallback(() => {
    void onboarding.markComplete().catch(() => undefined);
    router.replace('/');
  }, [onboarding]);

  return (
    <Screen>
      <View style={{ flex: 1, gap: 24 }}>
        <Text variant="headline" color="textPrimary" accessibilityRole="header">
          Unlock LexiTap Premium
        </Text>
        <Text variant="body" color="textSecondary">
          Unlimited words, offline access, and no ads.
        </Text>
        <View style={{ flex: 1 }} />
        <Button label="Go Premium" variant="primary" fullWidth onPress={handleComplete} />
        <Button label="Continue for free" variant="secondary" fullWidth onPress={handleComplete} />
      </View>
    </Screen>
  );
}
