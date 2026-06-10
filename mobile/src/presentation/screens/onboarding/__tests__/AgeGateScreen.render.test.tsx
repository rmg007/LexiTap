import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider } from '@/presentation/theme';
import { OnboardingAgeGateScreen } from '@/presentation/screens/onboarding/OnboardingAgeGateScreen';

// Render tests for OnboardingAgeGateScreen (RTL harness — same pattern as LearnCardScreen.render.test.tsx).
// Covers: initial render, under-16 rejection (permanent block), >=16 allows progress.
// AsyncStorage mock is in src/__mocks__/@react-native-async-storage/async-storage.ts

const AGE_GATE_PASSED_KEY = 'lexitap.age.gate.passed';
const AGE_GATE_REJECTED_KEY = 'lexitap.age.gate.rejected';

function renderAgeGate(options?: { onContinue?: jest.Mock }) {
  const onContinue = options?.onContinue ?? jest.fn();
  const utils = render(
    <ThemeProvider initialPreference="dark">
      <OnboardingAgeGateScreen onContinue={onContinue} />
    </ThemeProvider>,
  );
  return { ...utils, onContinue };
}

beforeEach(() => {
  // Reset all AsyncStorage mocks to fresh state (no persisted keys).
  jest.clearAllMocks();
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
});

describe('OnboardingAgeGateScreen (render)', () => {
  it('renders the date of birth prompt after checking AsyncStorage (fresh install)', async () => {
    const { findByText } = renderAgeGate();

    // Should show the age gate prompt once AsyncStorage check resolves.
    await findByText("What's your date of birth?");
    await findByText('Continue');
  });

  it('auto-advances without showing UI when age gate was already passed', async () => {
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === AGE_GATE_PASSED_KEY) return Promise.resolve('1');
      return Promise.resolve(null);
    });

    const onContinue = jest.fn();
    renderAgeGate({ onContinue });

    // onContinue fires automatically — no user input required.
    await waitFor(() => {
      expect(onContinue).toHaveBeenCalledTimes(1);
    });
  });

  it('shows permanent rejection screen when gate was previously rejected', async () => {
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === AGE_GATE_REJECTED_KEY) return Promise.resolve('1');
      return Promise.resolve(null);
    });

    const { findByText, queryByText } = renderAgeGate();

    // Rejection heading should appear.
    await findByText('Age requirement not met');
    // No Continue button — user is permanently blocked.
    expect(queryByText('Continue')).toBeNull();
  });

  it('blocks under-16: shows error, persists rejection, transitions to rejected screen', async () => {
    const currentYear = new Date().getFullYear();
    const under16Year = currentYear - 10; // 10 years old → clearly under-16.

    const { findByText, getByText, getByLabelText } = renderAgeGate();

    // Wait for the gate to be in pending state.
    await findByText("What's your date of birth?");

    // Open the year picker and select a year that is under 16.
    fireEvent.press(getByLabelText('Change year of birth'));
    fireEvent.press(getByLabelText(`Year ${under16Year}`));

    // Press Continue — should trigger rejection.
    fireEvent.press(getByText('Continue'));

    // setItem should be called to persist rejection.
    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(AGE_GATE_REJECTED_KEY, '1');
    });

    // Screen transitions to permanent rejection state.
    await findByText('Age requirement not met');
  });

  it('allows >=16: persists passed state and calls onContinue', async () => {
    const currentYear = new Date().getFullYear();
    const over16Year = currentYear - 20; // 20 years old → clearly over-16.

    const onContinue = jest.fn();
    const { findByText, getByText, getByLabelText } = renderAgeGate({ onContinue });

    // Wait for the gate to be in pending state.
    await findByText("What's your date of birth?");

    // Open the year picker and select a year that is >=16.
    fireEvent.press(getByLabelText('Change year of birth'));
    fireEvent.press(getByLabelText(`Year ${over16Year}`));

    // Press Continue.
    fireEvent.press(getByText('Continue'));

    // setItem should be called to persist passed state.
    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(AGE_GATE_PASSED_KEY, '1');
    });

    // onContinue fires after persistence.
    await waitFor(() => {
      expect(onContinue).toHaveBeenCalledTimes(1);
    });
  });

  it('no TextInput is rendered (passive-recognition invariant)', async () => {
    const { UNSAFE_queryAllByType, findByText } = renderAgeGate();
    await findByText("What's your date of birth?");

    const { TextInput } = require('react-native');
    expect(UNSAFE_queryAllByType(TextInput)).toHaveLength(0);
  });
});
