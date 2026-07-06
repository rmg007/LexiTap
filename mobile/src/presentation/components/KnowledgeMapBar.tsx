import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme } from '@/presentation/theme';
import { useMotion } from '@/presentation/theme/useMotion';
import { Text } from '@/presentation/components/Text';
import type { KnowledgeMapSegments } from '@/domain/gamification/mastery';

// ─── KnowledgeMapBar ──────────────────────────────────────────────────────────
// The 3-segment known/learning/new bar the finalized Figma specifies for both
// Home ("Core 3,000 known", `300:28`) and Progress (hero, `360:13`) — the
// code never built this; it shipped a single flat completion bar instead.
// Segments are widths from `knowledgeMapSegments()` (a pure cut of the same
// `MasteryLevel[]` domain/gamification/mastery already aggregates — no new
// domain concept). The remainder ("new") is simply the track's own
// `borderSubtle` background showing through — only known/learning render as
// filled segments, so the resting state never needs a third animated view.
// `showLegend` renders the dot legend (Progress only; Home shows the bar bare).
// ─────────────────────────────────────────────────────────────────────────────

export interface KnowledgeMapBarProps {
  segments: KnowledgeMapSegments;
  height?: number;
  showLegend?: boolean;
}

function LegendDot({ colorValue, label }: { colorValue: string; label: string }): React.JSX.Element {
  const { spacing } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s1 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colorValue }} />
      <Text variant="caption" color="textTertiary">
        {label}
      </Text>
    </View>
  );
}

export function KnowledgeMapBar({
  segments,
  height = 12,
  showLegend = false,
}: KnowledgeMapBarProps): React.JSX.Element {
  const { colors, radii, spacing } = useTheme();
  const { timing } = useMotion();
  const { known, learning, new: brandNew, total } = segments;

  const pct = (n: number): number => (total > 0 ? (n / total) * 100 : 0);

  const knownWidth = useSharedValue(0);
  const learningWidth = useSharedValue(0);
  useEffect(() => {
    knownWidth.value = withTiming(pct(known), timing('base'));
    learningWidth.value = withTiming(pct(learning), timing('base'));
  }, [known, learning, total, timing]);

  const knownStyle = useAnimatedStyle(() => ({ width: `${knownWidth.value}%` }));
  const learningStyle = useAnimatedStyle(() => ({ width: `${learningWidth.value}%` }));

  const label = `${known} of ${total} known, ${learning} learning, ${brandNew} new`;

  return (
    <View style={{ gap: spacing.s2 }}>
      <View
        accessibilityRole="progressbar"
        accessibilityLabel={label}
        accessibilityValue={{ min: 0, max: total, now: known }}
        style={{
          flexDirection: 'row',
          height,
          borderRadius: radii.full,
          overflow: 'hidden',
          backgroundColor: colors.borderStrong,
        }}
      >
        <Animated.View style={[{ height, backgroundColor: colors.success }, knownStyle]} />
        <Animated.View style={[{ height, backgroundColor: colors.accent }, learningStyle]} />
      </View>
      {showLegend && (
        <View style={{ flexDirection: 'row', gap: spacing.s4 }}>
          <LegendDot colorValue={colors.success} label={`Known · ${known}`} />
          <LegendDot colorValue={colors.accent} label={`Learning · ${learning}`} />
          <LegendDot colorValue={colors.borderStrong} label={`New · ${brandNew}`} />
        </View>
      )}
    </View>
  );
}
