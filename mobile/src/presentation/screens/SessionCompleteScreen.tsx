import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { Screen } from '@/presentation/screens/Screen';
import { useTheme } from '@/presentation/theme';
import { Text, Button, StreakBadge } from '@/presentation/components';
import { hapticsStreakIncrement } from '@/presentation/services/haptics';

// Session Complete — spec: lexitap-docs/03-ux-design/screens/SessionComplete.md
//
// Calm done-state: confirms the day's work, shows streak, neutral word count.
// No accuracy score, no "X of Y correct", no red. Showing up = streak secured.
//
// Haptic: fires hapticsStreakIncrement on mount IFF streakIncremented === true.
// It does NOT fire on the Done button tap (Done is a plain navigation action).

export interface SessionCompleteScreenProps {
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
  wordsReviewed,
  streakIncremented,
  currentStreak,
  moreItemsAvailable,
  onDone,
  onKeepPracticing,
}: SessionCompleteScreenProps): React.JSX.Element {
  const { spacing } = useTheme();

  // Fire haptic on mount only when the streak actually incremented this session.
  // Spec §7: "on entry (first session of day)" — mounted once, no deps so it
  // runs exactly once. Does NOT fire on Done tap.
  // streakIncremented is intentionally omitted from deps: we want mount-only
  // behaviour, and the value is stable for the lifetime of this screen.
  const streakIncrementedRef = useRef(streakIncremented);
  useEffect(() => {
    if (streakIncrementedRef.current) {
      hapticsStreakIncrement();
    }
  }, []);

  return (
    <Screen scroll={false}>
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          gap: spacing.s5,
        }}
      >
        {/* A — completion mark */}
        <Text
          variant="title"
          color="success"
          accessibilityLabel="Session complete"
        >
          {'✓'}
        </Text>

        {/* B — headline */}
        <Text variant="headline" color="textPrimary" accessibilityRole="header">
          Reviews done for today
        </Text>

        {/* C — streak summary, post-increment count */}
        <StreakBadge
          streak={{ currentStreak }}
          atRisk={false}
          freezeConsumed={false}
        />

        {/* D — neutral recap: count only, no accuracy */}
        <Text variant="body" color="textSecondary" tabularNums>
          {`${wordsReviewed} ${wordsReviewed === 1 ? 'word' : 'words'} reviewed`}
        </Text>

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
      </View>
    </Screen>
  );
}
