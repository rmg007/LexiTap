import { asTierId, asWordId, asSessionId } from '@/domain/index';
import type { Word } from '@/domain/vocabulary/Word';

// Shared test fixtures for learn-loop render tests.
// Single source of truth for BATCH, makeWord, makeSession.
// Import renderWithProviders from ./renderWithProviders.

export const TIER = 'foundation';

export function makeWord(id: string, word: string, definition: string): Word {
  return {
    id: asWordId(id),
    word,
    definition,
    tierId: asTierId(TIER),
    wordType: 'vocabulary',
    exampleSentence: 'She will _ tomorrow.',
    synonyms: [],
    antonyms: [],
    isDeleted: false,
  };
}

export const BATCH: Word[] = [
  makeWord('w1', 'borrow', 'to take something to use temporarily'),
  makeWord('w2', 'arrive', 'to reach a place'),
  makeWord('w3', 'tired', 'needing rest or sleep'),
];

export function makeSession(batch: Word[], mode: 'learn' | 'review' = 'learn') {
  return {
    id: asSessionId(1),
    tierId: asTierId(TIER),
    mode,
    words: batch,
    currentIndex: 0,
    correctCount: 0,
    startedAt: Date.now(),
  };
}
