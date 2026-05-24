import React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { QuizScreen } from '@/presentation/screens';
import type { QuizMode } from '@/domain/index';
import { listActiveTiers } from '@/config/tiers';

// Quiz route. Reads tier + mode from params (defaults when entered via the tab).
// Exiting returns Home.

const DEFAULT_TIER = listActiveTiers()[0]?.id ?? 'foundation';

function asMode(value: string | string[] | undefined): QuizMode {
  return value === 'learn' ? 'learn' : 'review';
}

function asTier(value: string | string[] | undefined): string {
  if (typeof value === 'string' && value.length > 0) return value;
  return DEFAULT_TIER;
}

export default function QuizRoute(): React.JSX.Element {
  const params = useLocalSearchParams<{ tierId?: string; mode?: string }>();
  return (
    <QuizScreen
      tierId={asTier(params.tierId)}
      mode={asMode(params.mode)}
      onExit={() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/');
        }
      }}
    />
  );
}
