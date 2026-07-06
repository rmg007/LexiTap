import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, findNodeHandle, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Screen } from '@/presentation/screens/Screen';
import { useTheme } from '@/presentation/theme';
import { useMotion } from '@/presentation/theme/useMotion';
import { usePressScale } from '@/presentation/hooks/usePressScale';
import { Text, Button, ProgressBar, Icon, Card, EmptyState } from '@/presentation/components';
import { ExitSessionSheet } from '@/presentation/screens/ExitSessionSheet';
import { useServices, type DailyProgressMetrics } from '@/presentation/services';
import { asTierId, asWordId, NoWordsAvailableError } from '@/domain/index';
import type { Word, WordSense } from '@/domain/vocabulary/Word';

// LearnCard — pressure-free first exposure to new words (Screen 5), realigned
// to a premium-reader treatment (DESIGN_LEVELUP_PLAN.md Phase 3.1): a two-tier
// header (full-bleed progress line + a compact close/nav/bookmark row),
// examples as sunken-well citations with the target word bolded, a Playfair
// h1 word treatment, multi-sense meaning cards, and a cross-fade between
// words instead of an abrupt remount.
//
// Rich detail (Rich Word-Detail Plan, Phase 4): for the displayed word we
// lazily fetch its felt-explanation senses via queries.getWordDetail(id) and
// render them — numbered when a word has >1 distinct meaning, mirroring the
// Figma multi-sense layout (page 07 · Word Detail). Words with no rich data
// (the un-backfilled tail, or a content DB predating the senses tables) fall
// back to the flat definition/exampleSentence — they must never look broken.
//
// Hard invariants (MISSING_SCREENS_PLAN.md / LearnCard.md):
//   - NO assessment widget, NO TextInput anywhere on this screen.
//   - NO SRS write here — SRS seeding happens only in LearnQuickCheck (Screen 6).
//   - Nullable fields (phonetic, example, image, audio) are omitted when absent;
//     no empty labels are ever shown.
//   - Audio button rendered only when word.audioPath exists.
//   - Per-sense image is data-only for now (no dynamic-require asset map yet),
//     matching the flat layout which also omits word.imagePath. The Figma shows
//     a placeholder; rendering is deferred to when the vocab-image map lands.

export interface LearnCardScreenProps {
  tierId: string;
  onExit: () => void; // back to Home
  // Called with the just-learned batch so the route can hand off to the
  // LearnQuickCheck screen (Screen 6) — the SRS seeding step.
  onComplete: (batch: Word[]) => void;
  // Resume (SESSION_RESUME_PLAN): when provided, rehydrate this exact batch at
  // this card index instead of fetching a fresh batch. Absent = fresh session.
  resumeBatch?: Word[];
  resumeIndex?: number;
}

type LearnPhase =
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'card'; index: number; batch: Word[] };

const BATCH_LIMIT = 10;

// ~66ch reading measure for the felt explanation (RN has no `ch` unit — this
// approximates it at the `body` variant's ~15px Inter average glyph width).
const EXPLANATION_MAX_WIDTH = 520;

// Bolds the first case-insensitive occurrence of `targetWord` within `text`.
// Falls back to the plain sentence (no bolding) when the exact base form
// isn't found — e.g. an inflected form ("arrived" vs "arrive") — never throws.
function renderExampleWithBoldTarget(text: string, targetWord: string): React.ReactNode {
  const idx = text.toLowerCase().indexOf(targetWord.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <Text variant="body" color="textSecondary" style={{ fontWeight: '700' }}>
        {text.slice(idx, idx + targetWord.length)}
      </Text>
      {text.slice(idx + targetWord.length)}
    </>
  );
}

