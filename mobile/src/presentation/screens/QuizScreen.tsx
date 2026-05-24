import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Screen } from '@/presentation/screens/Screen';
import { useTheme } from '@/presentation/theme';
import { Text, Button, ProgressBar } from '@/presentation/components';
import { MultipleChoice, DragDrop } from '@/presentation/components/assessments';
import type { AssessmentAnswer } from '@/presentation/components/assessments/types';
import { useServices } from '@/presentation/services';
import { buildQuestion } from '@/presentation/screens/quizQuestion';
import {
  currentWord,
  NoWordsAvailableError,
  asTierId,
  type QuizSession,
  type QuizMode,
  type AssessmentType,
} from '@/domain/index';

// Quiz driver. Starts a session via useServices, renders the assessment widget
// for the current word, forwards the learner's answer to AnswerQuestionUseCase,
// and advances. Offline-first: starting never shows a blocking spinner/error —
// "no words" resolves to a calm caught-up state, not an error.
//
// NO TextInput anywhere in this flow (hard invariant).

export interface QuizScreenProps {
  tierId: string;
  mode: QuizMode;
  onExit: () => void;
}

type Phase =
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'active'; session: QuizSession }
  | { kind: 'complete'; correct: number; total: number };

// MVP widget rotation: alternate the two shipped widgets by question index.
function widgetFor(index: number): AssessmentType {
  return index % 2 === 0 ? 'multiple_choice' : 'drag_drop';
}

export function QuizScreen({ tierId, mode, onExit }: QuizScreenProps): React.JSX.Element {
  const { spacing } = useTheme();
  const services = useServices();
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  // Re-mount widgets per question so internal selection state resets cleanly.
  const questionKey = useRef(0);

  const start = useCallback(async () => {
    try {
      const session = await services.startQuiz.execute({
        tierId: asTierId(tierId),
        mode,
        nowMs: Date.now(),
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      setPhase({ kind: 'active', session });
    } catch (error) {
      if (error instanceof NoWordsAvailableError) {
        setPhase({ kind: 'empty' });
        return;
      }
      // Offline-first: any other start failure also lands on the calm empty
      // state rather than a blocking error screen.
      setPhase({ kind: 'empty' });
    }
  }, [services, tierId, mode]);

  useEffect(() => {
    void start();
  }, [start]);

  const handleAnswer = useCallback(
    async (answer: AssessmentAnswer, correctValue: string) => {
      if (phase.kind !== 'active') return;
      const word = currentWord(phase.session);
      if (word === null) return;

      const isCorrect = answer.value === correctValue;
      try {
        const out = await services.answerQuestion.execute({
          session: phase.session,
          wordId: word.id,
          assessmentType: answer.assessmentType,
          userAnswer: answer.value,
          correctAnswer: correctValue,
          isCorrect,
          nowMs: Date.now(),
        });
        questionKey.current += 1;
        if (out.result.isSessionComplete) {
          // Best-effort sync at session end; failure is a silent no-op.
          void services.syncProgress
            .execute({ userId: 'me', sinceCursor: 0 })
            .catch(() => undefined);
          setPhase({
            kind: 'complete',
            correct: out.result.totalCorrect,
            total: out.session.words.length,
          });
        } else {
          setPhase({ kind: 'active', session: out.session });
        }
      } catch {
        // Never block the quiz path on a write failure: advance locally.
        questionKey.current += 1;
        setPhase({ kind: 'active', session: phase.session });
      }
    },
    [phase, services],
  );

  if (phase.kind === 'loading') {
    return (
      <Screen scroll={false}>
        <Text variant="body" color="textSecondary">
          Preparing your session…
        </Text>
      </Screen>
    );
  }

  if (phase.kind === 'empty') {
    return (
      <Screen scroll={false}>
        <View style={{ gap: spacing.s4, flex: 1, justifyContent: 'center' }}>
          <Text variant="title" color="textPrimary" accessibilityRole="header">
            All caught up
          </Text>
          <Text variant="body" color="textSecondary">
            You’re done for today. Nice work.
          </Text>
          <Button label="Back to Home" variant="primary" fullWidth onPress={onExit} />
        </View>
      </Screen>
    );
  }

  if (phase.kind === 'complete') {
    return (
      <Screen scroll={false}>
        <View style={{ gap: spacing.s4, flex: 1, justifyContent: 'center' }}>
          <Text variant="title" color="textPrimary" accessibilityRole="header">
            Session complete
          </Text>
          <Text variant="bodyLg" color="textSecondary" tabularNums>
            {`${phase.correct} of ${phase.total} correct`}
          </Text>
          <Button label="Back to Home" variant="primary" fullWidth onPress={onExit} />
        </View>
      </Screen>
    );
  }

  const word = currentWord(phase.session);
  if (word === null) {
    // Defensive: index past the end without a complete result.
    return (
      <Screen scroll={false}>
        <Button label="Back to Home" variant="primary" fullWidth onPress={onExit} />
      </Screen>
    );
  }

  const type = widgetFor(phase.session.currentIndex);
  const question = buildQuestion({ target: word, pool: phase.session.words, assessmentType: type });
  const total = phase.session.words.length;
  const position = phase.session.currentIndex + 1;

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s3 }}>
        <Button label="Back" variant="tertiary" onPress={onExit} />
        <View style={{ flex: 1 }}>
          <ProgressBar progress={position / total} label="Session progress" />
        </View>
        <Text variant="mono" color="textTertiary" tabularNums>
          {`${position}/${total}`}
        </Text>
      </View>

      {question.assessmentType === 'multiple_choice' ? (
        <MultipleChoice
          key={questionKey.current}
          prompt={question.prompt}
          context={question.context}
          options={question.options}
          correctValue={question.correctValue}
          onAnswer={(a) => void handleAnswer(a, question.correctValue)}
        />
      ) : (
        <DragDrop
          key={questionKey.current}
          sentence={question.sentence}
          options={question.options}
          correctValue={question.correctValue}
          onAnswer={(a) => void handleAnswer(a, question.correctValue)}
        />
      )}
    </Screen>
  );
}
