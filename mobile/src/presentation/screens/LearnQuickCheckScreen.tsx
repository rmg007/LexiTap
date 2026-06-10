import React, { useCallback, useRef, useState } from 'react';
import { View } from 'react-native';
import { Screen } from '@/presentation/screens/Screen';
import { useTheme } from '@/presentation/theme';
import { Text, Button, ProgressBar, Icon } from '@/presentation/components';
import { MultipleChoice } from '@/presentation/components/assessments';
import type { AssessmentAnswer } from '@/presentation/components/assessments/types';
import { useServices } from '@/presentation/services';
import { hapticsCorrect } from '@/presentation/services/haptics';
import { buildQuestion } from '@/presentation/screens/quizQuestion';
import { asTierId, asSessionId, type Word } from '@/domain/index';

// LearnQuickCheckScreen — runs one MultipleChoice check per word in the
// just-learned batch, seeding the SRS (AnswerQuestionUseCase) on each answer.
//
// THIS is the only place SRS rows are written in the learn flow. The learn
// card itself does not write SRS data.
//
// Feedback is gentle: no red, no score. A miss means the word is reviewed
// sooner, never "you failed to learn it."
//
// NO TextInput anywhere (hard invariant).

export interface LearnQuickCheckScreenProps {
  batch: Word[];
  tierId: string;
  onComplete: () => void;
  onExit: () => void;
}

// Inline feedback phase — does not depend on the (not-yet-merged) FeedbackLayer
// from Screen 1. When that lands, the two can be unified.
type CheckPhase =
  | { kind: 'active'; checkIndex: number }
  | {
      kind: 'feedback';
      checkIndex: number;
      wasCorrect: boolean;
      chosenValue: string;
      correctValue: string;
      gloss: string;
    }
  | { kind: 'done' };

const AFFIRM = ['Nice!', 'Got it.', 'Exactly.', "That's right.", 'Correct.'] as const;
const CORRECTION = [
  'Almost.',
  'Not quite—here it is.',
  'Review this one.',
  'Take another look.',
] as const;

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

// Build a minimal QuizSession stub for AnswerQuestionUseCase.
// The use case guards that session.words[session.currentIndex].id === wordId,
// so we set currentIndex = 0 and words = [targetWord].
function makeSessionStub(word: Word, tierId: string) {
  return {
    id: asSessionId(0),
    tierId: asTierId(tierId),
    mode: 'learn' as const,
    words: [word],
    currentIndex: 0,
    correctCount: 0,
    startedAt: Date.now(),
  };
}

