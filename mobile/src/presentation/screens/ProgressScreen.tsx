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
  Skeleton,
} from '@/presentation/components';
import { useServices, type DailyProgressMetrics } from '@/presentation/services';
import {
  evaluateStreakAtRisk,
  toLocalCivilDate,
  initialStreakState,
  asTierId,
  estimateKnownCount,
  type KnowledgeMapSegments,
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
const ZERO_SEGMENTS: KnowledgeMapSegments = { known: 0, learning: 0, new: 0, total: 0 };

interface TierProgress {
  tierId: string;
  displayName: string;
  segments: KnowledgeMapSegments;
}

// Loading placeholders for the very first load only (see hasLoadedOnce below).
// Mirror the real cards' Card > View{gap} > [eyebrow, bar, headline, caption]
// shape so nothing shifts when the swap to real content happens.
function TierCardSkeleton(): React.JSX.Element {
  const { spacing, radii } = useTheme();
  return (
    <Card>
      <View style={{ gap: spacing.s3 }}>
        <Skeleton width={120} height={16} />
        <Skeleton width="100%" height={12} style={{ borderRadius: radii.full }} />
        <Skeleton width={180} height={22} />
        <Skeleton width={140} height={18} />
      </View>
    </Card>
  );
}

function StreakCardSkeleton(): React.JSX.Element {
  const { spacing, radii } = useTheme();
  return (
    <Card>
      <View style={{ gap: spacing.s3 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Skeleton width={72} height={22} />
          <Skeleton width={56} height={28} style={{ borderRadius: radii.full }} />
        </View>
        <Skeleton width="60%" height={18} />
        <Skeleton width="40%" height={18} />
        <Skeleton width="50%" height={18} />
      </View>
    </Card>
  );
}

export function ProgressScreen(): React.JSX.Element {
  const { spacing } = useTheme();
  const { queries, analytics } = useServices();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [tiers, setTiers] = useState<readonly TierProgress[]>([]);
  const [savedCount, setSavedCount] = useState(0);
  const [dailyProgress, setDailyProgress] = useState<DailyProgressMetrics | null>(null);
  const [streakEventFired, setStreakEventFired] = useState(false);
  // Gates the skeleton vs. real content, not a per-field spinner: every read
  // below is fetched in parallel and committed in one batch, so the very
  // first load goes skeleton → fully-populated in a single transition (no
  // section popping in ahead of the others). Later focus-triggered reloads
  // (see useFocusEffect below) never flip this back to false, so a returning
  // visit updates the numbers in place instead of re-showing the skeleton.
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const load = useCallback(async () => {
    const active = listActiveTiers();
    const [statsResult, savedCountResult, dailyProgressResult, tierResults] = await Promise.all([
      queries.getUserStats().catch(() => null),
      queries.getSavedWordCount().catch(() => 0),
      queries.getDailyProgress(asTierId(DEFAULT_TIER_ID)).catch(() => null),
      Promise.all(
        active.map(async (tier) => {
          try {
            const segments = await queries.getTierKnowledgeMap(asTierId(tier.id));
            return { tierId: tier.id, displayName: tier.displayName, segments };
          } catch {
            return { tierId: tier.id, displayName: tier.displayName, segments: ZERO_SEGMENTS };
          }
        }),
      ),
    ]);
    setStats(statsResult);
    setSavedCount(savedCountResult);
    setDailyProgress(dailyProgressResult);
    setTiers(tierResults);
    setHasLoadedOnce(true);
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

  // Same endowed-copy reasoning as Home (Phase 4.3): a fresh-in-tier learner's
  // real tracked mastery is honestly zero, but onboarding already estimated a
  // frontier of known words — surface that once here instead of a bare "0".
  const frontierRank = stats?.onboardingState?.frontierRank;

  return (
    <Screen>
      <Text variant="title" color="textPrimary" accessibilityRole="header">
        Progress
      </Text>

      {!hasLoadedOnce ? (
        <View accessibilityRole="text" accessibilityLabel="Loading progress" style={{ gap: spacing.s4 }}>
          <TierCardSkeleton />
          <StreakCardSkeleton />
        </View>
      ) : (
        <>
          {tiers.filter((t) => t.segments.total > 0).map((tier) => {
            const freshInTier = tier.segments.known === 0 && tier.segments.learning === 0;
            const knownEstimate =
              freshInTier && frontierRank != null
                ? estimateKnownCount(frontierRank, tier.segments.total)
                : 0;
            return (
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
                  {knownEstimate > 0 && (
                    <Text variant="caption" color="textSecondary">
                      {`You're starting from an estimated ${knownEstimate.toLocaleString()} words already known.`}
                    </Text>
                  )}
                </View>
              </Card>
            );
          })}

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
        </>
      )}
    </Screen>
  );
}
