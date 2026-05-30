import React, { useState } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/presentation/theme';
import { Text } from '@/presentation/components/Text';
import { Button } from '@/presentation/components/Button';
import { hapticsSelect, hapticsCorrect, hapticsCorrection } from '@/presentation/services/haptics';
import {
  optionFeedback,
  type AnswerCallback,
  type OptionFeedback,
} from '@/presentation/components/assessments/types';
import type { Theme } from '@/presentation/theme';

// ImageMatch (Phase 4). Grid of contextual images matched to a word/definition.
// Tap the image that matches the prompt, then submit. Images are functional
// context, never decorative. NO TextInput. Presentational only.

export interface ImageOption {
  id: string;
  value: string;
  // Accessible description of the image (alt text) — required for a11y.
  label: string;
  imageUri: string;
}

export interface ImageMatchProps {
  prompt: string;
  options: readonly ImageOption[];
  correctValue: string;
  onAnswer: AnswerCallback;
  revealed?: boolean;
}

function tileStyle(state: OptionFeedback, theme: Theme): ViewStyle {
  const { colors, radii } = theme;
  const base: ViewStyle = {
    flexBasis: '48%',
    aspectRatio: 1,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
  };
  switch (state) {
    case 'selected':
      return { ...base, borderColor: colors.accent };
    case 'correct':
    case 'reveal_correct':
      return { ...base, borderColor: colors.success };
    case 'incorrect':
      return { ...base, borderColor: colors.caution };
    default:
      return base;
  }
}

export function ImageMatch({
  prompt,
  options,
  correctValue,
  onAnswer,
  revealed: revealedProp,
}: ImageMatchProps): React.JSX.Element {
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
    onAnswer({ value: selected, assessmentType: 'image_match' });
  }

  return (
    <View style={{ gap: spacing.s5 }}>
      <Text variant="display" color="textPrimary" accessibilityRole="header">
        {prompt}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.s3 }}>
        {options.map((option) => {
          const state = optionFeedback({
            optionValue: option.value,
            selectedValue: selected,
            correctValue,
            revealed,
          });
          return (
            <Pressable
              key={option.id}
              accessibilityRole="imagebutton"
              accessibilityLabel={option.label}
              accessibilityState={{ selected: state === 'selected', disabled: revealed }}
              disabled={revealed}
              onPress={() => {
                hapticsSelect();
                setSelected(option.value);
              }}
              style={tileStyle(state, theme)}
            >
              <Image
                source={{ uri: option.imageUri }}
                accessibilityLabel={option.label}
                contentFit="cover"
                transition={150}
                style={{ width: '100%', height: '100%' }}
              />
            </Pressable>
          );
        })}
      </View>
      {!revealed && (
        <Button label="Submit" variant="primary" fullWidth disabled={selected === null} onPress={handleSubmit} />
      )}
      {revealed && (
        <Text
          variant="body"
          color={selected === correctValue ? 'success' : 'caution'}
          accessibilityLiveRegion="polite"
        >
          {selected === correctValue ? 'Nice \u2014 that\u2019s the one.' : 'Not quite \u2014 review and keep going.'}
        </Text>
      )}
    </View>
  );
}
