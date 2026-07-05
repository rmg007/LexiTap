import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { Screen } from '@/presentation/screens/Screen';
import { useTheme } from '@/presentation/theme';
import { Text, Button, Card, ProgressBar, StreakBadge } from '@/presentation/components';
import { useServices, type DailyProgressMetrics } from '@/presentation/services';
import {
  evaluateStreakAtRisk,
  toLocalCivilDate,
  initialStreakState,
  asTierId,
  type UserStats,
  type ActiveSession,
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
  // Resume an in-flight learn session (SESSION_RESUME_PLAN). Called with the
  // snapshot so the route can navigate by stage. Absent = no resume affordance.
  onResume?: (session: ActiveSession) => void;
}

// The MVP active tier is the first free tier in config (no app/variant branch).
const ACTIVE_TIER = listActiveTiers()[0];

export function HomeScreen({
  greetingName,
  onStartReview,
  onLearnNewWords,
  onResume,
}: HomeScreenProps): React.JSX.Element {
  const { spacing } = useTheme();
  const { queries } = useServices();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [dailyProgress, setDailyProgress] = useState<DailyProgressMetrics>({
    reviewsCompletedToday: 0,
    effectiveDailyCap: 40,
    newWordsCompletedToday: 0,
    newWordsBudget: 10,
  });

  const load = useCallback(async () => {
    try {
      setStats(await queries.getUserStats());
    } catch {
      // Offline-first: never block Home on a read failure.
      setStats(null);
    }

    try {
      setActiveSession(await queries.getActiveSession());
    } catch {
      setActiveSession(null);
    }

    try {
      const activeTier = listActiveTiers()[0];
      if (activeTier) {
        const progress = await queries.getDailyProgress(asTierId(activeTier.id));
        setDailyProgress(progress);
      }
    } catch {
      // Offline-first: never block Home on a read failure.
      setDailyProgress({
        reviewsCompletedToday: 0,
        effectiveDailyCap: 40,
        newWordsCompletedToday: 0,
        newWordsBudget: 10,
      });
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

      {onResume !== undefined && activeSession !== null && activeSession.batch.length > 0 && (
        <Card>
          <View style={{ gap: spacing.s4 }}>
            <View style={{ gap: spacing.s1 }}>
              <Text variant="headline" color="textPrimary">
                Resume learning
              </Text>
              <Text variant="caption" color="textTertiary" tabularNums>
                {`Pick up where you left off · ${Math.min(activeSession.index + 1, activeSession.batch.length)}/${activeSession.batch.length}`}
              </Text>
            </View>
            <Button
              label="Resume"
              variant="primary"
              fullWidth
              testID="resume-session"
              onPress={() => onResume(activeSession)}
            />
          </View>
        </Card>
      )}

      <Card>
        <View style={{ gap: spacing.s4 }}>
          <View style={{ gap: spacing.s1 }}>
            <Text variant="headline" color="textPrimary">
              Ready for today
            </Text>
            <Text variant="caption" color="textTertiary">
              {`${dailyProgress.reviewsCompletedToday} of ${dailyProgress.effectiveDailyCap} reviews done`}
            </Text>
          </View>
          <ProgressBar
            progress={
              dailyProgress.effectiveDailyCap > 0
                ? Math.min(dailyProgress.reviewsCompletedToday / dailyProgress.effectiveDailyCap, 1)
                : 0
            }
            label={`${dailyProgress.reviewsCompletedToday}/${dailyProgress.effectiveDailyCap} reviews`}
          />
          <Button label="Start review" variant="primary" fullWidth onPress={onStartReview} />
        </View>
      </Card>

      <Card>
        <View style={{ gap: spacing.s4 }}>
          <View style={{ gap: spacing.s1 }}>
            <Text variant="headline" color="textPrimary">
              Learn new words
            </Text>
            <Text variant="caption" color="textTertiary">
              {ACTIVE_TIER
                ? `${ACTIVE_TIER.displayName} · ${ACTIVE_TIER.cefr.join('–')} · ${dailyProgress.newWordsBudget} left today`
                : `${dailyProgress.newWordsBudget} left today`}
            </Text>
          </View>
          <Button
            label="Start learning"
            variant="secondary"
            fullWidth
            testID="learn-new-words"
            onPress={onLearnNewWords}
          />
        </View>
      </Card>
    </Screen>
  );
}
