import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { Screen } from '@/presentation/screens/Screen';
import { useTheme } from '@/presentation/theme';
import { Text, Button, Card, ProgressBar, StreakBadge } from '@/presentation/components';
import { useServices } from '@/presentation/services';
import {
  evaluateStreakAtRisk,
  toLocalCivilDate,
  initialStreakState,
  type UserStats,
} from '@/domain/index';
import { listActiveTiers } from '@/config/tiers';

// Home: greeting + streak chip, "words due today" card with a calm daily-cap
// meter and the primary Start review action, a secondary Learn new words
// action, and the active tier line. Offline-first: a stats read failure falls
// back to a seeded zero-state, never an error screen.

export interface HomeScreenProps {
  greetingName?: string;
  onStartReview: () => void;
  onLearnNewWords: () => void;
}

// The MVP active tier is the first free tier in config (no app/variant branch).
const ACTIVE_TIER = listActiveTiers()[0];

export function HomeScreen({
  greetingName,
  onStartReview,
  onLearnNewWords,
}: HomeScreenProps): React.JSX.Element {
  const { spacing } = useTheme();
  const { queries } = useServices();
  const [stats, setStats] = useState<UserStats | null>(null);

  const load = useCallback(async () => {
    try {
      setStats(await queries.getUserStats());
    } catch {
      // Offline-first: never block Home on a read failure.
      setStats(null);
    }
  }, [queries]);

  useEffect(() => {
    void load();
  }, [load]);

  const streak = stats?.streak ?? initialStreakState();
  const today = toLocalCivilDate(Date.now(), Intl.DateTimeFormat().resolvedOptions().timeZone);
  const { atRisk } = evaluateStreakAtRisk(streak, today);

  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text variant="title" color="textPrimary" accessibilityRole="header">
          {greetingName ? `Hi, ${greetingName}` : 'Welcome back'}
        </Text>
        <StreakBadge streak={streak} atRisk={atRisk} />
      </View>

      <Card>
        <View style={{ gap: spacing.s4 }}>
          <Text variant="headline" color="textPrimary">
            Ready for today
          </Text>
          <ProgressBar progress={0} label="Daily review progress" />
          <Button label="Start review" variant="primary" fullWidth onPress={onStartReview} />
        </View>
      </Card>

      <Button label="Learn new words" variant="secondary" fullWidth onPress={onLearnNewWords} />

      {ACTIVE_TIER && (
        <Text variant="caption" color="textTertiary">
          {`${ACTIVE_TIER.displayName} · ${ACTIVE_TIER.cefr.join('–')}`}
        </Text>
      )}
    </Screen>
  );
}
