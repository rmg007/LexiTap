import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/presentation/theme';
import { Text, Button, Icon } from '@/presentation/components';

// Feedback layer shown after answer submission — slides up from frame bottom.
// Two states: Correct (success row + affirm copy) and Gentle Correction
// (chosen row in caution, correct row in success, teaching copy).
//
// Rules (locked — QuizFeedbackStates.md):
//   • NO red anywhere — caution/amber only for wrong answers.
//   • No error haptic on incorrect; soft success haptic on correct only
//     (caller's responsibility — this component is display-only).
//   • Three redundant channels: color + icon + copy (never color-only).
//   • Continue ≥ 48pt, focused on mount.

// ─── Copy banks ───────────────────────────────────────────────────────────────
// Selection: bank[Math.floor(Math.random() * bank.length)] per spec §8.1.
// Exported for unit tests — do not import in domain (presentation-only).

export const AFFIRM_BANK = ['Nice!', 'Got it.', 'Exactly.', "That's right.", 'Correct.'] as const;

export const CORRECTION_BANK = [
  'Almost.',
  'Not quite — here it is.',
  'Review this one.',
  'Take another look.',
] as const;

export function pickRandom<T>(bank: readonly T[]): T {
  return bank[Math.floor(Math.random() * bank.length)] as T;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FeedbackLayerProps {
  wasCorrect: boolean;
  chosenValue: string;
  correctValue: string;
  /** Short word definition — drives teaching copy in correction state. */
  gloss: string;
  onContinue: () => void;
  // ── Optional secondary controls (WORD_FEEDBACK_PLAN). All optional so existing
  //    callers/tests are unaffected. Continue always stays the only primary. ──
  /** The word being answered — labels the Save/Easy controls for a11y. */
  wordLabel?: string;
  /** Whether the current word is already saved (drives the Save toggle). */
  isSaved?: boolean;
  /** Provide to render a "Save this word" toggle beside Continue (both states). */
  onToggleSave?: () => void;
  /** Provide to render a "Too easy — skip ahead" control (CORRECT state only). */
  onMarkEasy?: () => void;
  /** Whether "too easy" was already tapped this reveal (disables the control). */
  easeSelected?: boolean;
}

// ─── Answer row ───────────────────────────────────────────────────────────────

interface AnswerRowProps {
  icon: 'check' | 'dash';
  value: string;
  accessibilityLabel: string;
  bgColor: string;
  textColor: string;
}

function AnswerRow({
  icon,
  value,
  accessibilityLabel,
  bgColor,
  textColor,
}: AnswerRowProps): React.JSX.Element {
  const { spacing, radii } = useTheme();

  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: bgColor,
        borderRadius: radii.sm,
        paddingHorizontal: spacing.s4,
        paddingVertical: spacing.s3,
        gap: spacing.s3,
      }}
    >
      <Icon name={icon === 'check' ? 'check' : 'minus'} size={20} colorValue={textColor} />
      <Text variant="body" style={{ color: textColor, flex: 1 }}>
        {value}
      </Text>
    </View>
  );
}

// ─── FeedbackLayer ────────────────────────────────────────────────────────────

