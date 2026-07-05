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
import { ForgivenessSheet } from '@/presentation/screens/ForgivenessSheet';
import { FORGIVENESS } from '@/domain/srs/forgiveness';
import {
  currentWord,
  NoWordsAvailableError,
  TierLockedError,
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
// SRS write → next word or complete. At soft daily cap → ForgivenessSheet.
//
// NO TextInput anywhere in this flow (hard invariant).

export interface QuizScreenProps {
  tierId: string;
  mode: QuizMode;
  onExit: () => void;
  // Called when quiz is blocked because the tier requires a purchase.
  onTierLocked?: () => void;
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
      ease?: 'easy'; // set when the learner taps "Too easy" (correct answers only)
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

export function QuizScreen({ tierId, mode, onExit, onTierLocked }: QuizScreenProps): React.JSX.Element {
  const { spacing } = useTheme();
  const services = useServices();
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  const questionKey = useRef(0);

  // Forgiveness sheet state.
  const [showForgiveness, setShowForgiveness] = useState(false);
  const forgivenessShownThisSession = useRef(false);
  const answersThisSession = useRef(0);
  const [forgivenessStreak, setForgivenessStreak] = useState(0);

  // Whether the word currently in feedback is saved (drives the Save toggle).
  const [feedbackSaved, setFeedbackSaved] = useState(false);

  const start = useCallback(async () => {
    try {
      // Fetch everything needed before session starts (non-blocking best-effort).
      const [stats, daily] = await Promise.all([
        services.queries.getUserStats().catch(() => null),
        services.queries.getDailyProgress(asTierId(tierId)).catch(() => null),
      ]);

      const preSessionStreak = stats?.streak.currentStreak ?? 0;
      setForgivenessStreak(preSessionStreak);
      // Seed local counter from today's already-completed reviews so the cap
      // fires correctly even if this is a continuation session.
      answersThisSession.current = daily?.reviewsCompletedToday ?? 0;

      const session = await services.startQuiz.execute({
        tierId: asTierId(tierId),
        mode,
        nowMs: Date.now(),
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      void services.analytics.track('lesson_started', { tier_id: tierId, mode });
      setPhase({ kind: 'active', session, startedAt: Date.now(), preSessionStreak });
    } catch (error) {
      if (error instanceof TierLockedError) {
        // Tier requires purchase — let the parent route open the paywall.
        if (onTierLocked) onTierLocked();
        else onExit();
        return;
      }
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
      if (isCorrect) hapticsCorrect();

      // Hydrate the Save toggle for this word (fail-soft; default not-saved).
      setFeedbackSaved(false);
      void services.queries.isWordSaved(word.id).then(setFeedbackSaved).catch(() => undefined);

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
    [phase, services],
  );

  // "Too easy" — flip local state; the accelerated SRS write happens on Continue.
  const handleMarkEasy = useCallback(() => {
    setPhase((p) => (p.kind === 'feedback' && p.wasCorrect ? { ...p, ease: 'easy' } : p));
  }, []);

  // Save toggle in feedback — optimistic, fail-soft, never blocks Continue.
  const handleToggleSave = useCallback(() => {
    if (phase.kind !== 'feedback') return;
    const word = currentWord(phase.session);
    if (word === null) return;
    const next = !feedbackSaved;
    setFeedbackSaved(next);
    void (next
      ? services.queries.saveWord(word.id, 'quiz')
      : services.queries.unsaveWord(word.id)
    ).catch(() => setFeedbackSaved(!next));
  }, [phase, feedbackSaved, services]);

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
        ease: phase.ease,
      });
      void services.analytics.track('quiz_submitted', {
        tier_id: tierId,
        assessment_type: phase.assessmentType,
        is_correct: phase.wasCorrect,
      });
      questionKey.current += 1;
      answersThisSession.current += 1;

      // Soft daily cap check — show forgiveness sheet once per session.
      if (
        !forgivenessShownThisSession.current &&
        answersThisSession.current >= FORGIVENESS.BASE_DAILY_CAP
      ) {
        forgivenessShownThisSession.current = true;
        setShowForgiveness(true);
      }

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
        if (streakIncremented) {
          void services.analytics.track('streak_event', {
            streak_days: postStreak,
            event: 'incremented',
          });
        }
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
      questionKey.current += 1;
      setPhase({
        kind: 'active',
        session: phase.session,
        startedAt: phase.startedAt,
        preSessionStreak: phase.preSessionStreak,
      });
    }
  }, [phase, services, tierId, mode]);

  const handleStopHere = useCallback(() => {
    setShowForgiveness(false);
    onExit();
  }, [onExit]);

  const handleKeepGoing = useCallback(() => {
    setShowForgiveness(false);
  }, []);

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

      {isFeedback && (
        <FeedbackLayer
          wasCorrect={phase.wasCorrect}
          chosenValue={phase.chosenValue}
          correctValue={phase.correctValue}
          gloss={phase.gloss}
          onContinue={() => void handleContinue()}
          wordLabel={word.word}
          isSaved={feedbackSaved}
          onToggleSave={handleToggleSave}
          onMarkEasy={phase.wasCorrect ? handleMarkEasy : undefined}
          easeSelected={phase.ease === 'easy'}
        />
      )}

      <ForgivenessSheet
        currentStreak={forgivenessStreak}
        visible={showForgiveness}
        onStopHere={handleStopHere}
        onKeepGoing={handleKeepGoing}
      />
    </Screen>
  );
}
