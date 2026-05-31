import React, { useCallback } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { OnboardingDiagnosticScreen } from '@/presentation/screens/onboarding';
import { listActiveTiers } from '@/config/tiers';
import type { LearningGoal, ProficiencyBand } from '@/domain/index';

// Onboarding step 4: Diagnostic (Word Check).
// Reads goal from search params set by goal-selection.
// Applies goal → starting band default, then passes as partialProfile
// so the diagnostic screen merges them into the onboarding profile save.

const DEFAULT_TIER = listActiveTiers()[0]?.id ?? 'foundation';

const VALID_GOALS = new Set<string>(['exam', 'general', 'professional', 'academic']);

function goalToStartingBand(goal: string | undefined): ProficiencyBand {
  // Map goal to sensible starting CEFR band for onboarding profile.
  // Not diagnostic difficulty — that's set by self-segmentation in DIAG-A (future).
  switch (goal) {
    case 'exam':
    case 'academic':
      return 'B2'; // Ambitious start for structured contexts.
    case 'professional':
      return 'B1'; // Workplace baseline.
    case 'general':
    default:
      return 'A2'; // Cautious default for general learning.
  }
}

export default function DiagnosticRoute(): React.JSX.Element {
  const { goal } = useLocalSearchParams<{ goal?: string }>();
  const validGoal = goal && VALID_GOALS.has(goal) ? (goal as LearningGoal) : undefined;

  const partialProfile = {
    goal: validGoal,
    band: goalToStartingBand(validGoal),
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
