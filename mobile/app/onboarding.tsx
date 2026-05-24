import React, { useCallback } from 'react';
import { router } from 'expo-router';
import { OnboardingDiagnosticScreen } from '@/presentation/screens/onboarding';
import { useServices } from '@/presentation/services';
import { listActiveTiers } from '@/config/tiers';

// First-run onboarding route. Runs the diagnostic against the default (free)
// tier, then marks first-run complete and replaces to Home so Back can't return
// here. Default export is required by expo-router.

const DEFAULT_TIER = listActiveTiers()[0]?.id ?? 'foundation';

export default function OnboardingRoute(): React.JSX.Element {
  const { onboarding } = useServices();

  const handleComplete = useCallback(() => {
    void onboarding.markComplete().catch(() => undefined);
    router.replace('/');
  }, [onboarding]);

  return <OnboardingDiagnosticScreen tierId={DEFAULT_TIER} onComplete={handleComplete} />;
}
