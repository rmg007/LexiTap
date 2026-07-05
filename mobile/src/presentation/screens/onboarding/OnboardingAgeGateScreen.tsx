import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/presentation/theme';
import { Screen } from '@/presentation/screens/Screen';
import { Text, Button } from '@/presentation/components';

// Age gate screen (O-0): verify user is 16+.
// Routes to Welcome (O-1) if age >= 16, shows permanent rejection if < 16.
//
// Persistence (AsyncStorage):
//   - 'lexitap.age.gate.passed'   = '1' → user already verified ≥16; skip to onContinue immediately
//   - 'lexitap.age.gate.rejected' = '1' → user previously rejected; show permanent block, no way forward
//
// Full date-of-birth picker (month + day + year), each column an independently
// scrollable Pressable list — no TextInput (passive-recognition UX invariant).
// (TestFlight feedback 2026-06-10: the old year-only list was a fixed, clipped
// View with no scroll — most years were unreachable and month/day were locked.)

const AGE_GATE_PASSED_KEY = 'lexitap.age.gate.passed';
const AGE_GATE_REJECTED_KEY = 'lexitap.age.gate.rejected';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Days in a given month/year (handles leap years via day-0 of the next month).
function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

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

type GateStatus = 'loading' | 'pending' | 'rejected';

export function OnboardingAgeGateScreen({ onContinue }: OnboardingAgeGateScreenProps): React.JSX.Element {
  const { colors, spacing } = useTheme();

  // Default to 16 years ago so first tap advances if unchanged.
  const now = new Date();
  const sixteenYearsAgo = new Date(now.getFullYear() - 16, now.getMonth(), now.getDate());

  const [dateOfBirth, setDateOfBirth] = useState<Date>(sixteenYearsAgo);
  const [error, setError] = useState<string>('');
  // 'loading' = checking AsyncStorage; 'pending' = waiting for user input; 'rejected' = permanently blocked.
  const [gateStatus, setGateStatus] = useState<GateStatus>('loading');

  // On mount: read persisted gate state.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [passed, rejected] = await Promise.all([
        AsyncStorage.getItem(AGE_GATE_PASSED_KEY),
        AsyncStorage.getItem(AGE_GATE_REJECTED_KEY),
      ]);
      if (cancelled) return;
      if (passed === '1') {
        // Already verified — advance immediately.
        onContinue();
        return;
      }
      if (rejected === '1') {
        setGateStatus('rejected');
        return;
      }
      setGateStatus('pending');
    })();
    return () => {
      cancelled = true;
    };
  }, [onContinue]);

  const age = useMemo(() => calculateAge(dateOfBirth), [dateOfBirth]);
  const isOldEnough = age >= 16;

  // Commit a new DOB, clamping the day to the chosen month/year (e.g. switching
  // to February from the 31st snaps the day to 28/29). Clears the error once the
  // selection is valid (≥16).
  const commitDate = useCallback((year: number, monthIndex: number, day: number) => {
    const maxDay = daysInMonth(year, monthIndex);
    const clampedDay = Math.min(day, maxDay);
    const newDate = new Date(year, monthIndex, clampedDay);
    setDateOfBirth(newDate);
    if (calculateAge(newDate) >= 16) {
      setError('');
    }
  }, []);

  const handleMonthSelect = useCallback(
    (monthIndex: number) => commitDate(dateOfBirth.getFullYear(), monthIndex, dateOfBirth.getDate()),
    [commitDate, dateOfBirth],
  );
  const handleDaySelect = useCallback(
    (day: number) => commitDate(dateOfBirth.getFullYear(), dateOfBirth.getMonth(), day),
    [commitDate, dateOfBirth],
  );
  const handleYearSelect = useCallback(
    (year: number) => commitDate(year, dateOfBirth.getMonth(), dateOfBirth.getDate()),
    [commitDate, dateOfBirth],
  );

  const handleContinue = useCallback(() => {
    if (isOldEnough) {
      setError('');
      void AsyncStorage.setItem(AGE_GATE_PASSED_KEY, '1'); // fire-and-forget; navigation is not gated on this write
      onContinue();
    } else {
      // Persist rejection immediately — user must be permanently blocked on re-launch.
      void AsyncStorage.setItem(AGE_GATE_REJECTED_KEY, '1').then(() => {
        setGateStatus('rejected');
      });
      setError('You must be 16 or older to use LexiTap.');
    }
  }, [isOldEnough, onContinue]);

  const dateFormatted = dateOfBirth.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Picker column options. Years run from this year back 100; days are bounded
  // by the selected month/year so invalid dates (e.g. Feb 30) can't be picked.
  const currentYear = now.getFullYear();
  const yearOptions = Array.from({ length: 100 }, (_, i) => currentYear - i);
  const dayOptions = Array.from(
    { length: daysInMonth(dateOfBirth.getFullYear(), dateOfBirth.getMonth()) },
    (_, i) => i + 1,
  );
  const selectedMonth = dateOfBirth.getMonth();
  const selectedDay = dateOfBirth.getDate();
  const selectedYear = dateOfBirth.getFullYear();

  // Permanent rejection screen — no way forward.
  if (gateStatus === 'rejected') {
    return (
      <Screen>
        <View style={{ flex: 1, gap: spacing.s4 }}>
          <View style={{ gap: spacing.s2 }}>
            <Text variant="headline" color="textPrimary" accessibilityRole="header">
              Age requirement not met
            </Text>
          </View>
          <View
            style={{
              backgroundColor: colors.cautionSubtle,
              padding: spacing.s4,
              borderRadius: 12,
              borderLeftWidth: 4,
              borderLeftColor: colors.caution,
            }}
            accessible
            accessibilityRole="alert"
          >
            <Text variant="body" color="caution">
              LexiTap requires users to be 16 or older. You cannot continue with this app.
            </Text>
          </View>
          <View style={{ flex: 1 }} />
        </View>
      </Screen>
    );
  }

  // Loading state — blank while we check AsyncStorage.
  if (gateStatus === 'loading') {
    return <Screen><View style={{ flex: 1 }} /></Screen>;
  }

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

        {/* Date display + full month/day/year picker */}
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

          {/* Three scrollable columns: Month · Day · Year. Each is independently
              scrollable so the full range is always reachable. */}
          <View
            style={{
              flexDirection: 'row',
              gap: spacing.s2,
              borderTopWidth: 1,
              borderTopColor: colors.borderSubtle,
              paddingTop: spacing.s3,
            }}
          >
            {/* Month column */}
            <PickerColumn
              title="Month"
              flex={1.4}
              options={MONTH_NAMES.map((name, i) => ({
                key: `m-${i}`,
                label: name,
                a11yLabel: `Month ${name}`,
                selected: i === selectedMonth,
                onPress: () => handleMonthSelect(i),
              }))}
              colors={colors}
              spacing={spacing}
            />
            {/* Day column */}
            <PickerColumn
              title="Day"
              flex={0.8}
              options={dayOptions.map((d) => ({
                key: `d-${d}`,
                label: String(d),
                a11yLabel: `Day ${d}`,
                selected: d === selectedDay,
                onPress: () => handleDaySelect(d),
              }))}
              colors={colors}
              spacing={spacing}
            />
            {/* Year column */}
            <PickerColumn
              title="Year"
              flex={1}
              options={yearOptions.map((year) => ({
                key: `y-${year}`,
                label: String(year),
                a11yLabel: `Year ${year}`,
                selected: year === selectedYear,
                onPress: () => handleYearSelect(year),
              }))}
              colors={colors}
              spacing={spacing}
            />
          </View>
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
        {error !== '' && (
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
      </View>
    </Screen>
  );
}

