import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Screen } from '@/presentation/screens/Screen';
import { useTheme } from '@/presentation/theme';
import { Text, Button, ProgressBar } from '@/presentation/components';
import { useServices } from '@/presentation/services';
import { asTierId, NoWordsAvailableError } from '@/domain/index';
import type { Word } from '@/domain/vocabulary/Word';

// LearnCard — pressure-free first exposure to new words (Screen 5).
//
// Fetches a batch of new words via StartQuizUseCase (mode='learn') and
// presents them one at a time. The learner reads and taps "Got it" to advance.
//
// Hard invariants (MISSING_SCREENS_PLAN.md / LearnCard.md):
//   - NO assessment widget, NO TextInput anywhere on this screen.
//   - NO SRS write here — SRS seeding happens only in LearnQuickCheck (Screen 6).
//   - Nullable fields (phonetic, example, image, audio) are omitted when absent;
//     no empty labels are ever shown.
//   - Audio button rendered only when word.audioPath exists.

export interface LearnCardScreenProps {
  tierId: string;
  onExit: () => void;       // back to Home
  onComplete: () => void;   // after quick-check batch → Home (stub until Screen 6)
}

type LearnPhase =
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'card'; index: number; batch: Word[] }
  | { kind: 'quickcheck' }
  | { kind: 'done' };

const BATCH_LIMIT = 10;

export function LearnCardScreen({
  tierId,
  onExit,
  onComplete,
}: LearnCardScreenProps): React.JSX.Element {
  const { spacing } = useTheme();
  const services = useServices();
  const [phase, setPhase] = useState<LearnPhase>({ kind: 'loading' });
  // Bump to remount card content on each advance so the view resets cleanly.
  const cardKey = useRef(0);

  const loadBatch = useCallback(async () => {
    try {
      const session = await services.startQuiz.execute({
        tierId: asTierId(tierId),
        mode: 'learn',
        nowMs: Date.now(),
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      setPhase({ kind: 'card', index: 0, batch: session.words });
    } catch (error) {
      if (error instanceof NoWordsAvailableError) {
        setPhase({ kind: 'empty' });
        return;
      }
      // Fail safely: treat any load error as empty (offline-first).
      setPhase({ kind: 'empty' });
    }
  }, [services, tierId]);

  useEffect(() => {
    void loadBatch();
  }, [loadBatch]);

  const handleGotIt = useCallback(() => {
    if (phase.kind !== 'card') return;
    const next = phase.index + 1;
    if (next >= phase.batch.length) {
      // Final card: hand off to LearnQuickCheck (Screen 6).
      // Stub until Screen 6 is built: call onComplete directly.
      setPhase({ kind: 'quickcheck' });
      onComplete();
      return;
    }
    cardKey.current += 1;
    setPhase({ kind: 'card', index: next, batch: phase.batch });
  }, [phase, onComplete]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (phase.kind === 'loading') {
    return (
      <Screen scroll={false}>
        <Text variant="body" color="textSecondary">
          Loading new words…
        </Text>
      </Screen>
    );
  }

  // ── Empty (no new words) ───────────────────────────────────────────────────
  if (phase.kind === 'empty') {
    return (
      <Screen scroll={false}>
        <View style={{ gap: spacing.s4, flex: 1, justifyContent: 'center' }}>
          <Text variant="title" color="textPrimary" accessibilityRole="header">
            All caught up
          </Text>
          <Text variant="body" color="textSecondary">
            You're all caught up on new words.
          </Text>
          <Button label="Back to Home" variant="primary" fullWidth onPress={onExit} />
        </View>
      </Screen>
    );
  }

  // ── QuickCheck / Done (stubs) ─────────────────────────────────────────────
  // These phases transition immediately via onComplete; guard in case of
  // an unexpected re-render before the navigation commits.
  if (phase.kind === 'quickcheck' || phase.kind === 'done') {
    return (
      <Screen scroll={false}>
        <Button label="Back to Home" variant="primary" fullWidth onPress={onExit} />
      </Screen>
    );
  }

  // ── Card ──────────────────────────────────────────────────────────────────
  const { index, batch } = phase;
  const word = batch[index];
  if (word === undefined) {
    return (
      <Screen scroll={false}>
        <Button label="Back to Home" variant="primary" fullWidth onPress={onExit} />
      </Screen>
    );
  }

  const total = batch.length;
  const position = index + 1;
  const progress = position / total;

  // exampleSentence contains a "_" blank per spec; render the raw string as-is
  // (the LearnCard is presentation-only — no fill-in-the-blank on this screen).
  const exampleText = word.exampleSentence.trim().length > 0 ? word.exampleSentence : null;

  return (
    <Screen>
      {/* Header: back + progress + counter */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.s3,
        }}
      >
        <Button
          label="Back"
          variant="tertiary"
          onPress={onExit}
          accessibilityLabel="Back to Home"
        />
        <View style={{ flex: 1 }}>
          <ProgressBar progress={progress} label="Learn session progress" />
        </View>
        <Text
          variant="mono"
          color="textTertiary"
          tabularNums
          accessibilityLabel={`Card ${position} of ${total}`}
        >
          {`${position}/${total}`}
        </Text>
      </View>

      {/* Word card body */}
      <View
        key={`card-${cardKey.current}`}
        style={{ gap: spacing.s3 }}
        accessible
        accessibilityLabel={[
          word.word,
          word.pos != null ? `${word.pos}.` : null,
          word.definition,
          exampleText != null ? `Example: ${exampleText}` : null,
        ]
          .filter(Boolean)
          .join('. ')}
      >
        {/* Word + audio button row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s2 }}>
          <Text variant="display" color="textPrimary" style={{ fontWeight: '700', flex: 1 }}>
            {word.word}
          </Text>
          {/* Audio button: only show when audioPath exists */}
          {word.audioPath != null && (
            <Button
              label="♪"
              variant="tertiary"
              accessibilityLabel="Play pronunciation"
              onPress={() => {
                // Audio stub: log until audio infrastructure is wired.
                // eslint-disable-next-line no-console
                console.log('[LearnCard] play audio:', word.audioPath);
              }}
            />
          )}
        </View>

        {/* Part of speech */}
        {word.pos != null && word.pos.trim().length > 0 && (
          <Text variant="caption" color="textTertiary">
            {word.pos}
          </Text>
        )}

        {/* Definition */}
        <Text variant="bodyLg" color="textSecondary">
          {word.definition}
        </Text>

        {/* Example sentence (nullable) */}
        {exampleText != null && (
          <Text
            variant="body"
            color="textSecondary"
            style={{ fontStyle: 'italic' }}
          >
            {`"${exampleText}"`}
          </Text>
        )}
      </View>

      {/* Got it CTA */}
      <Button
        label="Got it"
        variant="primary"
        fullWidth
        onPress={handleGotIt}
        accessibilityLabel="Got it"
        accessibilityHint={
          position < total
            ? `Advance to card ${position + 1} of ${total}`
            : 'Finish the learn batch'
        }
      />
    </Screen>
  );
}

// Silence unused-variable warning on BATCH_LIMIT (it documents the limit
// used by StartQuizUseCase.execute but is not passed directly here since
// the use case owns the limit value via FORGIVENESS.NEW_WORDS_PER_DAY).
void (BATCH_LIMIT as unknown);
