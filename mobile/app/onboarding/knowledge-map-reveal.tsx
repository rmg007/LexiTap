import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, SlideInUp, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Screen } from '@/presentation/screens/Screen';
import { Text, Button } from '@/presentation/components';
import { useTheme } from '@/presentation/theme';
import { useServices } from '@/presentation/services';
import { estimateKnownCount } from '@/domain/index';

// Onboarding step 5: Knowledge Map Reveal.
// Computes estimated known-word count from the diagnostic frontier rank (DIAG-A,
// already corrected for over-claiming). Animated endowed-progress reveal (the
// single celebratory motion moment in onboarding).

interface SegmentCounts {
  known: number;
  learning: number;
  new: number;
}

const LEARNING_BAND = 500; // Word band width for "Learning" segment
const DEFAULT_FREE_POOL = 3000; // Fallback free-pool size if content health read fails

function computeSegments(frontierRank: number | undefined, freePoolSize: number): SegmentCounts {
  const pool = freePoolSize > 0 ? freePoolSize : DEFAULT_FREE_POOL;
  if (frontierRank === undefined) {
    // Fallback for a missing frontier (shouldn't happen post-diagnostic, but defensive).
    const known = Math.min(1500, pool);
    return { known, learning: Math.min(LEARNING_BAND, pool - known), new: Math.max(0, pool - known - LEARNING_BAND) };
  }
  // Frontier rank → known count (everything more common than the frontier),
  // capped by the real free-pool size (PB-5 estimateKnownCount).
  const known = estimateKnownCount(frontierRank, pool);
  const learningEnd = Math.min(known + LEARNING_BAND, pool);
  const learning = Math.max(0, learningEnd - known);
  const new_ = Math.max(0, pool - learningEnd);
  return { known, learning, new: new_ };
}

export default function KnowledgeMapRevealRoute(): React.JSX.Element {
  const { colors, spacing } = useTheme();
  const { queries, analytics } = useServices();

  const [segments, setSegments] = useState<SegmentCounts>({ known: 0, learning: 0, new: 0 });

  const barKnownWidth = useSharedValue(0);
  const barLearningWidth = useSharedValue(0);

  useEffect(() => {
    const loadAndCompute = async () => {
      try {
        const userStats = await queries.getUserStats();
        const frontier = userStats?.onboardingState?.frontierRank;
        // Real free-pool size for the known-count cap; falls back if unavailable.
        const health = await queries.getContentDbHealth();
        const computed = computeSegments(frontier, health.wordCount);
        setSegments(computed);
        void analytics.track('onboarding_km_revealed', {
          frontier_rank: frontier ?? null,
          known_count: computed.known,
          learning_count: computed.learning,
          new_count: computed.new,
        });

        // Animate bar fill on mount.
        const total = computed.known + computed.learning + computed.new;
        const knownPct = total > 0 ? computed.known / total : 0;
        const learningPct = total > 0 ? computed.learning / total : 0;

        barKnownWidth.value = withTiming(knownPct, { duration: 360 });
        barLearningWidth.value = withTiming(learningPct, { duration: 360 });
      } catch {
        // Defensive: use fallback counts if read fails.
        const fallback = computeSegments(undefined, DEFAULT_FREE_POOL);
        setSegments(fallback);
      }
    };
    void loadAndCompute();
  }, [barKnownWidth, barLearningWidth, queries]);

  const total = segments.known + segments.learning + segments.new;
  const knownPct = total > 0 ? segments.known / total : 0;
  const learningPct = total > 0 ? segments.learning / total : 0;

  const barKnownStyle = useAnimatedStyle(() => ({
    flex: barKnownWidth.value,
  }));

  const barLearningStyle = useAnimatedStyle(() => ({
    flex: barLearningWidth.value,
  }));

  return (
    <Screen>
      <Animated.View style={{ flex: 1, gap: 24 }} entering={FadeIn.duration(300)}>
        <View style={{ gap: 8 }}>
          <Text variant="headline" color="textPrimary" accessibilityRole="header">
            You already know
          </Text>
          <Text variant="body" color="textSecondary">
            Let's build from there.
          </Text>
        </View>

        {/* Known count — large display, approximate */}
        <View style={{ gap: 8, alignItems: 'center' }}>
          <Animated.View entering={SlideInUp.delay(100).duration(400)}>
            <Text
              variant="h1"
              color="textPrimary"
              accessibilityLabel={`About ${segments.known} words known`}
            >
              ~{segments.known.toLocaleString()}
            </Text>
          </Animated.View>
          <Text variant="body" color="textSecondary">
            words
          </Text>
        </View>

        {/* Segmented bar: Known | Learning | New */}
        <Animated.View entering={SlideInUp.delay(200).duration(400)}>
          <View
            style={{
              height: 24,
              borderRadius: 12,
              overflow: 'hidden',
              backgroundColor: 'rgba(255,255,255,0.05)',
              flexDirection: 'row',
            }}
            accessibilityLabel={`Knowledge: ${segments.known} known, ${segments.learning} learning, ${segments.new} new`}
          >
            {/* Known segment */}
            <Animated.View
              style={[
                barKnownStyle,
                {
                  backgroundColor: colors.success,
                },
              ]}
            />
            {/* Learning segment */}
            <Animated.View
              style={[
                barLearningStyle,
                {
                  backgroundColor: colors.accent,
                },
              ]}
            />
            {/* New segment */}
            <View
              style={{
                flex: Math.max(0, 1 - knownPct - learningPct),
                backgroundColor: colors.textTertiary,
                opacity: 0.2,
              }}
            />
          </View>

          {/* Legend */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginTop: spacing.s3,
            }}
          >
            <View style={{ flexDirection: 'row', gap: spacing.s2, alignItems: 'center' }}>
              <View
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 2,
                  backgroundColor: colors.success,
                }}
                accessibilityElementsHidden
              />
              <Text variant="caption" color="textTertiary">
                known
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.s2, alignItems: 'center' }}>
              <View
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 2,
                  backgroundColor: colors.accent,
                }}
                accessibilityElementsHidden
              />
              <Text variant="caption" color="textTertiary">
                learning
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.s2, alignItems: 'center' }}>
              <View
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 2,
                  backgroundColor: colors.textTertiary,
                  opacity: 0.2,
                }}
                accessibilityElementsHidden
              />
              <Text variant="caption" color="textTertiary">
                new
              </Text>
            </View>
          </View>
        </Animated.View>

        <View style={{ flex: 1 }} />

        <Button
          label="Start learning"
          variant="primary"
          fullWidth
          onPress={() => router.push('/onboarding/paywall')}
        />
      </Animated.View>
    </Screen>
  );
}
