import React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { LearnQuickCheckScreen } from '@/presentation/screens';
import type { Word } from '@/domain/index';

// learn-check route — full-screen stack pushed from the LearnCard screen after
// the learner has read through all words in the batch. Receives the batch as a
// JSON-serialised Word[] via params (expo-router only supports string params).
//
// SRS seed writes happen inside LearnQuickCheckScreen, not here.

export default function LearnCheckRoute(): React.JSX.Element {
  const params = useLocalSearchParams();

  const tierId = typeof params.tierId === 'string' ? params.tierId : 'foundation';
  let batch: Word[] = [];
  try {
    if (typeof params.batch === 'string') {
      batch = JSON.parse(params.batch) as Word[];
    }
  } catch {
    batch = [];
  }

  // Guard: nothing to check — route home without showing a broken screen.
  if (!batch.length) {
    router.replace('/');
    return <></>;
  }

  return (
    <LearnQuickCheckScreen
      batch={batch}
      tierId={tierId}
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
