import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { Screen } from '@/presentation/screens/Screen';
import { useTheme } from '@/presentation/theme';
import {
  Text,
  Button,
  Card,
  DailyCapMeter,
  KnowledgeMapBar,
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
  type UserStats,
  type ActiveSession,
  type KnowledgeMapSegments,
} from '@/domain/index';
import { listActiveTiers } from '@/config/tiers';

// Home — realigned to the finalized Figma (`300:2`, DESIGN_LEVELUP_PLAN.md
// Phase 2.1): exactly one raised focal card carrying the single teal-gradient
// primary at a time (Resume when a learn session is in flight, else Start
// review — never both), a DailyCapMeter for the daily goal, and a flat
// Core-pack card whose KnowledgeMapBar shows the known/learning/new split
// with a demoted outlined secondary CTA. Offline-first: a read failure shows
// a neutral "couldn't load" retry, distinct from a genuine first-run zero.

export interface HomeScreenProps {
  greetingName?: string;
  onStartReview: () => void;
  onLearnNewWords: () => void;
  // Resume an in-flight learn session (SESSION_RESUME_PLAN). Called with the
  // snapshot so the route can navigate by stage. Absent = no resume affordance.
  onResume?: (session: ActiveSession) => void;
  // Bumped by the route on tab focus to re-read stats / active session in place
  // (no remount, no zero-state flash). Changing value re-runs the load effect.
  refreshSignal?: number;
}

const DEFAULT_DAILY_PROGRESS: DailyProgressMetrics = {
  reviewsCompletedToday: 0,
  effectiveDailyCap: 40,
  newWordsCompletedToday: 0,
  newWordsBudget: 10,
};

const ZERO_SEGMENTS: KnowledgeMapSegments = { known: 0, learning: 0, new: 0, total: 0 };

// The MVP active tier is the first free tier in config (no app/variant branch).
const ACTIVE_TIER = listActiveTiers()[0];

function timeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

// Loading placeholders for the very first load only (see hasLoadedOnce below).
// Mirror the real content's shape so nothing shifts when the swap happens.
function StreakBadgeSkeleton(): React.JSX.Element {
  const { radii } = useTheme();
  return <Skeleton width={56} height={28} style={{ borderRadius: radii.full }} />;
}

function FocalCardSkeleton(): React.JSX.Element {
  const { spacing } = useTheme();
  return (
    <Card raised>
      <View style={{ gap: spacing.s4 }}>
        <View style={{ gap: spacing.s1 }}>
          <Skeleton width={180} height={22} />
          <Skeleton width="70%" height={16} />
        </View>
        <Skeleton width="100%" height={12} />
        <Skeleton width="100%" height={44} />
      </View>
    </Card>
  );
}

function TierCardSkeleton(): React.JSX.Element {
  const { spacing } = useTheme();
  return (
    <Card>
      <View style={{ gap: spacing.s4 }}>
        <View style={{ gap: spacing.s2 }}>
          <Skeleton width={140} height={22} />
          <Skeleton width="100%" height={12} />
          <Skeleton width={160} height={16} />
        </View>
        <Skeleton width="100%" height={44} />
      </View>
    </Card>
  );
}

