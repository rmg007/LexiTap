import React, { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { LearnQuickCheckScreen } from '@/presentation/screens';
import { useServices } from '@/presentation/services';
import type { Word } from '@/domain/index';

// learn-check route — full-screen stack pushed from the LearnCard screen after
// the learner has read through all words in the batch. Receives the batch as a
// JSON-serialised Word[] via params (expo-router only supports string params).
//
// SRS seed writes happen inside LearnQuickCheckScreen, not here.
//
// Resume (SESSION_RESUME_PLAN): /learn-check?resume=1 rehydrates the saved
// check-stage snapshot (batch + index) instead of reading the router-param batch.

interface Loaded {
  ready: boolean;
  batch: Word[];
  tierId: string;
  resumeIndex?: number;
}

export default function LearnCheckRoute(): React.JSX.Element | null {
  const params = useLocalSearchParams<{ tierId?: string; batch?: string; resume?: string }>();
  const services = useServices();
  const isResume = params.resume === '1';

  const paramTier = typeof params.tierId === 'string' ? params.tierId : 'foundation';
  let paramBatch: Word[] = [];
  try {
    if (typeof params.batch === 'string') {
      paramBatch = JSON.parse(params.batch) as Word[];
    }
  } catch {
    paramBatch = [];
  }

  const [loaded, setLoaded] = useState<Loaded>({
    ready: !isResume,
    batch: paramBatch,
    tierId: paramTier,
  });

  useEffect(() => {
    if (!isResume) return;
    let cancelled = false;
    void services.queries
      .getActiveSession()
      .then((s) => {
        if (cancelled) return;
        if (s !== null && s.kind === 'learn' && s.stage === 'check' && s.batch.length > 0) {
          setLoaded({ ready: true, batch: s.batch, tierId: s.tierId, resumeIndex: s.index });
        } else {
          setLoaded({ ready: true, batch: [], tierId: paramTier }); // no valid snapshot
        }
      })
      .catch(() => {
        if (!cancelled) setLoaded({ ready: true, batch: [], tierId: paramTier });
      });
    return () => {
      cancelled = true;
    };
    // paramTier is derived from params synchronously; the effect keys on resume.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isResume, services]);

  if (!loaded.ready) return null;

  // Guard: nothing to check — route home without showing a broken screen. Also
  // clears any stale snapshot so Home stops offering a dead resume.
  if (!loaded.batch.length) {
    void services.queries.clearActiveSession();
    router.replace('/');
    return <></>;
  }

  return (
    <LearnQuickCheckScreen
      batch={loaded.batch}
      tierId={loaded.tierId}
      resumeIndex={loaded.resumeIndex}
      onComplete={() => router.replace('/')}
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
