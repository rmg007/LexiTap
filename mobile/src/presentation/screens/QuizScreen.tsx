import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Screen } from '@/presentation/screens/Screen';
import { useTheme } from '@/presentation/theme';
import { Text, Button, ProgressBar } from '@/presentation/components';
import { MultipleChoice, DragDrop } from '@/presentation/components/assessments';
import type { AssessmentAnswer } from '@/presentation/components/assessments/types';
import { useServices } from '@/presentation/services';
import { hapticsCorrect, hapticsSessionComplete } from '@/presentation/services/haptics';
import { buildQuestion } from '@/presentation/screens/quizQuestion';
import { FeedbackLayer } from '@/presentation/screens/FeedbackLayer';
import { SessionCompleteScreen } from '@/presentation/screens/SessionCompleteScreen';
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
// Flow: answer tap → feedback phase (FeedbackLayer overlay) → Continue tap →
// SRS write → next word or complete.
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
  | { kind: 'active'; session: QuizSession; startedAt: number; preSessionStreak: number }
  | {
      kind: 'feedback';
      session: QuizSession;
      startedAt: number;
      preSessionStreak: number;
      wasCorrect: boolean;
      chosenValue: string;
      correctValue: string;
      gloss: string;
      assessmentType: AssessmentType;
    }
  | {
      kind: 'complete';
      wordsReviewed: number;
      streakIncremented: boolean;
      currentStreak: number;
      moreItemsAvailable: boolean;
    };

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
      // Snapshot streak before session so we can detect increment on completion.
      const preStats = await services.queries.getUserStats().catch(() => null);
      const preSessionStreak = preStats?.streak.currentStreak ?? 0;

      const session = await services.startQuiz.execute({
        tierId: asTierId(tierId),
        mode,
        nowMs: Date.now(),
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      void services.analytics.track('lesson_started', { tier_id: tierId, mode });
      setPhase({ kind: 'active', session, startedAt: Date.now(), preSessionStreak });
    } catch (error) {
      if (error instanceof NoWordsAvailableError) {
        setPhase({ kind: 'empty' });
        return;
      }
      setPhase({ kind: 'empty' });
    }
  }, [services, tierId, mode]);

  useEffect(() => {
    void start();
  }, [start]);

  // Step 1: user taps an answer → show feedback, block further interaction.
  // SRS write is deferred to handleContinue so the learner sees feedback first.
  const handleAnswer = useCallback(
    (answer: AssessmentAnswer, correctValue: string, gloss: string) => {
      if (phase.kind !== 'active') return;
      const word = currentWord(phase.session);
      if (word === null) return;

      const isCorrect = answer.value === correctValue;
      // Haptic: soft success on correct only — no error haptic on incorrect.
      if (isCorrect) hapticsCorrect();

      setPhase({
        kind: 'feedback',
        session: phase.session,
        startedAt: phase.startedAt,
        preSessionStreak: phase.preSessionStreak,
        wasCorrect: isCorrect,
        chosenValue: answer.value,
        correctValue,
        gloss,
        assessmentType: answer.assessmentType,
      });
    },
    [phase],
  );

  // Step 2: user taps Continue in FeedbackLayer → write SRS, advance.
  const handleContinue = useCallback(async () => {
    if (phase.kind !== 'feedback') return;
    const word = currentWord(phase.session);
    if (word === null) return;

    try {
      const out = await services.answerQuestion.execute({
        session: phase.session,
        wordId: word.id,
        assessmentType: phase.assessmentType,
        userAnswer: phase.chosenValue,
        correctAnswer: phase.correctValue,
        isCorrect: phase.wasCorrect,
        nowMs: Date.now(),
      });
      void services.analytics.track('quiz_submitted', {
        tier_id: tierId,
        assessment_type: phase.assessmentType,
        is_correct: phase.wasCorrect,
      });
      questionKey.current += 1;
      if (out.result.isSessionComplete) {
        hapticsSessionComplete();
        const durationSec = phase.startedAt
          ? Math.round((Date.now() - phase.startedAt) / 1000)
          : 0;
        void services.analytics.track('lesson_completed', {
          tier_id: tierId,
          mode,
          total_correct: out.result.totalCorrect,
          total_attempts: out.session.words.length,
          duration_sec: durationSec,
        });
        // Resolve post-session streak and "more items" flag (best-effort).
        const [postStats, dailyProgress] = await Promise.all([
          services.queries.getUserStats().catch(() => null),
          services.queries.getDailyProgress(asTierId(tierId)).catch(() => null),
        ]);
        const postStreak = postStats?.streak.currentStreak ?? phase.preSessionStreak;
        const streakIncremented = postStreak > phase.preSessionStreak;
        const moreItemsAvailable =
          dailyProgress !== null
            ? dailyProgress.reviewsCompletedToday < dailyProgress.effectiveDailyCap
            : false;
        setPhase({
          kind: 'complete',
          wordsReviewed: out.session.words.length,
          streakIncremented,
          currentStreak: postStreak,
          moreItemsAvailable,
        });
      } else {
        setPhase({
          kind: 'active',
          session: out.session,
          startedAt: phase.startedAt,
          preSessionStreak: phase.preSessionStreak,
        });
      }
    } catch {
      // Never block the quiz path on a write failure: advance locally.
      questionKey.current += 1;
      setPhase({
        kind: 'active',
        session: phase.session,
        startedAt: phase.startedAt,
        preSessionStreak: phase.preSessionStreak,
      });
    }
  }, [phase, services, tierId, mode]);

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
            You're done for today. Nice work.
          </Text>
          <Button label="Back to Home" variant="primary" fullWidth onPress={onExit} />
        </View>
      </Screen>
    );
  }

  if (phase.kind === 'complete') {
    return (
      <SessionCompleteScreen
        wordsReviewed={phase.wordsReviewed}
        streakIncremented={phase.streakIncremented}
        currentStreak={phase.currentStreak}
        moreItemsAvailable={phase.moreItemsAvailable}
        onDone={onExit}
        onKeepPracticing={() => void start()}
      />
    );
  }

  // feedback and active phases both render the assessment widget.
  // In feedback phase the widget is frozen (pointer-events:none) and
  // FeedbackLayer overlays it at the bottom.
  const activeSession = phase.session;
  const isFeedback = phase.kind === 'feedback';

  const word = currentWord(activeSession);
  if (word === null) {
    return (
      <Screen scroll={false}>
        <Button label="Back to Home" variant="primary" fullWidth onPress={onExit} />
      </Screen>
    );
  }

  const type = widgetFor(activeSession.currentIndex);
  const question = buildQuestion({ target: word, pool: activeSession.words, assessmentType: type });
  const total = activeSession.words.length;
  const position = activeSession.currentIndex + 1;

  return (
    <Screen scroll={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s3 }}>
        <Button label="Back" variant="tertiary" onPress={onExit} />
        <View style={{ flex: 1 }}>
          <ProgressBar progress={position / total} label="Session progress" />
        </View>
        <Text variant="mono" color="textTertiary" tabularNums>
          {`${position}/${total}`}
        </Text>
      </View>

      {/* Assessment widget — frozen during feedback phase so taps are blocked */}
      <View pointerEvents={isFeedback ? 'none' : 'auto'} style={{ flex: 1 }}>
        {question.assessmentType === 'multiple_choice' ? (
          <MultipleChoice
            key={questionKey.current}
            prompt={question.prompt}
            context={question.context}
            options={question.options}
            correctValue={question.correctValue}
            onAnswer={(a) => handleAnswer(a, question.correctValue, word.definition)}
          />
        ) : (
          <DragDrop
            key={questionKey.current}
            sentence={question.sentence}
            options={question.options}
            correctValue={question.correctValue}
            onAnswer={(a) => handleAnswer(a, question.correctValue, word.definition)}
          />
        )}
      </View>

      {/* FeedbackLayer: slides up from frame bottom after answer */}
      {isFeedback && (
        <FeedbackLayer
          wasCorrect={phase.wasCorrect}
          chosenValue={phase.chosenValue}
          correctValue={phase.correctValue}
          gloss={phase.gloss}
          onContinue={() => void handleContinue()}
        />
      )}
    </Screen>
  );
}
