import React, { useEffect } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';

// Onboarding entry: redirect to age gate (O-0), which is now the first screen.

export default function OnboardingIndexRoute(): React.JSX.Element {
  useEffect(() => {
    router.replace('/onboarding/age');
  }, []);

  // Return empty view while redirecting.
  return <View />;
}
