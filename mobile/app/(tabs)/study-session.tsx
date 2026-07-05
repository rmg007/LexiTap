import React, { useCallback, useRef, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { HomeScreen } from '@/presentation/screens';
import { listActiveTiers } from '@/config/tiers';
import type { ActiveSession } from '@/domain/index';

// Core loop tab 1: Study Session (Primary Engine).
// Renders HomeScreen as the study dashboard; quiz is pushed onto the root stack
// (app/quiz.tsx) so the tab bar is hidden during active learning.
//
// Resume (SESSION_RESUME_PLAN): each time this tab regains focus we bump a
// refresh signal so HomeScreen re-reads the active-session snapshot, streak, and
// daily progress IN PLACE — this is how the "Resume" card appears/updates after
// the learner leaves or completes a learn session. We skip the very first focus
// (the initial mount) because HomeScreen already loads on mount; refreshing then
// would double-load and flash the zero-state.

const DEFAULT_TIER = listActiveTiers()[0]?.id ?? 'foundation';

export default function StudySessionRoute(): React.JSX.Element {
  const [refreshTick, setRefreshTick] = useState(0);
  const didMount = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (!didMount.current) {
        didMount.current = true;
        return;
      }
      setRefreshTick((t) => t + 1);
    }, []),
  );

  const handleResume = useCallback((session: ActiveSession) => {
    // Route by the stage the learner left off at — the target route reads the
    // snapshot to rehydrate the exact batch + index.
    const pathname = session.stage === 'check' ? '/learn-check' : '/learn';
    router.push({ pathname, params: { resume: '1' } });
  }, []);

  return (
    <HomeScreen
      refreshSignal={refreshTick}
      onStartReview={() =>
        router.push({ pathname: '/quiz', params: { tierId: DEFAULT_TIER, mode: 'review' } })
      }
      onLearnNewWords={() =>
        router.push({ pathname: '/learn', params: { tierId: DEFAULT_TIER } })
      }
      onResume={handleResume}
    />
  );
}
