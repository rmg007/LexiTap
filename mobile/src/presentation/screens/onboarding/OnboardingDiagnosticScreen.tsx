import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Screen } from '@/presentation/screens/Screen';
import { useTheme } from '@/presentation/theme';
import { Text, Button, ProgressBar } from '@/presentation/components';
import { MultipleChoice } from '@/presentation/components/assessments';
import type { AssessmentAnswer } from '@/presentation/components/assessments/types';
import { useServices } from '@/presentation/services';
import { buildQuestion } from '@/presentation/screens/quizQuestion';
import { asTierId, type Word, type DiagnosticResult } from '@/domain/index';

// First-run onboarding diagnostic. Walks the learner through a short tap-only
// quiz (NO TextInput) sampled across the tier's difficulty range, grades each
// answer, then seeds initial UserProgress so the first real session is leveled.
// Presentational: all I/O goes through useServices(); navigation is a callback.

export interface OnboardingDiagnosticScreenProps {
  // The tier to diagnose against (defaults handled by the route).
  tierId: string;
  // Number of words to sample (defaults to the domain default).
  sampleSize?: number;
  // Called once seeds are written (or the diagnostic is skipped). The route
  // marks first-run complete and navigates to Home.
  onComplete: () => void;
}

type Phase =
  | { kind: 'loading' }
  | { kind: 'active'; words: Word[]; index: number; results: DiagnosticResult[] }
  | { kind: 'seeding' }
  | { kind: 'done' };

export function OnboardingDiagnosticScreen({
  tierId,
  sampleSize,
  onComplete,
}: OnboardingDiagnosticScreenProps): React.JSX.Element {
  const { spacing } = useTheme();
  const { runDiagnostic, saveOnboardingProfile } = useServices();

  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  // Re-mount the widget per question so internal selection state resets.
  const questionKey = useRef(0);

  const finish = useCallback(
    async (results: DiagnosticResult[]) => {
      setPhase({ kind: 'seeding' });
      try {
        await runDiagnostic.seed({ results, nowMs: Date.now() });
      } catch {
        // Offline-first: never block first-run on a seed write failure.
      }
      try {
        // Persist the onboarding completion timestamp. goal / band / frontierRank
        // are added by later onboarding steps (goal picker, Knowledge Map reveal).
        await saveOnboardingProfile.execute({ completedAt: Date.now() });
      } catch {
        // Non-blocking: profile save failure must not trap the user on first run.
      }
      setPhase({ kind: 'done' });
      onComplete();
    },
    [runDiagnostic, saveOnboardingProfile, onComplete],
  );

  const load = useCallback(async () => {
    try {
      const { words } = await runDiagnostic.sample(asTierId(tierId), sampleSize);
      if (words.length === 0) {
        // Nothing to diagnose: skip straight through.
        await finish([]);
        return;
      }
      setPhase({ kind: 'active', words, index: 0, results: [] });
    } catch {
      // If sampling fails, don't trap the user on first run — just continue.
      onComplete();
    }
  }, [runDiagnostic, tierId, sampleSize, finish, onComplete]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAnswer = useCallback(
    (answer: AssessmentAnswer, correctValue: string, word: Word) => {
      if (phase.kind !== 'active') return;
      const isCorrect = answer.value === correctValue;
      const results = [...phase.results, { word, isCorrect }];
      questionKey.current += 1;
      const nextIndex = phase.index + 1;
      if (nextIndex >= phase.words.length) {
        void finish(results);
      } else {
        setPhase({ kind: 'active', words: phase.words, index: nextIndex, results });
      }
    },
    [phase, finish],
  );

  if (phase.kind === 'loading' || phase.kind === 'seeding' || phase.kind === 'done') {
    return (
      <Screen scroll={false}>
        <View style={{ gap: spacing.s4, flex: 1, justifyContent: 'center' }}>
          <Text variant="title" color="textPrimary" accessibilityRole="header">
            {phase.kind === 'seeding' ? 'Setting up your words…' : 'Getting started…'}
          </Text>
          <Text variant="body" color="textSecondary">
            A few quick questions help us start you at the right level.
          </Text>
        </View>
      </Screen>
    );
  }

  const word = phase.words[phase.index];
  if (word === undefined) {
    // Defensive: index past the end without a finish. Continue.
    return (
      <Screen scroll={false}>
        <Button label="Continue" variant="primary" fullWidth onPress={onComplete} />
      </Screen>
    );
  }

  const question = buildQuestion({
    target: word,
    pool: phase.words,
    assessmentType: 'multiple_choice',
  });
  const total = phase.words.length;
  const position = phase.index + 1;

  return (
    <Screen>
      <View style={{ gap: spacing.s2 }}>
        <Text variant="title" color="textPrimary" accessibilityRole="header">
          Quick check
        </Text>
        <ProgressBar progress={position / total} label="Diagnostic progress" />
        <Text variant="mono" color="textTertiary" tabularNums>
          {`${position}/${total}`}
        </Text>
      </View>

      <MultipleChoice
        key={questionKey.current}
        prompt={question.prompt}
        context={question.context}
        options={question.options}
        correctValue={question.correctValue}
        onAnswer={(a) => handleAnswer(a, question.correctValue, word)}
      />
    </Screen>
  );
}
