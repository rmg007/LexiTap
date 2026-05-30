import React, { useState } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import { useTheme } from '@/presentation/theme';
import { hapticsSelect, hapticsCorrect, hapticsCorrection } from '@/presentation/services/haptics';
import { Text } from '@/presentation/components/Text';
import { Button } from '@/presentation/components/Button';
import type { AnswerCallback } from '@/presentation/components/assessments/types';
import type { Theme } from '@/presentation/theme';

// Classification (Phase 4). Sort a word chip into one of 2-3 labeled buckets by
// tapping the bucket (no pan-gesture lib added; tap preserves the no-TextInput
// invariant). The emitted answer value is the chosen bucket id. Presentational.

export interface ClassificationBucket {
  id: string;
  label: string;
}

export interface ClassificationProps {
  // The word/chip being classified.
  prompt: string;
  buckets: readonly ClassificationBucket[];
  // The correct bucket id.
  correctValue: string;
  onAnswer: AnswerCallback;
  revealed?: boolean;
}

function bucketStyle(
  theme: Theme,
  selected: boolean,
  revealed: boolean,
  isCorrectBucket: boolean,
): ViewStyle {
  const { colors, radii, spacing, layout } = theme;
  let borderColor = colors.borderSubtle;
  let backgroundColor = colors.bgSurface;
  if (revealed) {
    if (isCorrectBucket) {
      borderColor = colors.success;
      backgroundColor = colors.successSubtle;
    } else if (selected) {
      borderColor = colors.caution;
      backgroundColor = colors.cautionSubtle;
    }
  } else if (selected) {
    borderColor = colors.accent;
  }
  return {
    flex: 1,
    minHeight: layout.minTouchTarget + 8,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor,
    backgroundColor,
    paddingHorizontal: spacing.s3,
    paddingVertical: spacing.s3,
    alignItems: 'center',
    justifyContent: 'center',
  };
}

export function Classification({
  prompt,
  buckets,
  correctValue,
  onAnswer,
  revealed: revealedProp,
}: ClassificationProps): React.JSX.Element {
  const theme = useTheme();
  const { spacing } = theme;
  const [selected, setSelected] = useState<string | null>(null);
  const [internalRevealed, setInternalRevealed] = useState(false);
  const revealed = revealedProp ?? internalRevealed;
  const correct = selected !== null && selected === correctValue;

  function handleSubmit(): void {
    if (selected === null || revealed) return;
    setInternalRevealed(true);
    if (selected === correctValue) {
      hapticsCorrect();
    } else {
      hapticsCorrection();
    }
    onAnswer({ value: selected, assessmentType: 'classification' });
  }

  return (
    <View style={{ gap: spacing.s5 }}>
      <Text variant="display" color="textPrimary" accessibilityRole="header">
        {prompt}
      </Text>
      <View style={{ flexDirection: 'row', gap: spacing.s3 }}>
        {buckets.map((bucket) => (
          <Pressable
            key={bucket.id}
            accessibilityRole="button"
            accessibilityLabel={`Sort into ${bucket.label}`}
            accessibilityState={{ selected: selected === bucket.id, disabled: revealed }}
            disabled={revealed}
            onPress={() => {
              hapticsSelect();
              setSelected(bucket.id);
            }}
            style={bucketStyle(theme, selected === bucket.id, revealed, bucket.id === correctValue)}
          >
            <Text variant="label" color="textPrimary">
              {bucket.label}
            </Text>
          </Pressable>
        ))}
      </View>
      {!revealed && (
        <Button label="Submit" variant="primary" fullWidth disabled={selected === null} onPress={handleSubmit} />
      )}
      {revealed && (
        <Text
          variant="body"
          color={correct ? 'success' : 'caution'}
          accessibilityLiveRegion="polite"
        >
          {correct ? 'Nice \u2014 sorted correctly.' : 'Not quite \u2014 review and keep going.'}
        </Text>
      )}
    </View>
  );
}
