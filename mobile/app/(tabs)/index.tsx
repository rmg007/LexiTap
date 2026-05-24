import React from 'react';
import { router } from 'expo-router';
import { HomeScreen } from '@/presentation/screens';
import { listActiveTiers } from '@/config/tiers';

// Home route. Navigates into the quiz flow with a tier + mode. The default tier
// is the first active (free) tier from config (no app/variant branching).

const DEFAULT_TIER = listActiveTiers()[0]?.id ?? 'foundation';

export default function HomeRoute(): React.JSX.Element {
  return (
    <HomeScreen
      onStartReview={() =>
        router.push({ pathname: '/quiz', params: { tierId: DEFAULT_TIER, mode: 'review' } })
      }
      onLearnNewWords={() =>
        router.push({ pathname: '/quiz', params: { tierId: DEFAULT_TIER, mode: 'learn' } })
      }
    />
  );
}
