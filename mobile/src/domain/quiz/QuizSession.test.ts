import { advanceSession, currentWord, isSessionComplete } from '@/domain/quiz/QuizSession';
import { QuizSessionCompleteError } from '@/domain/quiz/errors';
import type { QuizSession } from '@/domain/quiz/types';
import type { Word } from '@/domain/vocabulary/Word';
import { asSessionId, asTierId, asWordId } from '@/domain/vocabulary/ids';

function word(id: string): Word {
  return {
    id: asWordId(id),
    word: id,
    definition: 'd',
    tierId: asTierId('t1'),
    wordType: 'vocabulary',
    exampleSentence: '_ test',
    synonyms: [],
    antonyms: [],
    isDeleted: false,
  };
}

function session(words: Word[], idx = 0): QuizSession {
  return {
    id: asSessionId(1),
    tierId: asTierId('t1'),
    mode: 'review',
    words,
    currentIndex: idx,
    correctCount: 0,
    startedAt: 0,
  };
}

describe('QuizSession helpers', () => {
  it('currentWord returns the indexed word', () => {
    const s = session([word('a'), word('b')]);
    expect(currentWord(s)?.id).toBe('a');
  });

  it('isSessionComplete when index reaches the end', () => {
    expect(isSessionComplete(session([word('a')], 1))).toBe(true);
    expect(isSessionComplete(session([word('a')], 0))).toBe(false);
  });

  it('advanceSession increments index and correctCount', () => {
    const s = session([word('a'), word('b')]);
    const next = advanceSession(s, true);
    expect(next.currentIndex).toBe(1);
    expect(next.correctCount).toBe(1);
    expect(s.currentIndex).toBe(0); // immutable
  });

  it('advanceSession does not count an incorrect answer', () => {
    expect(advanceSession(session([word('a')]), false).correctCount).toBe(0);
  });

  it('advanceSession throws when already complete', () => {
    expect(() => advanceSession(session([word('a')], 1), true)).toThrow(
      QuizSessionCompleteError,
    );
  });
});
