import React, { useCallback, useState } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '@/presentation/theme';
import { useMotion } from '@/presentation/theme/useMotion';
import { Text } from '@/presentation/components/Text';
import { Button } from '@/presentation/components/Button';
import { Icon, type IconName } from '@/presentation/components/Icon';
import { hapticsSelect, hapticsCorrect, hapticsCorrection } from '@/presentation/services/haptics';
import {
  optionFeedback,
  type AnswerCallback,
  type AssessmentOption,
  type OptionFeedback,
} from '@/presentation/components/assessments/types';
import type { ColorTokens, Theme } from '@/presentation/theme';

// MultipleChoice (MVP). Tap one of 2-4 option cards, then submit. NO TextInput.
// Selected option gets an accent border with spring animation; on submit,
// chosen-correct fills success.subtle with a check, chosen-incorrect fills
// caution.subtle with a gentle dash (never a red X) and the correct option
// highlights. Feedback uses color + icon + copy (three redundant channels).
// Haptics confirm selection, correct answer, and gentle correction.
// Presentational only.

export interface MultipleChoiceProps {
  prompt: string;
  context?: string;
  options: readonly AssessmentOption[];
  correctValue: string;
  onAnswer: AnswerCallback;
  revealed?: boolean;
}

const FEEDBACK_ICON: Record<OptionFeedback, IconName | null> = {
  idle: null,
  selected: null,
  correct: 'check',
  incorrect: 'minus',
  reveal_correct: 'check',
};

function baseOptionStyle(theme: Theme): ViewStyle {
  const { colors, radii, spacing, layout } = theme;
  return {
    minHeight: 56,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.bgSurface,
    paddingHorizontal: spacing.s4,
    paddingVertical: spacing.s3,
    justifyContent: 'center',
    minWidth: layout.minTouchTarget,
  };
}

function stateBackgroundColor(state: OptionFeedback, colors: Theme['colors']): string {
  switch (state) {
    case 'correct':
    case 'reveal_correct':
      return colors.successSubtle;
    case 'incorrect':
      return colors.cautionSubtle;
    default:
      return colors.bgSurface;
  }
}

function stateBorderColor(state: OptionFeedback, colors: Theme['colors']): string {
  switch (state) {
    case 'selected':
      return colors.accent;
    case 'correct':
    case 'reveal_correct':
      return colors.success;
    case 'incorrect':
      return colors.caution;
    default:
      return colors.borderSubtle;
  }
}

function iconColor(state: OptionFeedback): keyof ColorTokens {
  if (state === 'incorrect') return 'caution';
  return 'success';
}

// Per-card component so Reanimated hooks are called unconditionally per item.
interface OptionCardProps {
  option: AssessmentOption;
  index: number;
  state: OptionFeedback;
  theme: Theme;
  revealed: boolean;
  onSelect: (value: string) => void;
}

function OptionCard({ option, index, state, theme, revealed, onSelect }: OptionCardProps): React.JSX.Element {
  const { spacing } = theme;
  const { spring } = useMotion();

  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    if (revealed) return;
    scale.value = withSpring(0.97, spring('snap'));
  }, [revealed, scale, spring]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1.0, spring('snap'));
  }, [scale, spring]);

  const handlePress = useCallback(() => {
    if (revealed) return;
    hapticsSelect();
    onSelect(option.value);
  }, [revealed, option.value, onSelect]);

  const bg = stateBackgroundColor(state, theme.colors);
  const border = stateBorderColor(state, theme.colors);
  const base = baseOptionStyle(theme);
  const icon = FEEDBACK_ICON[state];

  return (
    <Pressable
      testID={`quiz-option-${index}`}
      accessibilityRole="radio"
      accessibilityLabel={option.label}
      accessibilityHint={revealed ? undefined : 'Double tap to select this answer'}
      accessibilityState={{ selected: state === 'selected' || state === 'correct' || state === 'reveal_correct', disabled: revealed }}
      disabled={revealed}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
    >
      <Animated.View
        style={[
          base,
          animatedStyle,
          { backgroundColor: bg, borderColor: border },
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s2 }}>
          {icon !== null && (
            <Icon name={icon} size={18} color={iconColor(state)} />
          )}
          <Text variant="bodyLg" color="textPrimary" style={{ flexShrink: 1 }}>
            {option.label}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

export function MultipleChoice({
  prompt,
  context,
  options,
  correctValue,
  onAnswer,
  revealed: revealedProp,
}: MultipleChoiceProps): React.JSX.Element {
  const theme = useTheme();
  const { spacing } = theme;
  const [selected, setSelected] = useState<string | null>(null);
  const [internalRevealed, setInternalRevealed] = useState(false);
  const revealed = revealedProp ?? internalRevealed;

  function handleSubmit(): void {
    if (selected === null || revealed) return;
    setInternalRevealed(true);
    if (selected === correctValue) {
      hapticsCorrect();
    } else {
      hapticsCorrection();
    }
    onAnswer({ value: selected, assessmentType: 'multiple_choice' });
  }

  return (
    <View
      style={{ gap: spacing.s5 }}
      accessibilityRole="radiogroup"
      accessibilityLabel={`Question: ${prompt}`}
    >
      <View style={{ gap: spacing.s2 }}>
        <Text variant="display" color="textPrimary" accessibilityRole="header">
          {prompt}
        </Text>
        {context !== undefined && (
          <Text variant="bodyLg" color="textSecondary">
            {context}
          </Text>
        )}
      </View>

      <View style={{ gap: spacing.s3 }}>
        {options.map((option, index) => {
          const state = optionFeedback({
            optionValue: option.value,
            selectedValue: selected,
            correctValue,
            revealed,
          });
          return (
            <OptionCard
              key={option.id}
              option={option}
              index={index}
              state={state}
              theme={theme}
              revealed={revealed}
              onSelect={setSelected}
            />
          );
        })}
      </View>

      {!revealed && (
        <Button
          label="Submit"
          variant="primary"
          fullWidth
          disabled={selected === null}
          onPress={handleSubmit}
        />
      )}
      {revealed && (
        <Text
          variant="body"
          color={selected === correctValue ? 'success' : 'caution'}
          accessibilityLiveRegion="polite"
        >
          {selected === correctValue ? 'Nice — that\u2019s right.' : 'Not quite \u2014 review and keep going.'}
        </Text>
      )}
    </View>
  );
}

