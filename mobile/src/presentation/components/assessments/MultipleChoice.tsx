import React, { useState } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import { useTheme } from '@/presentation/theme';
import { Text } from '@/presentation/components/Text';
import { Button } from '@/presentation/components/Button';
import {
  optionFeedback,
  type AnswerCallback,
  type AssessmentOption,
  type OptionFeedback,
} from '@/presentation/components/assessments/types';
import type { ColorTokens, Theme } from '@/presentation/theme';

// MultipleChoice (MVP). Tap one of 2-4 option cards, then submit. NO TextInput.
// Selected option gets an accent border; on submit, chosen-correct fills
// success.subtle with a check, chosen-incorrect fills caution.subtle with a
// gentle dash (never a red X) and the correct option highlights. Feedback uses
// color + icon + copy (three redundant channels). Presentational only.

export interface MultipleChoiceProps {
  prompt: string; // word under study (rendered in `display`)
  // The sentence/definition context (one-line). Optional.
  context?: string;
  options: readonly AssessmentOption[];
  correctValue: string;
  onAnswer: AnswerCallback;
  // Controlled-reveal seam: when true the widget shows feedback immediately
  // (e.g. for replay). Defaults to uncontrolled (select -> submit).
  revealed?: boolean;
}

// Icon glyphs are paired with copy + color so meaning is never color-only.
const FEEDBACK_ICON: Record<OptionFeedback, string> = {
  idle: '',
  selected: '',
  correct: '✓',
  incorrect: '–',
  reveal_correct: '✓',
};

function optionStyle(state: OptionFeedback, theme: Theme): ViewStyle {
  const { colors, radii, spacing, layout } = theme;
  const base: ViewStyle = {
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
  switch (state) {
    case 'selected':
      return { ...base, borderColor: colors.accent };
    case 'correct':
    case 'reveal_correct':
      return { ...base, borderColor: colors.success, backgroundColor: colors.successSubtle };
    case 'incorrect':
      return { ...base, borderColor: colors.caution, backgroundColor: colors.cautionSubtle };
    case 'idle':
    default:
      return base;
  }
}

function iconColor(state: OptionFeedback): keyof ColorTokens {
  if (state === 'incorrect') return 'caution';
  return 'success';
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
    onAnswer({ value: selected, assessmentType: 'multiple_choice' });
  }

  return (
    <View style={{ gap: spacing.s5 }}>
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
        {options.map((option) => {
          const state = optionFeedback({
            optionValue: option.value,
            selectedValue: selected,
            correctValue,
            revealed,
          });
          const icon = FEEDBACK_ICON[state];
          return (
            <Pressable
              key={option.id}
              accessibilityRole="button"
              accessibilityLabel={option.label}
              accessibilityState={{ selected: state === 'selected', disabled: revealed }}
              disabled={revealed}
              onPress={() => setSelected(option.value)}
              style={optionStyle(state, theme)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s2 }}>
                {icon !== '' && (
                  <Text variant="label" color={iconColor(state)} accessibilityElementsHidden>
                    {icon}
                  </Text>
                )}
                <Text variant="bodyLg" color="textPrimary" style={{ flexShrink: 1 }}>
                  {option.label}
                </Text>
              </View>
            </Pressable>
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
        >
          {selected === correctValue ? 'Nice — that’s right.' : 'Not quite — review and keep going.'}
        </Text>
      )}
    </View>
  );
}
