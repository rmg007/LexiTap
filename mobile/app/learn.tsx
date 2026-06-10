import React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { LearnCardScreen } from '@/presentation/screens';
import { listActiveTiers } from '@/config/tiers';

// Learn route — full-screen stack pushed from Study Session so the tab bar is
// hidden during the learn flow. Reads optional tierId from params.
//
// Flow: Home → "Learn new words" → /learn → LearnCardScreen → onComplete(batch)
// → /learn-check (LearnQuickCheck — the SRS seeding step) → Home.
// Replaces the old /quiz?mode=learn route (which ran assessment on unseen words).

const DEFAULT_TIER = listActiveTiers()[0]?.id ?? 'foundation';

export default function LearnRoute(): React.JSX.Element {
  const params = useLocalSearchParams<{ tierId?: string }>();
  const tierId = typeof params.tierId === 'string' && params.tierId.length > 0
    ? params.tierId
    : DEFAULT_TIER;

  return (
    <LearnCardScreen
      tierId={tierId}
      onExit={() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/');
        }
      }}
      // replace (not push): Back from the quick-check must not re-enter
      // already-seen cards.
      onComplete={(batch) =>
        router.replace({
          pathname: '/learn-check',
          params: { batch: JSON.stringify(batch), tierId },
        })
      }
    />
  );
}
