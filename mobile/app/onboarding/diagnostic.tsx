import React, { useCallback } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { OnboardingDiagnosticScreen } from '@/presentation/screens/onboarding';
import { listActiveTiers } from '@/config/tiers';
import type { LearningGoal, ProficiencyBand } from '@/domain/index';

// Onboarding step 4: Diagnostic (Word Check).
// Reads goal + band from search params set by earlier onboarding steps.
// Passes them as partialProfile so the diagnostic screen merges them into
// the onboarding profile save alongside completedAt.

const DEFAULT_TIER = listActiveTiers()[0]?.id ?? 'foundation';

const VALID_GOALS = new Set<string>(['exam', 'general', 'professional', 'academic']);
const VALID_BANDS = new Set<string>(['A2', 'B1', 'B2', 'C1', 'C2']);

export default function DiagnosticRoute(): React.JSX.Element {
  const { goal, band } = useLocalSearchParams<{ goal?: string; band?: string }>();

  const partialProfile = {
    goal: goal && VALID_GOALS.has(goal) ? (goal as LearningGoal) : undefined,
    band: band && VALID_BANDS.has(band) ? (band as ProficiencyBand) : undefined,
  };

  const handleComplete = useCallback(() => {
    router.push('/onboarding/knowledge-map-reveal');
  }, []);

  return (
    <OnboardingDiagnosticScreen
      tierId={DEFAULT_TIER}
      onComplete={handleComplete}
      partialProfile={partialProfile}
    />
  );
}