export function FeedbackLayer({
  wasCorrect,
  chosenValue,
  correctValue,
  gloss,
  onContinue,
  wordLabel,
  isSaved,
  onToggleSave,
  onMarkEasy,
  easeSelected,
}: FeedbackLayerProps): React.JSX.Element {
  const { colors, spacing, radii, motion } = useTheme();
  const reduceMotion = useReducedMotion();

  // Optional Save toggle — rendered in BOTH states, above the single-primary
  // Continue. Absent unless the host wires onToggleSave.
  const saveControl =
    onToggleSave === undefined ? null : (
      <Button
        label={isSaved === true ? 'Saved' : 'Save this word'}
        variant="tertiary"
        fullWidth
        onPress={onToggleSave}
        accessibilityLabel={
          isSaved === true
            ? `Remove ${wordLabel ?? 'word'} from saved`
            : `Save ${wordLabel ?? 'word'} for later`
        }
      />
    );

  // Optional "Too easy" accelerator — CORRECT state only, above Continue.
  const easeControl =
    onMarkEasy === undefined ? null : (
      <Button
        label={easeSelected === true ? 'Skipping ahead' : 'Too easy — skip ahead'}
        variant="tertiary"
        fullWidth
        disabled={easeSelected === true}
        onPress={onMarkEasy}
        accessibilityLabel="Mark this word too easy and skip ahead"
      />
    );

  // Stable copy — pick once on mount, not on every render.
  const affirm = useRef(pickRandom(AFFIRM_BANK)).current;
  const correctionLead = useRef(pickRandom(CORRECTION_BANK)).current;

  // Slide-up animation. Starts below frame, animates to 0 on mount.
  // Reduce Motion: cross-fade instead (translateY stays at 0, only opacity animates).
  const translateY = useSharedValue(reduceMotion ? 0 : 120);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: motion.base });
    if (!reduceMotion) {
      translateY.value = withTiming(0, { duration: motion.base });
    }
    // Animation runs once on mount. reduceMotion/motion.base are stable constants.
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  // Focus Continue button after reveal for screen-reader users.
  const continueRef = useRef<View>(null);
  useEffect(() => {
    const delay = motion.base + 50;
    const timer = setTimeout(() => {
      if (continueRef.current) {
        AccessibilityInfo.setAccessibilityFocus(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (continueRef.current as any)._nativeTag as number,
        );
      }
    }, delay);
    return () => clearTimeout(timer);
    // Focus runs once on mount. motion.base is a stable theme constant.
  }, []);

  return (
    <Animated.View
      style={[
        animatedStyle,
        {
          backgroundColor: colors.bgSurface,
          borderTopLeftRadius: radii.lg,
          borderTopRightRadius: radii.lg,
          paddingHorizontal: spacing.s4,
          paddingTop: spacing.s5,
          paddingBottom: spacing.s6,
          gap: spacing.s3,
          // Elevation above quiz content.
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.12,
          shadowRadius: 8,
          elevation: 8,
        },
      ]}
    >
      {wasCorrect ? (
        // ── Correct state ─────────────────────────────────────────────────────
        <>
          <AnswerRow
            icon="check"
            value={chosenValue}
            accessibilityLabel={`Correct — ${chosenValue}`}
            bgColor={colors.successSubtle}
            textColor={colors.success}
          />

          <Text variant="headline" color="textPrimary" accessibilityRole="text">
            {affirm}
          </Text>

          {easeControl}
          {saveControl}

          <View ref={continueRef}>
            <Button
              label="Continue"
              variant="primary"
              fullWidth
              onPress={onContinue}
              accessibilityLabel="Continue to next word"
            />
          </View>
        </>
      ) : (
        // ── Gentle correction state ───────────────────────────────────────────
        <>
          <AnswerRow
            icon="dash"
            value={chosenValue}
            accessibilityLabel={`Your answer — ${chosenValue}`}
            bgColor={colors.cautionSubtle}
            textColor={colors.caution}
          />

          <AnswerRow
            icon="check"
            value={correctValue}
            accessibilityLabel={`Correct answer — ${correctValue}`}
            bgColor={colors.successSubtle}
            textColor={colors.success}
          />

          <Text variant="body" color="textSecondary" accessibilityRole="text">
            {correctionLead}
          </Text>

          <Text variant="body" color="textSecondary" accessibilityRole="text">
            {`Close — this one means "${gloss}". You'll see it again soon.`}
          </Text>

          {/* No "too easy" on a miss — only Save. */}
          {saveControl}

          <View ref={continueRef}>
            <Button
              label="Continue"
              variant="primary"
              fullWidth
              onPress={onContinue}
              accessibilityLabel="Continue to next word"
            />
          </View>
        </>
      )}
    </Animated.View>
  );
}