export function LearnQuickCheckScreen({
  batch,
  tierId,
  onComplete,
  onExit,
}: LearnQuickCheckScreenProps): React.JSX.Element {
  const { spacing, colors } = useTheme();
  const services = useServices();

  // Track phase (active question / feedback overlay / done).
  const [phase, setPhase] = useState<CheckPhase>({ kind: 'active', checkIndex: 0 });

  // Re-mount MultipleChoice per item so internal selection state resets.
  const questionKey = useRef(0);

  // Affirm/correction copy — pick once per feedback reveal and hold.
  const feedbackCopy = useRef('');

  const handleAnswer = useCallback(
    async (answer: AssessmentAnswer, correctValue: string, gloss: string, checkIndex: number) => {
      const word = batch[checkIndex];
      if (word === undefined) return;

      const isCorrect = answer.value === correctValue;

      // SRS seed write — the one and only SRS write in the learn flow.
      try {
        await services.answerQuestion.execute({
          session: makeSessionStub(word, tierId),
          wordId: word.id,
          assessmentType: answer.assessmentType,
          userAnswer: answer.value,
          correctAnswer: correctValue,
          isCorrect,
          nowMs: Date.now(),
        });
      } catch {
        // Never block on a write failure. The word will enter via normal
        // first-review if the seed is missing.
      }

      if (isCorrect) {
        hapticsCorrect();
        feedbackCopy.current = pickRandom(AFFIRM);
      } else {
        feedbackCopy.current = pickRandom(CORRECTION);
      }

      void services.analytics.track('quiz_submitted', {
        tier_id: tierId,
        assessment_type: answer.assessmentType,
        is_correct: isCorrect,
        context: 'learn_quick_check',
      });

      setPhase({
        kind: 'feedback',
        checkIndex,
        wasCorrect: isCorrect,
        chosenValue: answer.value,
        correctValue,
        gloss,
      });
    },
    [batch, tierId, services],
  );

  const handleContinue = useCallback(
    (checkIndex: number) => {
      const nextIndex = checkIndex + 1;
      if (nextIndex >= batch.length) {
        onComplete();
        return;
      }
      questionKey.current += 1;
      setPhase({ kind: 'active', checkIndex: nextIndex });
    },
    [batch.length, onComplete],
  );

  // Guard: empty batch should not reach this screen, but handle it cleanly.
  if (batch.length === 0) {
    onComplete();
    return <></>;
  }

  if (phase.kind === 'done') {
    onComplete();
    return <></>;
  }

  const checkIndex = phase.checkIndex;
  const word = batch[checkIndex];

  if (word === undefined) {
    onComplete();
    return <></>;
  }

  const total = batch.length;
  const position = checkIndex + 1;
  const question = buildQuestion({
    target: word,
    pool: batch,
    assessmentType: 'multiple_choice',
  });

  const isFeedback = phase.kind === 'feedback';

  return (
    <Screen>
      {/* ── Header: back button + "Quick check" label + counter ── */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s3 }}>
        <Button label="Back" variant="tertiary" onPress={onExit} />
        <View style={{ flex: 1, gap: spacing.s1 }}>
          <Text variant="caption" color="textTertiary">
            Quick check
          </Text>
          <ProgressBar progress={position / total} label="Quick-check progress" />
        </View>
        <Text variant="mono" color="textTertiary" tabularNums>
          {`${position}/${total}`}
        </Text>
      </View>

      {/* ── Question widget ── */}
      <MultipleChoice
        key={questionKey.current}
        prompt={question.prompt}
        context={question.context}
        options={question.options}
        correctValue={question.correctValue}
        revealed={isFeedback}
        onAnswer={(answer) =>
          void handleAnswer(answer, question.correctValue, word.definition, checkIndex)
        }
      />

      {/* ── Inline feedback (visible after answer, before Continue) ── */}
      {isFeedback && phase.kind === 'feedback' && (
        <View style={{ gap: spacing.s3 }}>
          {/* Correct row */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.s2,
              backgroundColor: colors.successSubtle,
              borderRadius: 10,
              paddingHorizontal: spacing.s3,
              paddingVertical: spacing.s2,
            }}
            accessibilityLiveRegion="polite"
          >
            <Icon name="check" size={18} color="success" />
            <Text variant="body" color="success" style={{ flex: 1 }}>
              {phase.wasCorrect ? phase.chosenValue : phase.correctValue}
            </Text>
          </View>

          {/* Incorrect row — only shown on miss */}
          {!phase.wasCorrect && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.s2,
                backgroundColor: colors.cautionSubtle,
                borderRadius: 10,
                paddingHorizontal: spacing.s3,
                paddingVertical: spacing.s2,
              }}
            >
              <Text variant="label" color="caution">
                {'–'}
              </Text>
              <Text variant="body" color="caution" style={{ flex: 1 }}>
                {phase.chosenValue}
              </Text>
            </View>
          )}

          {/* Affirm or gentle correction copy */}
          <Text variant="body" color={phase.wasCorrect ? 'success' : 'caution'}>
            {phase.wasCorrect
              ? feedbackCopy.current
              : `${feedbackCopy.current} This one means "${phase.gloss}". You'll see it again soon.`}
          </Text>

          <Button
            label="Continue"
            variant="primary"
            fullWidth
            onPress={() => handleContinue(checkIndex)}
          />
        </View>
      )}
    </Screen>
  );
}
