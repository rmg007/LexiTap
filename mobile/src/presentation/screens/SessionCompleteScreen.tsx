import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Screen } from '@/presentation/screens/Screen';
import { useTheme } from '@/presentation/theme';
import { useMotion } from '@/presentation/theme/useMotion';
import { Text, Button, Card, StreakBadge, Icon } from '@/presentation/components';
import { hapticsStreakIncrement } from '@/presentation/services/haptics';

// Session Complete — spec: lexitap-docs/03-ux-design/screens/SessionComplete.md
//
// Calm done-state: confirms the day's work, shows streak, neutral word count.
// No accuracy score, no "X of Y correct", no red. Showing up = streak secured.
// Contained in a single raised Card (DESIGN_LEVELUP_PLAN.md Phase 3.3) — one
// earned moment, not five loose elements floating on the screen.
//
// Haptic: fires hapticsStreakIncrement on mount IFF streakIncremented === true.
// It does NOT fire on the Done button tap (Done is a plain navigation action).
// The check icon settles 0.6→1.0 in sync with that same haptic — a RAW
// withSpring call (bypasses useMotion().spring(), which returns {duration:0}
// under Reduce Motion but withSpring doesn't honor that shape), so Reduce
// Motion is handled with an explicit guard: mount at scale 1, no animation.

export interface SessionCompleteScreenProps {
  // 'review' (default) is the original quiz-flow tone, unchanged. 'learn' is
  // the learn-loop recap (DESIGN_LEVELUP_PLAN.md Phase 3.2) — same calm
  // no-score shape, just a headline naming what was learned instead of
  // reviewed.
  variant?: 'review' | 'learn';
  // Neutral count of items covered this session — NOT an accuracy score.
  wordsReviewed: number;
  // True when this session incremented the streak (first completion of the day).
  // Drives the mount haptic.
  streakIncremented: boolean;
  // Post-increment streak count shown in the badge.
  currentStreak: number;
  // Whether more review items remain. Controls "Keep practicing" visibility.
  moreItemsAvailable: boolean;
  // Primary exit — navigate Home (done state).
  onDone: () => void;
  // Secondary exit — load more items, no penalty. Hidden when !moreItemsAvailable.
  onKeepPracticing: () => void;
}

export function SessionCompleteScreen({
  variant = 'review',
  wordsReviewed,
  streakIncremented,
  currentStreak,
  moreItemsAvailable,
  onDone,
  onKeepPracticing,
}: SessionCompleteScreenProps): React.JSX.Element {
  const { spacing, springs } = useTheme();
  const { reduceMotion } = useMotion();

  // Fire haptic on mount only when the streak actually incremented this session.
  // Spec §7: "on entry (first session of day)" — mounted once, no deps so it
  // runs exactly once. Does NOT fire on Done tap.
  // streakIncremented is intentionally omitted from deps: we want mount-only
  // behaviour, and the value is stable for the lifetime of this screen.
  const streakIncrementedRef = useRef(streakIncremented);
  const iconScale = useSharedValue(reduceMotion ? 1 : 0.6);
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: iconScale.value }] }));

  useEffect(() => {
    if (streakIncrementedRef.current) {
      hapticsStreakIncrement();
    }
    if (!reduceMotion) {
      iconScale.value = withSpring(1, springs.settle);
    }
  }, []);

  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Card raised style={{ width: '100%', alignItems: 'center', gap: spacing.s5 }}>
          {/* A — completion mark, settles 0.6→1.0 in sync with the mount haptic */}
          <Animated.View style={iconStyle}>
            <Icon name="check" size={40} color="success" accessibilityLabel="Session complete" />
          </Animated.View>

          {/* B — headline */}
          <Text variant="headline" color="textPrimary" accessibilityRole="header">
            {variant === 'learn'
              ? `You met ${wordsReviewed} new ${wordsReviewed === 1 ? 'word' : 'words'} today.`
              : "You're done for today"}
          </Text>

          {/* C — streak summary, post-increment count */}
          <StreakBadge
            streak={{ currentStreak }}
            atRisk={false}
            freezeConsumed={false}
          />

          {/* D — neutral recap: count only, no accuracy. Omitted for the learn
              variant — the headline already states the count. */}
          {variant === 'review' && (
            <Text variant="body" color="textSecondary" tabularNums>
              {`${wordsReviewed} ${wordsReviewed === 1 ? 'word' : 'words'} reviewed`}
            </Text>
          )}

          {/* Buttons */}
          <View style={{ width: '100%', gap: spacing.s3 }}>
            {/* E — Done (primary) → Home. No haptic on press per spec §7. */}
            <Button
              label="Done"
              variant="primary"
              fullWidth
              onPress={onDone}
            />

            {/* F — Keep practicing (secondary) — only shown when queue non-empty */}
            {moreItemsAvailable && (
              <Button
                label="Keep practicing"
                variant="secondary"
                fullWidth
                onPress={onKeepPracticing}
              />
            )}
          </View>
        </Card>
      </View>
    </Screen>
  );
}
