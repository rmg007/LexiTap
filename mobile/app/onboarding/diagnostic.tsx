import React, { useCallback } from 'react';
import { router } from 'expo-router';
import { OnboardingDiagnosticScreen } from '@/presentation/screens/onboarding';
import { listActiveTiers } from '@/config/tiers';

// Onboarding step 4: Diagnostic (Word Check).
// Wraps the existing OnboardingDiagnosticScreen; on completion pushes forward
// to the Knowledge Map Reveal rather than jumping to home.

const DEFAULT_TIER = listActiveTiers()[0]?.id ?? 'foundation';

export default function DiagnosticRoute(): React.JSX.Element {
  const handleComplete = useCallback(() => {
    router.push('/onboarding/knowledge-map-reveal');
  }, []);

  return <OnboardingDiagnosticScreen tierId={DEFAULT_TIER} onComplete={handleComplete} />;
}
