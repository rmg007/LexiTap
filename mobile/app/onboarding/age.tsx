import React, { useCallback } from 'react';
import { router } from 'expo-router';
import { OnboardingAgeGateScreen } from '@/presentation/screens/onboarding';

// Age gate route (O-0): verify user is 16+.
// Routes to Welcome (O-1) on success.

export default function AgeGateRoute(): React.JSX.Element {
  const handleContinue = useCallback(() => {
    router.push('/onboarding/welcome');
  }, []);

  return <OnboardingAgeGateScreen onContinue={handleContinue} />;
}
