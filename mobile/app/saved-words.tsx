import React from 'react';
import { router } from 'expo-router';
import { SavedWordsScreen } from '@/presentation/screens';

// Saved-words route — the learner's bookmarked words (WORD_FEEDBACK_PLAN §2).
// Pushed from the Progress tab's "Saved words" section. File-based route, so no
// Stack.Screen registration is needed (mirrors app/learn.tsx).

export default function SavedWordsRoute(): React.JSX.Element {
  return (
    <SavedWordsScreen
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
