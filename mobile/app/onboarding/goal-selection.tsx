import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/presentation/screens/Screen';
import { Text, Button, SelectionCard } from '@/presentation/components';
import { useServices } from '@/presentation/services';
import type { LearningGoal } from '@/domain/index';

const GOALS: { value: LearningGoal; label: string; icon: string }[] = [
  { value: 'general', label: 'General English', icon: '📖' },
  { value: 'professional', label: 'Work & Business', icon: '💼' },
  { value: 'academic', label: 'Academic English', icon: '🎓' },
  { value: 'exam', label: 'Exam Prep', icon: '📝' },
];

export default function GoalSelectionRoute(): React.JSX.Element {
  const { analytics } = useServices();
  const [selected, setSelected] = useState<LearningGoal | null>(null);

  return (
    <Screen>
      <View style={{ flex: 1, gap: 24 }}>
        <View style={{ gap: 8 }}>
          <Text variant="headline" color="textPrimary" accessibilityRole="header">
            What's your goal?
          </Text>
          <Text variant="body" color="textSecondary">
            We'll personalise your word list around what matters most to you.
          </Text>
        </View>

        <View style={{ gap: 12 }}>
          {GOALS.map((g) => (
            <SelectionCard
              key={g.value}
              label={g.label}
              icon={<Text variant="label" color="textPrimary">{g.icon}</Text>}
              selected={selected === g.value}
              onPress={() => setSelected(g.value)}
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
              void analytics.track('onboarding_goal_selected', { goal: selected });
              router.push({
                pathname: '/onboarding/diagnostic',
                params: { goal: selected },
              });
            }
          }}
        />
      </View>
    </Screen>
  );
}
