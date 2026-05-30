import React, { useCallback, useState } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useTheme } from '@/presentation/theme';
import { useMotion } from '@/presentation/theme/useMotion';
import { Text } from '@/presentation/components/Text';
import { Button } from '@/presentation/components/Button';
import { hapticsSelect, hapticsCorrect, hapticsCorrection } from '@/presentation/services/haptics';
import {
  isAnswerCorrect,
  type AnswerCallback,
  type AssessmentOption,
} from '@/presentation/components/assessments/types';
import type { Theme } from '@/presentation/theme';

// DragDrop (MVP). A sentence with a blank ("_") and a row of word chips; the
// learner places a chip into the blank, then submits. NO TextInput — placement
// is by tap (a real pan-gesture drag would need a gesture lib we are not adding;
// the tap-to-place model preserves the no-keyboard invariant and the same
// drop-zone visuals). Chips are radius.full on bg.surface.raised; the drop zone
// is bg.surface.sunken with a dashed border that highlights accent when filled.
// Presentational only.

export interface DragDropProps {
  // Sentence containing exactly one "_" blank (Word.exampleSentence shape).
  sentence: string;
  options: readonly AssessmentOption[];
  correctValue: string;
  onAnswer: AnswerCallback;
  revealed?: boolean;
}

/**
 * Split a sentence on its single "_" blank into [before, after]. Pure; exported
 * for testing. If there is no blank, the whole sentence is "before".
 */
export function splitSentence(sentence: string): { before: string; after: string } {
  const idx = sentence.indexOf('_');
  if (idx === -1) return { before: sentence, after: '' };
  return { before: sentence.slice(0, idx), after: sentence.slice(idx + 1) };
}

function dropZoneStyle(theme: Theme, filled: boolean, revealed: boolean, correct: boolean): ViewStyle {
  const { colors, radii, spacing } = theme;
  let borderColor = colors.borderSubtle;
  let backgroundColor = colors.bgSurfaceSunken;
  if (revealed) {
    borderColor = correct ? colors.success : colors.caution;
    backgroundColor = correct ? colors.successSubtle : colors.cautionSubtle;
  } else if (filled) {
    borderColor = colors.accent;
  }
  return {
    minHeight: 40,
    minWidth: 72,
    borderRadius: radii.full,
    borderWidth: 1,
    borderStyle: revealed ? 'solid' : 'dashed',
    borderColor,
    backgroundColor,
    paddingHorizontal: spacing.s3,
    paddingVertical: spacing.s1,
    alignItems: 'center',
    justifyContent: 'center',
  };
}

function chipStyle(theme: Theme, selected: boolean, disabled: boolean): ViewStyle {
  const { colors, radii, spacing, layout } = theme;
  return {
    minHeight: layout.minTouchTarget,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: selected ? colors.accent : colors.borderSubtle,
    backgroundColor: colors.bgSurfaceRaised,
    paddingHorizontal: spacing.s4,
    paddingVertical: spacing.s2,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: disabled && !selected ? 0.5 : 1,
  };
}

// Per-chip component so Reanimated hooks are called unconditionally per item.
interface ChipProps {
  option: AssessmentOption;
  selected: boolean;
  disabled: boolean;
  otherPlaced: boolean;
  theme: Theme;
  onPress: (option: AssessmentOption) => void;
}

function Chip({ option, selected, disabled, otherPlaced, theme, onPress }: ChipProps): React.JSX.Element {
  const { spring } = useMotion();

  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
  }));

  const handlePressIn = useCallback(() => {
    if (disabled) return;
    // Chip lifts: scale up + float up slightly (3pt)
    scale.value = withSpring(1.04, spring('snap'));
    translateY.value = withSpring(-3, spring('snap'));
    hapticsSelect();
  }, [disabled, scale, translateY, spring]);

  const handlePressOut = useCallback(() => {
    // Settle back down with physical feel
    scale.value = withSpring(1.0, spring('settle'));
    translateY.value = withSpring(0, spring('settle'));
  }, [scale, translateY, spring]);

  const handlePress = useCallback(() => {
    if (disabled) return;
    onPress(option);
  }, [disabled, option, onPress]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={selected ? `Remove ${option.label} from blank` : `Place ${option.label} in blank`}
      accessibilityHint="Double tap to place this word"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
    >
      <Animated.View style={[chipStyle(theme, selected, otherPlaced), animatedStyle]}>
        <Text variant="label" color="textPrimary">
          {option.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export function DragDrop({
  sentence,
  options,
  correctValue,
  onAnswer,
  revealed: revealedProp,
}: DragDropProps): React.JSX.Element {
  const theme = useTheme();
  const { spacing } = theme;
  const [placed, setPlaced] = useState<AssessmentOption | null>(null);
  const [internalRevealed, setInternalRevealed] = useState(false);
  const revealed = revealedProp ?? internalRevealed;
  const { before, after } = splitSentence(sentence);
  const correct = isAnswerCorrect(placed?.value ?? null, correctValue);

  function handleSubmit(): void {
    if (placed === null || revealed) return;
    setInternalRevealed(true);
    const isCorrect = isAnswerCorrect(placed.value, correctValue);
    if (isCorrect) {
      hapticsCorrect();
    } else {
      hapticsCorrection();
    }
    onAnswer({ value: placed.value, assessmentType: 'drag_drop' });
  }

  const handleChipPress = useCallback((option: AssessmentOption) => {
    setPlaced((current) => (current?.id === option.id ? null : option));
  }, []);

  return (
    <View style={{ gap: spacing.s5 }}>
      {/* Sentence with the drop zone inline. */}
      <View
        style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.s1 }}
        accessibilityRole="text"
        accessibilityLabel={`${before} blank ${after}`.trim()}
      >
        <Text variant="bodyLg" color="textPrimary">
          {before}
        </Text>
        <View
          accessibilityRole="button"
          accessibilityLabel={placed ? `Blank filled with ${placed.label}` : 'Empty blank'}
          style={dropZoneStyle(theme, placed !== null, revealed, correct)}
        >
          <Text variant="label" color={placed ? 'accent' : 'textTertiary'}>
            {placed ? placed.label : '____'}
          </Text>
        </View>
        <Text variant="bodyLg" color="textPrimary">
          {after}
        </Text>
      </View>

      {/* Word chips. Tapping places into the blank (toggle off if re-tapped). */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s2 }}>
        {options.map((option) => {
          const selected = placed?.id === option.id;
          return (
            <Chip
              key={option.id}
              option={option}
              selected={selected}
              disabled={revealed}
              otherPlaced={placed !== null && !selected}
              theme={theme}
              onPress={handleChipPress}
            />
          );
        })}
      </View>

      {!revealed && (
        <Button
          label="Submit"
          variant="primary"
          fullWidth
          disabled={placed === null}
          onPress={handleSubmit}
        />
      )}
      {revealed && (
        <Text
          variant="body"
          color={correct ? 'success' : 'caution'}
          accessibilityLiveRegion="polite"
        >
          {correct ? 'Nice \u2014 that fits.' : 'Not quite \u2014 review and keep going.'}
        </Text>
      )}
    </View>
  );
}
