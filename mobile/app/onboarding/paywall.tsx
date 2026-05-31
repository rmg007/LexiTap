import React, { useCallback } from 'react';
import { router } from 'expo-router';
import { PaywallScreen } from '@/presentation/screens/PaywallScreen';
import { useServices } from '@/presentation/services';

// Onboarding step 6: Premium Paywall — final gate (O-6).
// Marks onboarding complete (regardless of plan choice) then replaces to '/'.
// R1: RevenueCat integration pending; Subscribe buttons are placeholders.

export default function PaywallRoute(): React.JSX.Element {
  const { onboarding } = useServices();

  const handleDismiss = useCallback(() => {
    // User dismissed paywall → continue for free, mark onboarding complete.
    void onboarding.markComplete().catch(() => undefined);
    router.replace('/');
  }, [onboarding]);

  const handleSubscribe = useCallback(
    (_packId: string) => {
      // R1: initiate RevenueCat purchase, handle result.
      // For now, placeholder only.
      // On success: void onboarding.markComplete().catch(() => undefined);
      // On success: router.replace('/');
    },
    [onboarding],
  );

  return <PaywallScreen onDismiss={handleDismiss} onSubscribe={handleSubscribe} />;
}
