import React from 'react';
import { Stack } from 'expo-router';

// Onboarding stack: linear, no tabs. All 6 steps push forward;
// the final step (paywall) marks onboarding complete and replaces to '/'.
// Back is suppressed at the stack level — onboarding is not skippable.

export default function OnboardingLayout(): React.JSX.Element {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: false,
      }}
    />
  );
}
