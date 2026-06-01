import React from 'react';
import { router } from 'expo-router';
import { HomeScreen } from '@/presentation/screens';
import { listActiveTiers } from '@/config/tiers';

// Core loop tab 1: Study Session (Primary Engine).
// Renders HomeScreen as the study dashboard; quiz is pushed onto the root stack
// (app/quiz.tsx) so the tab bar is hidden during active learning.
// Phase 4 will replace HomeScreen with the full Study Session design spec.

const DEFAULT_TIER = listActiveTiers()[0]?.id ?? 'foundation';

export default function StudySessionRoute(): React.JSX.Element {
  return (
    <HomeScreen
      onStartReview={() =>
        router.push({ pathname: '/quiz', params: { tierId: DEFAULT_TIER, mode: 'review' } })
      }
      onLearnNewWords={() =>
        router.push({ pathname: '/learn', params: { tierId: DEFAULT_TIER } })
      }
    />
  );
}