export function HomeScreen({
  greetingName,
  onStartReview,
  onLearnNewWords,
  onResume,
  refreshSignal,
}: HomeScreenProps): React.JSX.Element {
  const { spacing } = useTheme();
  const { queries } = useServices();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [statsError, setStatsError] = useState(false);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [dailyProgress, setDailyProgress] = useState<DailyProgressMetrics>(DEFAULT_DAILY_PROGRESS);
  const [segments, setSegments] = useState<KnowledgeMapSegments>(ZERO_SEGMENTS);
  const [masteryError, setMasteryError] = useState(false);
  // Gates the skeleton vs. real content, not a per-field spinner: every read
  // below is fetched in parallel and committed in one batch, so the very
  // first load goes skeleton → fully-populated in a single transition (no
  // section, badge, or card popping in ahead of the others). Later
  // refreshSignal-triggered reloads never flip this back to false, so a
  // returning visit updates the numbers in place instead of re-showing the
  // skeleton.
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const load = useCallback(async () => {
    const [statsResult, activeSessionResult, dailyProgressResult, segmentsResult] = await Promise.all([
      queries
        .getUserStats()
        .then((value) => ({ ok: true as const, value }))
        // Offline-first, but distinguish a genuine read failure from a
        // brand-new zero-state — a returning learner should never see their
        // real streak silently replaced by zero with no explanation.
        .catch(() => ({ ok: false as const, value: null })),
      queries
        .getActiveSession()
        .then((value) => ({ ok: true as const, value }))
        .catch(() => ({ ok: false as const, value: null })),
      ACTIVE_TIER
        ? queries
            .getDailyProgress(asTierId(ACTIVE_TIER.id))
            .then((value) => ({ ok: true as const, value }))
            .catch(() => ({ ok: false as const, value: DEFAULT_DAILY_PROGRESS }))
        : Promise.resolve({ ok: true as const, value: DEFAULT_DAILY_PROGRESS }),
      ACTIVE_TIER
        ? queries
            .getTierKnowledgeMap(asTierId(ACTIVE_TIER.id))
            .then((value) => ({ ok: true as const, value }))
            .catch(() => ({ ok: false as const, value: ZERO_SEGMENTS }))
        : Promise.resolve({ ok: true as const, value: ZERO_SEGMENTS }),
    ]);

    setStats(statsResult.value);
    setStatsError(!statsResult.ok);
    setActiveSession(activeSessionResult.value);
    setDailyProgress(dailyProgressResult.value);
    setSegments(segmentsResult.value);
    setMasteryError(!segmentsResult.ok);
    setHasLoadedOnce(true);
  }, [queries]);

  useEffect(() => {
    void load();
    // refreshSignal re-runs the reads in place when the tab regains focus.
  }, [load, refreshSignal]);

  const streak = stats?.streak ?? initialStreakState();
  const today = toLocalCivilDate(Date.now(), Intl.DateTimeFormat().resolvedOptions().timeZone);
  const { atRisk } = evaluateStreakAtRisk(streak, today);

  const hasResume = onResume !== undefined && activeSession !== null && activeSession.batch.length > 0;
  const atCap =
    dailyProgress.effectiveDailyCap > 0 &&
    dailyProgress.reviewsCompletedToday >= dailyProgress.effectiveDailyCap;

  const knowledgeLabel = ACTIVE_TIER
    ? `${segments.known.toLocaleString()} / ${segments.total.toLocaleString()} known · ${ACTIVE_TIER.displayName}`
    : `${segments.known.toLocaleString()} / ${segments.total.toLocaleString()} known`;

  // First-run endowed copy: a fresh install's real tracked mastery is (rightly)
  // all-zero, but the onboarding diagnostic already estimated a frontier of
  // known words — showing bare "0 known" here would silently contradict what
  // onboarding just told the learner. Only shown before any in-tier progress
  // exists; reuses the frontier estimate already computed at onboarding
  // (estimateKnownCount, same helper as the Knowledge Map reveal) — no new
  // domain concept, no new query (segments.total is already fetched).
  const frontierRank = stats?.onboardingState?.frontierRank;
  const isFreshInTier = segments.total > 0 && segments.known === 0 && segments.learning === 0;
  const knownEstimate =
    isFreshInTier && frontierRank != null ? estimateKnownCount(frontierRank, segments.total) : 0;

  const resumeWord =
    hasResume && activeSession
      ? activeSession.batch[Math.min(activeSession.index, activeSession.batch.length - 1)]?.word
      : undefined;
  const resumePosition = hasResume && activeSession ? Math.min(activeSession.index + 1, activeSession.batch.length) : 0;

  return (
    <Screen contentStyle={{ gap: spacing.s4 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          {greetingName != null && (
            <Text variant="caption" color="textSecondary">
              {`${timeOfDayGreeting()},`}
            </Text>
          )}
          <Text variant="title" color="textPrimary" accessibilityRole="header">
            {greetingName ?? 'Welcome back'}
          </Text>
        </View>
        {!hasLoadedOnce ? (
          <StreakBadgeSkeleton />
        ) : statsError ? (
          <Text variant="caption" color="textTertiary">
            Streak unavailable
          </Text>
        ) : (
          <StreakBadge streak={streak} atRisk={atRisk} />
        )}
      </View>

      {!hasLoadedOnce ? (
        <View accessibilityRole="text" accessibilityLabel="Loading home" style={{ gap: spacing.s4 }}>
          <FocalCardSkeleton />
          <TierCardSkeleton />
        </View>
      ) : (
        <>
          {/* Exactly one raised focal card at a time: Resume beats Start review. */}
          {hasResume && activeSession !== null ? (
            <Card raised>
              <View style={{ gap: spacing.s4 }}>
                <View style={{ gap: spacing.s1 }}>
                  <Text variant="headline" color="textPrimary">
                    Resume learning
                  </Text>
                  <Text variant="caption" color="textTertiary" tabularNums>
                    {resumeWord != null
                      ? `Pick up where you left off · ${resumePosition}/${activeSession.batch.length} · "${resumeWord}"`
                      : `Pick up where you left off · ${resumePosition}/${activeSession.batch.length}`}
                  </Text>
                </View>
                <Button
                  label="Resume"
                  variant="primary"
                  fullWidth
                  testID="resume-session"
                  onPress={() => onResume?.(activeSession)}
                />
              </View>
            </Card>
          ) : (
            <Card raised>
              <View style={{ gap: spacing.s4 }}>
                <View style={{ gap: spacing.s1 }}>
                  <Text variant="headline" color="textPrimary">
                    Words ready to review
                  </Text>
                  <Text variant="caption" color="textTertiary">
                    {atCap
                      ? 'Today\'s reviews are done'
                      : `${dailyProgress.reviewsCompletedToday} of ${dailyProgress.effectiveDailyCap} reviews done`}
                  </Text>
                </View>
                <DailyCapMeter
                  completed={dailyProgress.reviewsCompletedToday}
                  cap={dailyProgress.effectiveDailyCap}
                />
                {/* No dead CTA once today's cap is reached — nothing left to review. */}
                {!atCap && <Button label="Start review" variant="primary" fullWidth onPress={onStartReview} />}
              </View>
            </Card>
          )}

          <Card>
            <View style={{ gap: spacing.s4 }}>
              <View style={{ gap: spacing.s2 }}>
                <Text variant="headline" color="textPrimary">
                  {ACTIVE_TIER?.displayName ?? 'Your words'}
                </Text>
                {masteryError ? (
                  <Text variant="caption" color="textTertiary">
                    Couldn't load your progress
                  </Text>
                ) : (
                  <>
                    <KnowledgeMapBar segments={segments} />
                    <Text variant="caption" color="textTertiary" tabularNums>
                      {knowledgeLabel}
                    </Text>
                    {knownEstimate > 0 && (
                      <Text variant="caption" color="textSecondary">
                        {`You're starting from an estimated ${knownEstimate.toLocaleString()} words already known.`}
                      </Text>
                    )}
                  </>
                )}
              </View>
              <Button
                label="Keep learning"
                variant="secondary"
                fullWidth
                testID="learn-new-words"
                onPress={onLearnNewWords}
              />
            </View>
          </Card>
        </>
      )}
    </Screen>
  );
}
