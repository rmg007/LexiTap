import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '@/presentation/screens/Screen';
import { useTheme } from '@/presentation/theme';
import {
  Text,
  Button,
  Card,
  ListRow,
  KnowledgeMapBar,
  SectionHeader,
  StreakBadge,
} from '@/presentation/components';
import { useServices, type DailyProgressMetrics } from '@/presentation/services';
import {
  evaluateStreakAtRisk,
  toLocalCivilDate,
  initialStreakState,
  asTierId,
  knowledgeMapSegments,
  type KnowledgeMapSegments,
  type MasteryLevel,
  type UserStats,
} from '@/domain/index';
import { listActiveTiers } from '@/config/tiers';

// Progress — realigned to the finalized Figma (`360:2`, DESIGN_LEVELUP_PLAN.md
// Phase 2.2): the known/learning/new KnowledgeMapBar + legend is the hero
// (replaces the old flat completion bar + "0 of 2848 mastered" run-on line),
// stats render as ListRows (Figma `365:16`), the Saved-words row gets the
// 48px WCAG touch target it was missing, and a genuinely first-run learner
// (never studied) sees an invitation instead of a discouraging zeroed streak
// card. A read failure stays fail-soft/silent here (unlike Home) — Progress's
// existing offline-first convention, kept deliberately: a transient read
// failure must never be mistaken for "you haven't started" (tactical
// UI_UX_FIXES_PLAN.md Decision #5).

const DEFAULT_TIER_ID = listActiveTiers()[0]?.id ?? 'foundation';

interface TierProgress {
  tierId: string;
  displayName: string;
  segments: KnowledgeMapSegments;
}

export function ProgressScreen(): React.JSX.Element {
  const { spacing } = useTheme();
  const { queries, analytics } = useServices();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [tiers, setTiers] = useState<readonly TierProgress[]>([]);
  const [savedCount, setSavedCount] = useState(0);
  const [dailyProgress, setDailyProgress] = useState<DailyProgressMetrics | null>(null);
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
    try {
      setDailyProgress(await queries.getDailyProgress(asTierId(DEFAULT_TIER_ID)));
    } catch {
      setDailyProgress(null);
    }

    const active = listActiveTiers();
    const results: TierProgress[] = [];
    for (const tier of active) {
      let levels: readonly number[] = [];
      try {
        levels = await queries.getMasteryLevels(asTierId(tier.id));
      } catch {
        levels = [];
      }
      results.push({
        tierId: tier.id,
        displayName: tier.displayName,
        segments: knowledgeMapSegments(levels as readonly MasteryLevel[]),
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

  // A read failure (stats === null) must never trip the first-run branch —
  // only a genuine zero, on a successful read, means "never studied".
  const firstRun = stats !== null && stats.totalSessions === 0;

  const goToTier = (tierId: string): void => {
    router.push({ pathname: '/learn', params: { tierId } });
  };

  return (
    <Screen>
      <Text variant="title" color="textPrimary" accessibilityRole="header">
        Progress
      </Text>

      {tiers.filter((t) => t.segments.total > 0).map((tier) => (
        <Card key={tier.tierId} onPress={() => goToTier(tier.tierId)} accessibilityLabel={`Study ${tier.displayName}`}>
          <View style={{ gap: spacing.s3 }}>
            <SectionHeader>{tier.displayName.toUpperCase()}</SectionHeader>
            <KnowledgeMapBar segments={tier.segments} showLegend />
            <Text variant="headline" color="textPrimary" tabularNums>
              {`${tier.segments.known.toLocaleString()} / ${tier.segments.total.toLocaleString()} known · ${tier.displayName}`}
            </Text>
            <Text variant="caption" color="textTertiary">
              {tier.segments.known === 0
                ? 'First goal: master 10 words'
                : `${tier.segments.learning.toLocaleString()} in progress`}
            </Text>
          </View>
        </Card>
      ))}

      {savedCount > 0 && (
        <Card>
          <ListRow
            label="Saved words"
            value={String(savedCount)}
            leadingIcon="bookmark"
            onPress={() => router.push('/saved-words')}
            accessibilityLabel={`Saved words, ${savedCount}`}
          />
        </Card>
      )}

      {firstRun ? (
        <Card raised>
          <View style={{ gap: spacing.s3 }}>
            <Text variant="headline" color="textPrimary">
              No study sessions yet
            </Text>
            <Text variant="body" color="textSecondary">
              Complete your first word set to start building progress.
            </Text>
            <Button label="Start studying" variant="primary" fullWidth onPress={() => goToTier(DEFAULT_TIER_ID)} />
          </View>
        </Card>
      ) : (
        <Card>
          <View style={{ gap: spacing.s3 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="headline" color="textPrimary">
                Streak
              </Text>
              <StreakBadge streak={streak} atRisk={atRisk} />
            </View>
            <ListRow label="Longest streak" value={`${streak.longestStreak} days`} />
            <ListRow label="Sessions" value={String(stats?.totalSessions ?? 0)} />
            <ListRow label="Mastered" value={String(stats?.totalWordsMastered ?? 0)} />
            {dailyProgress != null && (
              <ListRow
                label="Reviewed today"
                value={`${dailyProgress.reviewsCompletedToday}/${dailyProgress.effectiveDailyCap}`}
              />
            )}
          </View>
        </Card>
      )}
    </Screen>
  );
}
