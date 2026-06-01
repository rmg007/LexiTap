import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Screen } from '@/presentation/screens/Screen';
import { useTheme } from '@/presentation/theme';
import { Text, Button, ProgressBar } from '@/presentation/components';
import { MultipleChoice } from '@/presentation/components/assessments';
import type { AssessmentAnswer } from '@/presentation/components/assessments/types';
import { useServices } from '@/presentation/services';
import { buildQuestion } from '@/presentation/screens/quizQuestion';
import {
  asTierId,
  type Word,
  type WordId,
  type PseudoWord,
  type LearningGoal,
  type ProficiencyBand,
  type DiagnosticState,
  initDiagnostic,
  startBandForProficiency,
  selectNearestWord,
  processAnswer,
  shouldStop,
  shouldInjectPseudo,
  finalFrontierRank,
  DEFAULT_BAND_WALK_CONFIG,
} from '@/domain/index';
import { DEFAULT_PSEUDO_BUDGET } from '@/application/onboarding/RunAdaptiveDiagnosticUseCase';

// DIAG-A onboarding screen (PC-1) — replaces the DIAG-B stride sampler. A
// tap-only adaptive band-walk: each item asks "Do you know this word?" (Yes/No);
// a Yes triggers a 3-option meaning check (confirm-on-Yes) so a claim only counts
// when it's backed by the right meaning. Non-words (pseudo-words) are interleaved
// identically as a lie detector. On finish we estimate the frontier rank
// (corrected for over-claiming), seed initial SRS mastery, and persist the
// onboarding profile. Presentational: all I/O via useServices(); the band-walk
// MATH lives in the pure domain engine — this screen only sequences taps.

export interface OnboardingAdaptiveDiagnosticScreenProps {
  tierId: string;
  onComplete: () => void;
  // Goal + band from earlier onboarding steps. `band` seeds the starting rank
  // (self-segment) and is merged into the persisted profile.
  partialProfile?: { goal?: LearningGoal; band?: ProficiencyBand };
}

type CurrentItem = { kind: 'word'; word: Word } | { kind: 'pseudo'; pseudo: PseudoWord };

type Phase =
  | { kind: 'loading' }
  | { kind: 'ask'; item: CurrentItem }
  | { kind: 'confirm'; word: Word }
  | { kind: 'seeding' }
  | { kind: 'done' };

// Mutable run state held in a ref so the tap handlers never read a stale engine
// snapshot between renders (the band-walk is a synchronous state machine).
interface Machine {
  state: DiagnosticState;
  pool: Word[];
  pseudoWords: PseudoWord[];
  freePoolSize: number;
  usedWordIds: Set<WordId>;
  pseudoCursor: number;
}

