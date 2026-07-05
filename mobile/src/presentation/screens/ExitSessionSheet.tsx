import React from 'react';
import { Modal, View, StyleSheet, useWindowDimensions } from 'react-native';
import { useTheme } from '@/presentation/theme';
import { Text } from '@/presentation/components/Text';
import { Button } from '@/presentation/components/Button';

// ExitSessionSheet — shown when the learner taps "Back" mid learn-session
// (SESSION_RESUME_PLAN Part A). Same calm, no-guilt voice as ForgivenessSheet:
// leaving is safe, progress is saved, and Home offers "Resume" afterward.
//
// Design rules (mirror ForgivenessSheet):
// - No red, no guilt, no "you'll lose progress" copy.
// - "Keep going" is the safe default (swipe-to-dismiss = keep going).
// - "Leave" preserves the snapshot so the session is resumable.

export interface ExitSessionSheetProps {
  visible: boolean;
  onLeave: () => void;
  onKeepGoing: () => void;
}

export function ExitSessionSheet({
  visible,
  onLeave,
  onKeepGoing,
}: ExitSessionSheetProps): React.JSX.Element {
  const { colors, spacing, radii } = useTheme();
  const { height: screenHeight } = useWindowDimensions();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onKeepGoing}
      accessibilityViewIsModal
    >
      <View
        style={[styles.scrim, { height: screenHeight }]}
        accessible={false}
        importantForAccessibility="no"
      />

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
        accessibilityLabel="Leave this session?"
      >
        <View
          style={[styles.handle, { backgroundColor: colors.borderSubtle }]}
          accessible={false}
          importantForAccessibility="no"
        />

        <Text
          variant="headline"
          color="textPrimary"
          accessibilityRole="header"
          style={{ textAlign: 'center' }}
        >
          Your progress is saved.
        </Text>

        <Text variant="body" color="textSecondary" style={{ textAlign: 'center' }}>
          Pick up right where you left off, anytime.
        </Text>

        {/* Keep going — primary, safe default. */}
        <Button
          label="Keep going"
          variant="primary"
          fullWidth
          onPress={onKeepGoing}
          accessibilityHint="Stay in this session"
        />

        {/* Leave — secondary; the snapshot is preserved for resume. */}
        <Button
          label="Leave"
          variant="secondary"
          fullWidth
          onPress={onLeave}
          accessibilityHint="Return home; resume this session later"
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
});
