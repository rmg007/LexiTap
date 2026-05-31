import React, { useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/presentation/screens/Screen';
import { Text, Button, SelectionCard } from '@/presentation/components';
import type { ProficiencyBand } from '@/domain/index';

const BANDS: { value: ProficiencyBand; label: string; description: string }[] = [
  { value: 'A2', label: 'A2 — Beginner', description: 'Basic everyday expressions' },
  { value: 'B1', label: 'B1 — Elementary', description: 'Familiar topics, simple situations' },
  { value: 'B2', label: 'B2 — Intermediate', description: 'Main ideas of complex topics' },
  { value: 'C1', label: 'C1 — Upper Intermediate', description: 'Fluent, flexible English' },
  { value: 'C2', label: 'C2 — Advanced', description: 'Near-native proficiency' },
];

export default function ProficiencyAssessmentRoute(): React.JSX.Element {
  const { goal } = useLocalSearchParams<{ goal: string }>();
  const [selected, setSelected] = useState<ProficiencyBand | null>(null);

  return (
    <Screen>
      <View style={{ flex: 1, gap: 24 }}>
        <View style={{ gap: 8 }}>
          <Text variant="headline" color="textPrimary" accessibilityRole="header">
            How's your English?
          </Text>
          <Text variant="body" color="textSecondary">
            Pick the level that feels right — you can always change it later.
          </Text>
        </View>

        <View style={{ gap: 12 }}>
          {BANDS.map((b) => (
            <SelectionCard
              key={b.value}
              label={b.label}
              icon={<Text variant="caption" color="textSecondary">{b.description}</Text>}
              selected={selected === b.value}
              onPress={() => setSelected(b.value)}
            />
          ))}
        </View>

        <View style={{ flex: 1 }} />

        <Button
          label="Continue"
          variant="primary"
          fullWidth
          disabled={selected === null}
          onPress={() => {
            if (selected) {
              router.push({
                pathname: '/onboarding/diagnostic',
                params: { goal: goal ?? '', band: selected },
              });
            }
          }}
        />
      </View>
    </Screen>
  );
}
