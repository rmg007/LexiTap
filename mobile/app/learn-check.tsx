import React, { useCallback, useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { LearnQuickCheckScreen, SessionCompleteScreen } from '@/presentation/screens';
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
//
// Recap (DESIGN_LEVELUP_PLAN.md Phase 3.2): natural completion of the quick
// check renders SessionCompleteScreen (variant="learn") before returning
// Home — fixes "I can't find the words I know" (the learn flow previously
// hard-cut to Home with zero acknowledgement, unlike the review flow's own
// SessionCompleteScreen). Only fires on genuine completion — exiting
// mid-check (onExit) or resuming later never routes through the recap; it
// keys off the onComplete callback, not the resume param.

interface Loaded {
  ready: boolean;
  batch: Word[];
  tierId: string;
  resumeIndex?: number;
}

type CheckPhase = { kind: 'quickcheck' } | { kind: 'recap'; currentStreak: number };

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
  const [checkPhase, setCheckPhase] = useState<CheckPhase>({ kind: 'quickcheck' });

  const handleQuickCheckComplete = useCallback(() => {
    void services.queries
      .getUserStats()
      .then((stats) => {
        setCheckPhase({ kind: 'recap', currentStreak: stats?.streak.currentStreak ?? 0 });
      })
      .catch(() => {
        setCheckPhase({ kind: 'recap', currentStreak: 0 });
      });
  }, [services]);

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

  if (checkPhase.kind === 'recap') {
    return (
      <SessionCompleteScreen
        variant="learn"
        wordsReviewed={loaded.batch.length}
        streakIncremented={false}
        currentStreak={checkPhase.currentStreak}
        moreItemsAvailable={false}
        onDone={() => router.replace('/')}
        onKeepPracticing={() => undefined}
      />
    );
  }

  return (
    <LearnQuickCheckScreen
      batch={loaded.batch}
      tierId={loaded.tierId}
      resumeIndex={loaded.resumeIndex}
      onComplete={handleQuickCheckComplete}
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