// ─── Picker column ────────────────────────────────────────────────────────────
// A single scrollable column of selectable values (Month / Day / Year). Pure
// Pressable + ScrollView — no TextInput (passive-recognition invariant).

interface PickerOption {
  key: string;
  label: string;
  a11yLabel: string;
  selected: boolean;
  onPress: () => void;
}

interface PickerColumnProps {
  title: string;
  flex: number;
  options: PickerOption[];
  colors: ReturnType<typeof useTheme>['colors'];
  spacing: ReturnType<typeof useTheme>['spacing'];
}

function PickerColumn({ title, flex, options, colors, spacing }: PickerColumnProps): React.JSX.Element {
  return (
    <View style={{ flex, gap: spacing.s1 }}>
      <Text variant="caption" color="textTertiary" style={{ textAlign: 'center' }}>
        {title}
      </Text>
      <ScrollView
        style={{ maxHeight: 180 }}
        nestedScrollEnabled
        showsVerticalScrollIndicator
        contentContainerStyle={{ gap: spacing.s1, paddingVertical: spacing.s1 }}
      >
        {options.map((opt) => (
          <Pressable
            key={opt.key}
            onPress={opt.onPress}
            accessibilityRole="button"
            accessibilityLabel={opt.a11yLabel}
            accessibilityState={{ selected: opt.selected }}
            style={({ pressed }) => ({
              paddingVertical: spacing.s2,
              paddingHorizontal: spacing.s2,
              borderRadius: 4,
              backgroundColor: opt.selected
                ? colors.accentSubtle
                : pressed
                  ? colors.bgSurfaceRaised
                  : undefined,
            })}
          >
            <Text
              variant="body"
              color={opt.selected ? 'accent' : 'textPrimary'}
              style={{ textAlign: 'center', fontWeight: opt.selected ? '700' : '400' }}
            >
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
