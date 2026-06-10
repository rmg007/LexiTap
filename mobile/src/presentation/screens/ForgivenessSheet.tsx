import React from 'react';
import { Modal, View, StyleSheet, useWindowDimensions } from 'react-native';
import { useTheme } from '@/presentation/theme';
import { Text } from '@/presentation/components/Text';
import { Button } from '@/presentation/components/Button';
import { Icon } from '@/presentation/components/Icon';

// Forgiveness Sheet — shown when the learner hits the soft daily cap mid-session.
// Spec: lexitap-docs/03-ux-design/screens/ForgivenessSheet.md
//
// Design rules (locked):
// - NEVER display overdue word count (no number, bar, or %)
// - "Stop here" is the primary/default action
// - Swipe-to-dismiss = Stop here (safe default)
// - No red, no guilt, no "you're behind" copy

export interface ForgivenessSheetProps {
  currentStreak: number;
  visible: boolean;
  onStopHere: () => void;
  onKeepGoing: () => void;
}

export function ForgivenessSheet({
  currentStreak,
  visible,
  onStopHere,
  onKeepGoing,
}: ForgivenessSheetProps): React.JSX.Element {
  const { colors, spacing, radii } = useTheme();
  const { height: screenHeight } = useWindowDimensions();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onStopHere}
      accessibilityViewIsModal
    >
      {/* Scrim */}
      <View
        style={[styles.scrim, { height: screenHeight }]}
        accessible={false}
        importantForAccessibility="no"
      />

      {/* Sheet */}
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.bgSurfaceRaised,
            borderTopLeftRadius: radii.lg,
            borderTopRightRadius: radii.lg,
            padding: spacing.s5,
            gap: spacing.s4,
          },
        ]}
        accessibilityRole="none"
        accessibilityLabel="Daily reviews complete"
      >
        {/* Grabber handle */}
        <View
          style={[
            styles.handle,
            {
              backgroundColor: colors.borderSubtle,
            },
          ]}
          accessible={false}
          importantForAccessibility="no"
        />

        {/* Headline */}
        <Text
          variant="headline"
          color="textPrimary"
          accessibilityRole="header"
          style={{ textAlign: 'center' }}
        >
          {"You've done your reviews for today. Nice work."}
        </Text>

        {/* Streak secured row */}
        <View
          style={[styles.streakRow, { gap: spacing.s2 }]}
          accessibilityRole="text"
          accessibilityLabel={
            currentStreak > 0
              ? `Streak secured — ${currentStreak} day streak`
              : 'Streak secured'
          }
        >
          <Icon name="flame" size={20} color="streak" />
          <Text
            variant="bodyLg"
            color="streak"
            accessibilityElementsHidden
            style={{ textAlign: 'center' }}
          >
            Streak secured
          </Text>
          {currentStreak > 0 && (
            <Text
              variant="bodyLg"
              color="success"
              accessibilityElementsHidden
              tabularNums
              style={{ textAlign: 'center' }}
            >
              {` · ${currentStreak} day${currentStreak === 1 ? '' : 's'}`}
            </Text>
          )}
        </View>

        {/* Stop here — primary, default */}
        <Button
          label="Stop here"
          variant="primary"
          fullWidth
          onPress={onStopHere}
          accessibilityHint="Returns home and saves your progress"
        />

        {/* Keep going — secondary */}
        <Button
          label="Keep going"
          variant="secondary"
          fullWidth
          onPress={onKeepGoing}
          accessibilityHint="Continues the session with no penalty"
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'stretch',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 4,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
