import React, { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { HomeScreen } from '@/presentation/screens';
import { listActiveTiers } from '@/config/tiers';
import type { ActiveSession } from '@/domain/index';

// Core loop tab 1: Study Session (Primary Engine).
// Renders HomeScreen as the study dashboard; quiz is pushed onto the root stack
// (app/quiz.tsx) so the tab bar is hidden during active learning.
//
// Resume (SESSION_RESUME_PLAN): each time this tab regains focus we remount
// HomeScreen (bump `focusKey`) so it re-reads the active-session snapshot,
// streak, and daily progress — this is how the "Resume" card appears/updates
// after the learner leaves or completes a learn session.

const DEFAULT_TIER = listActiveTiers()[0]?.id ?? 'foundation';

export default function StudySessionRoute(): React.JSX.Element {
  const [focusKey, setFocusKey] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setFocusKey((k) => k + 1);
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
      key={focusKey}
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
