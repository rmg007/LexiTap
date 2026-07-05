import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '@/presentation/screens/Screen';
import { useTheme } from '@/presentation/theme';
import { Text, Card, ProgressBar, StreakBadge, Icon } from '@/presentation/components';
import { useServices } from '@/presentation/services';
import {
  masteryCompletion,
  countMastered,
  evaluateStreakAtRisk,
  toLocalCivilDate,
  initialStreakState,
  asTierId,
  type MasteryLevel,
  type UserStats,
} from '@/domain/index';
import { listActiveTiers } from '@/config/tiers';

// Progress: streak summary + per-tier mastery (rings/bars driven by the pure
// mastery aggregation helpers). Offline-first reads; failures fall back to an
// empty dashboard rather than an error.

interface TierMastery {
  tierId: string;
  displayName: string;
  completion: number;
  mastered: number;
  total: number;
}

export function ProgressScreen(): React.JSX.Element {
  const { spacing } = useTheme();
  const { queries, analytics } = useServices();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [tiers, setTiers] = useState<readonly TierMastery[]>([]);
  const [savedCount, setSavedCount] = useState(0);
  const [streakEventFired, setStreakEventFired] = useState(false);

  const load = useCallback(async () => {
    try {
      setStats(await queries.getUserStats());
    } catch {
      setStats(null);
    }
    try {
      setSavedCount(await queries.getSavedWordCount());
    } catch {
      setSavedCount(0);
    }
    const active = listActiveTiers();
    const results: TierMastery[] = [];
    for (const tier of active) {
      let levels: readonly number[] = [];
      try {
        levels = await queries.getMasteryLevels(asTierId(tier.id));
      } catch {
        levels = [];
      }
      const masteryLevels = levels as readonly MasteryLevel[];
      results.push({
        tierId: tier.id,
        displayName: tier.displayName,
        completion: masteryCompletion(masteryLevels),
        mastered: countMastered(masteryLevels),
        total: masteryLevels.length,
      });
    }
    setTiers(results);
  }, [queries]);

  // Refresh on every focus (not just mount): the tab stays mounted across
  // focus changes, so without this the "Saved words" section + count would go
  // stale after the learner saves/unsaves a word from another screen.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  // Fire streak_maintained event once after stats load.
  useEffect(() => {
    if (!streakEventFired && stats !== null) {
      const today = toLocalCivilDate(Date.now(), Intl.DateTimeFormat().resolvedOptions().timeZone);
      const streak = stats.streak ?? initialStreakState();
      const { atRisk } = evaluateStreakAtRisk(streak, today);
      void analytics.track('streak_maintained', {
        current_streak: streak.currentStreak,
        at_risk: atRisk,
      });
      setStreakEventFired(true);
    }
  }, [stats, streakEventFired, analytics]);

  const streak = stats?.streak ?? initialStreakState();
  const today = toLocalCivilDate(Date.now(), Intl.DateTimeFormat().resolvedOptions().timeZone);
  const { atRisk } = evaluateStreakAtRisk(streak, today);

  return (
    <Screen>
      <Text variant="title" color="textPrimary" accessibilityRole="header">
        Progress
      </Text>

      <Card>
        <View style={{ gap: spacing.s3 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="headline" color="textPrimary">
              Streak
            </Text>
            <StreakBadge streak={streak} atRisk={atRisk} />
          </View>
          <Text variant="body" color="textSecondary" tabularNums>
            {`Longest: ${streak.longestStreak} · Sessions: ${stats?.totalSessions ?? 0} · Mastered: ${stats?.totalWordsMastered ?? 0}`}
          </Text>
        </View>
      </Card>

      {savedCount > 0 && (
        <Card>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Saved words, ${savedCount}`}
            onPress={() => router.push('/saved-words')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s3 }}
          >
            <Icon name="bookmark" size={22} color="accent" />
            <Text variant="headline" color="textPrimary" style={{ flex: 1 }}>
              Saved words
            </Text>
            <Text variant="body" color="textSecondary" tabularNums>
              {String(savedCount)}
            </Text>
            <Icon name="chevron-right" size={20} color="textTertiary" />
          </Pressable>
        </Card>
      )}

      {tiers.filter((t) => t.total > 0).map((tier) => (
        <Card key={tier.tierId}>
          <View style={{ gap: spacing.s3 }}>
            <Text variant="headline" color="textPrimary">
              {tier.displayName}
            </Text>
            <ProgressBar progress={tier.completion} label={`${tier.displayName} mastery`} />
            <Text variant="caption" color="textTertiary" tabularNums>
              {`${tier.mastered} of ${tier.total} mastered`}
            </Text>
          </View>
        </Card>
      ))}
    </Screen>
  );
}
