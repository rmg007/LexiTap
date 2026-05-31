import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTheme } from '@/presentation/theme';
import { Screen } from '@/presentation/screens/Screen';
import { Text, Button } from '@/presentation/components';

// Age gate screen (O-0): verify user is 16+.
// Routes to Welcome (O-1) if age >= 16, shows error and stays on screen if < 16.
// Uses a simple date picker via Pressable + ScrollView (cross-platform compatible).

export interface OnboardingAgeGateScreenProps {
  // Called when user passes age check and advances to Welcome.
  onContinue: () => void;
}

function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age--;
  }
  return age;
}

export function OnboardingAgeGateScreen({ onContinue }: OnboardingAgeGateScreenProps): React.JSX.Element {
  const { colors, spacing } = useTheme();

  // Default to 16 years ago so first tap advances if unchanged.
  const now = new Date();
  const sixteenYearsAgo = new Date(now.getFullYear() - 16, now.getMonth(), now.getDate());

  const [dateOfBirth, setDateOfBirth] = useState<Date>(sixteenYearsAgo);
  const [error, setError] = useState<string>('');
  const [showYearPicker, setShowYearPicker] = useState(false);

  const age = useMemo(() => calculateAge(dateOfBirth), [dateOfBirth]);
  const isOldEnough = age >= 16;

  const handleYearSelect = useCallback((year: number) => {
    const newDate = new Date(year, dateOfBirth.getMonth(), dateOfBirth.getDate());
    setDateOfBirth(newDate);
    setShowYearPicker(false);
    // Clear error if user corrects their selection.
    if (calculateAge(newDate) >= 16) {
      setError('');
    }
  }, [dateOfBirth]);

  const handleContinue = useCallback(() => {
    if (isOldEnough) {
      setError('');
      onContinue();
    } else {
      setError('You must be 16 or older to use LexiTap.');
    }
  }, [isOldEnough, onContinue]);

  const dateFormatted = dateOfBirth.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Generate year options from current year back to 100 years ago.
  const currentYear = now.getFullYear();
  const yearOptions = Array.from({ length: 100 }, (_, i) => currentYear - i);

  return (
    <Screen>
      <View style={{ flex: 1, gap: spacing.s4 }}>
        {/* Header */}
        <View style={{ gap: spacing.s2 }}>
          <Text variant="headline" color="textPrimary" accessibilityRole="header">
            What's your date of birth?
          </Text>
          <Text variant="body" color="textSecondary">
            We need to verify you're 16 or older to continue.
          </Text>
        </View>

        {/* Date display + year picker button */}
        <View
          style={{
            backgroundColor: colors.bgSurface,
            borderRadius: 12,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: error ? colors.destructive : colors.borderSubtle,
            padding: spacing.s4,
            gap: spacing.s3,
          }}
        >
          {/* Display current selection */}
          <View style={{ gap: spacing.s2 }}>
            <Text variant="label" color="textSecondary">
              Date of birth
            </Text>
            <Text variant="bodyLg" color="textPrimary" accessibilityLiveRegion="polite">
              {dateFormatted}
            </Text>
          </View>

          {/* Year picker button */}
          <Pressable
            onPress={() => setShowYearPicker(!showYearPicker)}
            accessibilityRole="button"
            accessibilityLabel="Change year of birth"
            accessibilityState={{ expanded: showYearPicker }}
            style={({ pressed }) => ({
              paddingVertical: spacing.s3,
              paddingHorizontal: spacing.s2,
              backgroundColor: pressed ? colors.accentSubtle : colors.bgSurfaceRaised,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: colors.borderSubtle,
            })}
          >
            <Text variant="body" color="accent">
              {showYearPicker ? 'Hide year picker' : 'Change year'}
            </Text>
          </Pressable>

          {/* Year picker list */}
          {showYearPicker && (
            <View
              style={{
                maxHeight: 200,
                borderTopWidth: 1,
                borderTopColor: colors.borderSubtle,
                paddingTop: spacing.s2,
                gap: spacing.s1,
              }}
            >
              {yearOptions.map((year) => {
                const isSelected = year === dateOfBirth.getFullYear();
                return (
                  <Pressable
                    key={year}
                    onPress={() => handleYearSelect(year)}
                    accessibilityRole="button"
                    accessibilityLabel={`Year ${year}`}
                    accessibilityState={{ selected: isSelected }}
                    style={({ pressed }) => ({
                      paddingVertical: spacing.s2,
                      paddingHorizontal: spacing.s2,
                      backgroundColor: isSelected ? colors.accentSubtle : pressed ? colors.bgSurfaceRaised : undefined,
                      borderRadius: 4,
                    })}
                  >
                    <Text
                      variant="body"
                      color={isSelected ? 'accent' : 'textPrimary'}
                      style={{ fontWeight: isSelected ? '700' : '400' }}
                    >
                      {year}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {/* Display age */}
        <View
          style={{
            backgroundColor: colors.bgSurfaceRaised,
            padding: spacing.s4,
            borderRadius: 8,
            gap: spacing.s2,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="label" color="textSecondary">
              Your age
            </Text>
            <Text
              variant="body"
              color={isOldEnough ? 'success' : 'destructive'}
              accessibilityLiveRegion="polite"
            >
              {age}
            </Text>
          </View>
        </View>

        {/* Error message */}
        {error && (
          <View
            style={{
              backgroundColor: colors.cautionSubtle,
              padding: spacing.s3,
              borderRadius: 8,
              borderLeftWidth: 4,
              borderLeftColor: colors.caution,
            }}
            accessible
            accessibilityRole="alert"
          >
            <Text variant="body" color="caution">
              {error}
            </Text>
          </View>
        )}

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* Continue button */}
        <Button
          label="Continue"
          variant="primary"
          fullWidth
          onPress={handleContinue}
          accessibilityLabel={isOldEnough ? 'Continue to LexiTap' : 'Verify age to continue'}
        />

        {/* Legal links footer */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: spacing.s2,
            marginTop: spacing.s3,
          }}
        >
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Privacy policy"
            onPress={() => Linking.openURL('https://lexitap.app/privacy.html')}
          >
            <Text variant="caption" color="accent" style={{ textDecorationLine: 'underline' }}>
              Privacy
            </Text>
          </Pressable>
          <Text variant="caption" color="textTertiary">
            •
          </Text>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Terms of service"
            onPress={() => Linking.openURL('https://lexitap.app/terms.html')}
          >
            <Text variant="caption" color="accent" style={{ textDecorationLine: 'underline' }}>
              Terms
            </Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}