export function OnboardingAdaptiveDiagnosticScreen({
  tierId,
  onComplete,
  partialProfile,
}: OnboardingAdaptiveDiagnosticScreenProps): React.JSX.Element {
  const { spacing } = useTheme();
  const { runAdaptiveDiagnostic, saveOnboardingProfile } = useServices();

  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  const machine = useRef<Machine | null>(null);
  // Re-mount the meaning-check widget per question so its selection state resets.
  const questionKey = useRef(0);

  const finish = useCallback(async () => {
    const m = machine.current;
    setPhase({ kind: 'seeding' });
    const frontierRank = m ? finalFrontierRank(m.state) : startBandForProficiency(partialProfile?.band);
    if (m) {
      try {
        await runAdaptiveDiagnostic.seed({
          pool: m.pool,
          frontierRank,
          answers: m.state.answers,
          nowMs: Date.now(),
        });
      } catch {
        // Offline-first: never block first-run on a seed write failure.
      }
    }
    try {
      await saveOnboardingProfile.execute({
        ...partialProfile,
        frontierRank,
        completedAt: Date.now(),
      });
    } catch {
      // Non-blocking: a profile-save failure must not trap the user on first run.
    }
    setPhase({ kind: 'done' });
    onComplete();
  }, [runAdaptiveDiagnostic, saveOnboardingProfile, onComplete, partialProfile]);

  // Pick and present the next item, or finish when the walk is done / dry.
  const advance = useCallback(() => {
    const m = machine.current;
    if (m === null) {
      void finish();
      return;
    }
    if (shouldStop(m.state)) {
      void finish();
      return;
    }
    if (
      shouldInjectPseudo(m.state, DEFAULT_PSEUDO_BUDGET) &&
      m.pseudoCursor < m.pseudoWords.length
    ) {
      const pseudo = m.pseudoWords[m.pseudoCursor];
      m.pseudoCursor += 1;
      if (pseudo !== undefined) {
        setPhase({ kind: 'ask', item: { kind: 'pseudo', pseudo } });
        return;
      }
    }
    const word = selectNearestWord(m.pool, m.state.currentBand, m.usedWordIds);
    if (word === null) {
      void finish();
      return;
    }
    m.usedWordIds.add(word.id);
    setPhase({ kind: 'ask', item: { kind: 'word', word } });
  }, [finish]);

  const load = useCallback(async () => {
    try {
      const loaded = await runAdaptiveDiagnostic.loadPool(asTierId(tierId), DEFAULT_PSEUDO_BUDGET);
      if (loaded.pool.length === 0) {
        machine.current = null;
        await finish();
        return;
      }
      machine.current = {
        state: initDiagnostic(
          startBandForProficiency(partialProfile?.band),
          DEFAULT_BAND_WALK_CONFIG,
        ),
        pool: loaded.pool,
        pseudoWords: loaded.pseudoWords,
        freePoolSize: loaded.freePoolSize,
        usedWordIds: new Set<WordId>(),
        pseudoCursor: 0,
      };
      advance();
    } catch {
      // If loading fails, don't trap the user on first run — just continue.
      onComplete();
    }
  }, [runAdaptiveDiagnostic, tierId, partialProfile, finish, advance, onComplete]);

  useEffect(() => {
    void load();
  }, [load]);

  // "Do you know this word?" — Yes/No on the current item.
  const handleClaim = useCallback(
    (claimed: boolean) => {
      const m = machine.current;
      if (m === null || phase.kind !== 'ask') return;
      const item = phase.item;
      if (item.kind === 'pseudo') {
        m.state = processAnswer(m.state, { kind: 'pseudo', claimed });
        advance();
        return;
      }
      if (!claimed) {
        m.state = processAnswer(m.state, {
          kind: 'word',
          word: item.word,
          claimed: false,
          confirmed: false,
        });
        advance();
        return;
      }
      // Claimed Yes → require a meaning check before crediting it.
      questionKey.current += 1;
      setPhase({ kind: 'confirm', word: item.word });
    },
    [phase, advance],
  );

  // Meaning-check result → confirmed/not, then advance the walk.
  const handleConfirm = useCallback(
    (answer: AssessmentAnswer, correctValue: string) => {
      const m = machine.current;
      if (m === null || phase.kind !== 'confirm') return;
      const confirmed = answer.value === correctValue;
      m.state = processAnswer(m.state, {
        kind: 'word',
        word: phase.word,
        claimed: true,
        confirmed,
      });
      advance();
    },
    [phase, advance],
  );

  if (phase.kind === 'loading' || phase.kind === 'seeding' || phase.kind === 'done') {
    return (
      <Screen scroll={false}>
        <View style={{ gap: spacing.s4, flex: 1, justifyContent: 'center' }}>
          <Text variant="title" color="textPrimary" accessibilityRole="header">
            {phase.kind === 'seeding' ? 'Setting up your words…' : 'Getting started…'}
          </Text>
          <Text variant="body" color="textSecondary">
            A few quick checks help us start you at the right level.
          </Text>
        </View>
      </Screen>
    );
  }

  // Progress: items answered out of the cap (an upper bound — the walk usually
  // converges sooner). Pseudo-words don't advance this count.
  const m = machine.current;
  const answered = m?.state.itemsAnswered ?? 0;
  const cap = DEFAULT_BAND_WALK_CONFIG.maxItems;
  const progress = Math.min(1, answered / cap);

  if (phase.kind === 'confirm') {
    const m2 = machine.current;
    const question = buildQuestion({
      target: phase.word,
      pool: m2?.pool ?? [phase.word],
      assessmentType: 'multiple_choice',
    });
    return (
      <Screen>
        <View style={{ gap: spacing.s2 }}>
          <Text variant="title" color="textPrimary" accessibilityRole="header">
            Which meaning?
          </Text>
          <ProgressBar progress={progress} label="Diagnostic progress" />
        </View>
        <MultipleChoice
          key={questionKey.current}
          prompt={question.prompt}
          context={question.context}
          options={question.options}
          correctValue={question.correctValue}
          onAnswer={(a) => handleConfirm(a, question.correctValue)}
        />
      </Screen>
    );
  }

  // phase.kind === 'ask' — the displayed term is the same shape for words and
  // pseudo-words (no visual flag), so over-claiming on a non-word is detectable.
  const term = phase.item.kind === 'word' ? phase.item.word.word : phase.item.pseudo.word;

  return (
    <Screen scroll={false}>
      <View style={{ gap: spacing.s2 }}>
        <Text variant="title" color="textPrimary" accessibilityRole="header">
          Do you know this word?
        </Text>
        <ProgressBar progress={progress} label="Diagnostic progress" />
      </View>

      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text variant="h1" color="textPrimary" accessibilityRole="text">
          {term}
        </Text>
      </View>

      <View style={{ gap: spacing.s3 }}>
        <Button
          label="Yes, I know it"
          variant="primary"
          fullWidth
          onPress={() => handleClaim(true)}
        />
        <Button
          label="No, not yet"
          variant="secondary"
          fullWidth
          onPress={() => handleClaim(false)}
        />
      </View>
    </Screen>
  );
}