export function LearnCardScreen({
  tierId,
  onExit,
  onComplete,
  resumeBatch,
  resumeIndex,
}: LearnCardScreenProps): React.JSX.Element {
  const { colors, spacing, radii, layout } = useTheme();
  const { timing } = useMotion();
  const services = useServices();
  const [phase, setPhase] = useState<LearnPhase>({ kind: 'loading' });
  // Whether the word currently on screen is saved (drives the bookmark toggle).
  const [isSaved, setIsSaved] = useState(false);
  // Exit confirm sheet (SESSION_RESUME_PLAN Part A) — reassures the learner that
  // leaving is safe/resumable rather than a silent loss.
  const [showExit, setShowExit] = useState(false);
  // Lazily-loaded rich senses, cached by word id. Missing key = not yet
  // fetched; [] = fetched, no rich data (flat fallback). The fetch is
  // fail-soft (getWordDetail never throws) so a content DB predating the
  // senses tables just yields [] and the flat layout shows.
  const [sensesByWordId, setSensesByWordId] = useState<Record<string, WordSense[]>>({});
  // Distinguishes "hit today's new-word budget" (temporary) from "the tier's
  // content is genuinely exhausted" (rare) once the empty phase is reached.
  const [emptyDailyProgress, setEmptyDailyProgress] = useState<DailyProgressMetrics | null>(null);

  const cardBodyRef = useRef<View>(null);
  const bookmarkPress = usePressScale({ pressedScale: 0.88 });

  const loadBatch = useCallback(async () => {
    // Resume path: rehydrate the exact batch/index from the snapshot — no fetch.
    if (resumeBatch !== undefined && resumeBatch.length > 0) {
      const idx = Math.min(Math.max(0, resumeIndex ?? 0), resumeBatch.length - 1);
      setPhase({ kind: 'card', index: idx, batch: resumeBatch });
      return;
    }
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
  }, [services, tierId, resumeBatch, resumeIndex]);

  useEffect(() => {
    void loadBatch();
  }, [loadBatch]);

  // On reaching the empty phase, read today's new-word budget so the copy can
  // distinguish "come back tomorrow" from the rare genuinely-exhausted case.
  useEffect(() => {
    if (phase.kind !== 'empty') return;
    let cancelled = false;
    void services.queries
      .getDailyProgress(asTierId(tierId))
      .then((p) => {
        if (!cancelled) setEmptyDailyProgress(p);
      })
      .catch(() => {
        if (!cancelled) setEmptyDailyProgress(null);
      });
    return () => {
      cancelled = true;
    };
  }, [phase.kind, services, tierId]);

  // Lazily fetch the rich senses for the card currently on screen. One
  // fail-soft call per word, cached so re-renders / back-and-forth don't refetch.
  const currentWordId = phase.kind === 'card' ? phase.batch[phase.index]?.id : undefined;
  useEffect(() => {
    if (currentWordId === undefined) return;
    if (sensesByWordId[currentWordId] !== undefined) return;
    let cancelled = false;
    void (async () => {
      const detail = await services.queries.getWordDetail(currentWordId);
      if (cancelled) return;
      setSensesByWordId((prev) =>
        prev[currentWordId] !== undefined
          ? prev
          : { ...prev, [currentWordId]: detail?.senses ?? [] },
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [currentWordId, sensesByWordId, services]);

  // Persist the resume snapshot for the card on screen (SESSION_RESUME_PLAN). One
  // fail-soft write per card; a failure must never block the learn flow. Fires
  // identically whether index just advanced or went back — the snapshot is
  // just "whatever the learner is looking at now", not forward-only.
  const snapshotIndex = phase.kind === 'card' ? phase.index : undefined;
  const snapshotBatch = phase.kind === 'card' ? phase.batch : undefined;
  useEffect(() => {
    if (snapshotBatch === undefined || snapshotIndex === undefined) return;
    void services.queries.saveActiveSession({
      kind: 'learn',
      tierId,
      batch: snapshotBatch,
      stage: 'card',
      index: snapshotIndex,
    });
  }, [snapshotBatch, snapshotIndex, tierId, services]);

  // Hydrate the bookmark toggle for the word on screen (fail-soft, default off).
  useEffect(() => {
    if (currentWordId === undefined) return;
    let cancelled = false;
    setIsSaved(false);
    void services.queries
      .isWordSaved(asWordId(currentWordId))
      .then((v) => {
        if (!cancelled) setIsSaved(v);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [currentWordId, services]);

  // Move screen-reader focus to the new word each time it swaps in — without
  // this, VoiceOver/TalkBack silently stays on the old (now-gone) card body.
  useEffect(() => {
    if (currentWordId === undefined) return;
    const tag = findNodeHandle(cardBodyRef.current);
    if (tag != null) {
      AccessibilityInfo.setAccessibilityFocus(tag);
    }
  }, [currentWordId]);

  // Toggle save for the current word — optimistic, fail-soft.
  const handleToggleSave = useCallback(() => {
    if (phase.kind !== 'card') return;
    const word = phase.batch[phase.index];
    if (word === undefined) return;
    const next = !isSaved;
    setIsSaved(next);
    void (next
      ? services.queries.saveWord(word.id, 'learn')
      : services.queries.unsaveWord(word.id)
    ).catch(() => setIsSaved(!next));
  }, [phase, isSaved, services]);

  const handleGotIt = useCallback(() => {
    if (phase.kind !== 'card') return;
    const next = phase.index + 1;
    if (next >= phase.batch.length) {
      // Final card: hand the batch to the route, which pushes LearnQuickCheck
      // (Screen 6) — the only place the learn flow writes SRS.
      onComplete(phase.batch);
      return;
    }
    setPhase({ kind: 'card', index: next, batch: phase.batch });
  }, [phase, onComplete]);

  const handlePrevious = useCallback(() => {
    if (phase.kind !== 'card') return;
    if (phase.index <= 0) return;
    setPhase({ kind: 'card', index: phase.index - 1, batch: phase.batch });
  }, [phase]);

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
    const budgetReached =
      emptyDailyProgress != null &&
      emptyDailyProgress.newWordsCompletedToday >= emptyDailyProgress.newWordsBudget;

    return (
      <Screen scroll={false} contentStyle={{ flex: 1, justifyContent: 'center' }}>
        <EmptyState
          icon="check"
          iconColor="success"
          headline={budgetReached ? "You've hit today's new-word limit" : "You're all caught up"}
          body={
            budgetReached
              ? 'Come back tomorrow for more new words.'
              : "You're all caught up on new words."
          }
        />
        <View style={{ gap: spacing.s3 }}>
          <Button label="Back to Home" variant="primary" fullWidth onPress={onExit} />
          <Button
            label="See your progress"
            variant="tertiary"
            fullWidth
            onPress={() => router.push('/(tabs)/progress')}
          />
        </View>
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

  // Rich senses for this word (undefined = still loading → render flat until
  // they arrive; [] = no rich data → permanent flat fallback).
  const senses = sensesByWordId[word.id] ?? [];
  const hasSenses = senses.length > 0;
  const multiSense = senses.length > 1;

  // Screen-reader label: prefer the felt senses when present, else flat fields.
  const accessibilityLabel = hasSenses
    ? [
        word.word,
        ...senses.map((s, i) =>
          [
            multiSense ? `Meaning ${i + 1}${s.pos != null ? `, ${s.pos}` : ''}` : s.pos,
            s.shortGloss,
            s.explanation,
            ...s.examples.map((e) => `Example: ${e.text}`),
          ]
            .filter(Boolean)
            .join('. '),
        ),
      ]
        .filter(Boolean)
        .join('. ')
    : [
        word.word,
        word.pos != null ? `${word.pos}.` : null,
        word.definition,
        exampleText != null ? `Example: ${exampleText}` : null,
      ]
        .filter(Boolean)
        .join('. ');

  const targetWord = word.word;
  function exampleCard(text: string, key: React.Key): React.JSX.Element {
    return (
      <View
        key={key}
        style={{
          backgroundColor: colors.bgSurfaceSunken,
          borderRadius: radii.sm,
          borderLeftWidth: 2,
          borderLeftColor: colors.accent,
          padding: spacing.s3,
        }}
      >
        <Text variant="body" color="textSecondary">
          {renderExampleWithBoldTarget(text, targetWord)}
        </Text>
      </View>
    );
  }

  return (
    <Screen
      footer={
        <Button
          label="Next"
          variant="primary"
          fullWidth
          testID="learn-card-next"
          onPress={handleGotIt}
          accessibilityLabel="Next"
          accessibilityHint={
            position < total
              ? `Advance to card ${position + 1} of ${total}`
              : 'Finish the learn batch'
          }
        />
      }
    >
      {/* Tier 1: full-bleed thin progress line. */}
      <View style={{ marginHorizontal: -layout.screenGutter }}>
        <ProgressBar progress={progress} label="Learn session progress" height={4} />
      </View>

      {/* Tier 2: compact close / word-nav / counter / bookmark row. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Leave session"
          onPress={() => setShowExit(true)}
          hitSlop={8}
          style={{ padding: spacing.s2, minWidth: layout.minTouchTarget, alignItems: 'flex-start' }}
        >
          <Icon name="x" size={20} colorValue={colors.textSecondary} />
        </Pressable>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s2 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous word"
            accessibilityState={{ disabled: index === 0 }}
            disabled={index === 0}
            onPress={handlePrevious}
            hitSlop={8}
            style={{ padding: spacing.s1, opacity: index === 0 ? 0.3 : 1 }}
          >
            <Icon name="chevron-left" size={18} colorValue={colors.textTertiary} />
          </Pressable>
          <Text
            variant="mono"
            color="textTertiary"
            tabularNums
            accessibilityLabel={`Card ${position} of ${total}`}
          >
            {`${position}/${total}`}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next word"
            accessibilityState={{ disabled: position >= total }}
            disabled={position >= total}
            onPress={handleGotIt}
            hitSlop={8}
            style={{ padding: spacing.s1, opacity: position >= total ? 0.3 : 1 }}
          >
            <Icon name="chevron-right" size={18} colorValue={colors.textTertiary} />
          </Pressable>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isSaved ? `Remove ${word.word} from saved` : `Save ${word.word} for later`}
          onPress={handleToggleSave}
          onPressIn={bookmarkPress.onPressIn}
          onPressOut={bookmarkPress.onPressOut}
          hitSlop={8}
          style={{ padding: spacing.s2, minWidth: layout.minTouchTarget, alignItems: 'flex-end' }}
        >
          <Animated.View style={bookmarkPress.animatedStyle}>
            <Icon
              name={isSaved ? 'bookmark-check' : 'bookmark'}
              size={22}
              colorValue={isSaved ? colors.accent : colors.textTertiary}
            />
          </Animated.View>
        </Pressable>
      </View>

      {/* Word card body — cross-fades between words (key = word.id). */}
      <Animated.View
        key={word.id}
        entering={FadeIn.duration(timing('base').duration ?? 0)}
        exiting={FadeOut.duration(timing('fast').duration ?? 0)}
        style={{ gap: spacing.s3 }}
      >
        <View ref={cardBodyRef} style={{ gap: spacing.s3 }} accessible accessibilityLabel={accessibilityLabel}>
          {/* Word + audio button row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s2 }}>
            <Text variant="h1" color="textPrimary" style={{ flex: 1 }}>
              {word.word}
            </Text>
            {/* Audio button: only show when audioPath exists */}
            {word.audioPath != null && (
              <Button
                label="Listen"
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

          {hasSenses ? (
            // ── Rich multi-sense layout (mirrors Figma page 07 · Word Detail) ──
            <View style={{ gap: spacing.s3 }}>
              {senses.map((sense, i) => {
                const body = (
                  <View style={{ gap: spacing.s2 }}>
                    {/* "MEANING n · POS" — number only when the word has >1 sense */}
                    {multiSense ? (
                      <Text variant="smallCaps" color="textTertiary">
                        {`MEANING ${i + 1}${sense.pos != null && sense.pos.trim().length > 0 ? ` · ${sense.pos}` : ''}`}
                      </Text>
                    ) : (
                      sense.pos != null &&
                      sense.pos.trim().length > 0 && (
                        <Text variant="caption" color="textTertiary">
                          {sense.pos}
                        </Text>
                      )
                    )}

                    {/* Dictionary one-liner */}
                    <Text variant="bodyLg" color="textSecondary">
                      {sense.shortGloss}
                    </Text>

                    {/* Felt explanation — the teaching text, still the star. */}
                    <Text
                      variant="body"
                      color="textPrimary"
                      style={{ marginTop: spacing.s3, maxWidth: EXPLANATION_MAX_WIDTH }}
                    >
                      {sense.explanation}
                    </Text>

                    {/* Teaching examples as sunken-well citations (full sentences, no blank) */}
                    {sense.examples.length > 0 && (
                      <View style={{ gap: spacing.s2, marginTop: spacing.s1 }}>
                        <Text variant="smallCaps" color="textTertiary">
                          EXAMPLES
                        </Text>
                        {sense.examples.map((ex) => exampleCard(ex.text, ex.exampleIndex))}
                      </View>
                    )}
                  </View>
                );

                // Multiple meanings each get their own Card; a single sense
                // stays flat (matches the Word Detail spec).
                return multiSense ? (
                  <Card key={sense.senseIndex}>{body}</Card>
                ) : (
                  <React.Fragment key={sense.senseIndex}>{body}</React.Fragment>
                );
              })}
            </View>
          ) : (
            // ── Flat fallback (un-backfilled words / pre-rich content DB) ──
            <View style={{ gap: spacing.s3 }}>
              {word.pos != null && word.pos.trim().length > 0 && (
                <Text variant="caption" color="textTertiary">
                  {word.pos}
                </Text>
              )}

              <Text variant="bodyLg" color="textSecondary">
                {word.definition}
              </Text>

              {exampleText != null && exampleCard(exampleText, 'flat-example')}
            </View>
          )}
        </View>
      </Animated.View>

      <ExitSessionSheet
        visible={showExit}
        onKeepGoing={() => setShowExit(false)}
        onLeave={() => {
          // Snapshot is intentionally preserved so Home can offer "Resume".
          setShowExit(false);
          onExit();
        }}
      />
    </Screen>
  );
}

// Silence unused-variable warning on BATCH_LIMIT (it documents the limit
// used by StartQuizUseCase.execute but is not passed directly here since
// the use case owns the limit value via FORGIVENESS.NEW_WORDS_PER_DAY).
void (BATCH_LIMIT as unknown);
