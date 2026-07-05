import React, { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { LearnCardScreen } from '@/presentation/screens';
import { useServices } from '@/presentation/services';
import { listActiveTiers } from '@/config/tiers';
import type { Word } from '@/domain/index';

// Learn route — full-screen stack pushed from Study Session so the tab bar is
// hidden during the learn flow. Reads optional tierId from params.
//
// Flow: Home → "Learn new words" → /learn → LearnCardScreen → onComplete(batch)
// → /learn-check (LearnQuickCheck — the SRS seeding step) → Home.
//
// Resume (SESSION_RESUME_PLAN): /learn?resume=1 rehydrates the saved card-stage
// snapshot (batch + index) instead of fetching a fresh batch. Home only routes
// here with resume=1 when the snapshot is at stage 'card'.

const DEFAULT_TIER = listActiveTiers()[0]?.id ?? 'foundation';

interface ResumeState {
  loaded: boolean;
  batch?: Word[];
  index?: number;
  tierId?: string;
}

export default function LearnRoute(): React.JSX.Element | null {
  const params = useLocalSearchParams<{ tierId?: string; resume?: string }>();
  const services = useServices();
  const isResume = params.resume === '1';

  // When resuming, gate rendering on the snapshot read (a fast local DB read).
  const [resume, setResume] = useState<ResumeState>({ loaded: !isResume });

  useEffect(() => {
    if (!isResume) return;
    let cancelled = false;
    void services.queries
      .getActiveSession()
      .then((s) => {
        if (cancelled) return;
        if (s !== null && s.kind === 'learn' && s.stage === 'card') {
          setResume({ loaded: true, batch: s.batch, index: s.index, tierId: s.tierId });
        } else {
          setResume({ loaded: true }); // no valid card snapshot → fresh session
        }
      })
      .catch(() => {
        if (!cancelled) setResume({ loaded: true });
      });
    return () => {
      cancelled = true;
    };
  }, [isResume, services]);

  const paramTier =
    typeof params.tierId === 'string' && params.tierId.length > 0 ? params.tierId : DEFAULT_TIER;
  const tierId = resume.tierId ?? paramTier;

  if (!resume.loaded) return null; // brief; snapshot read resolves near-instantly

  return (
    <LearnCardScreen
      tierId={tierId}
      resumeBatch={resume.batch}
      resumeIndex={resume.index}
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
