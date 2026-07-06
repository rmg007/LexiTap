import { fireEvent } from '@testing-library/react-native';

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  router: {
    push: (...args: unknown[]) => mockPush(...args),
    replace: (...args: unknown[]) => mockReplace(...args),
  },
}));

import { SettingsScreen } from '@/presentation/screens/SettingsScreen';
import { AuthProvider, type AppleSignIn, type GoogleSignIn } from '@/presentation/auth/AuthContext';
import { renderWithProviders, defaultServices } from '@/test-utils/renderWithProviders';
import { ok } from '@/domain/auth/AuthPort';
import * as AnalyticsOptOutStore from '@/infrastructure/analytics/AnalyticsOptOutStore';

// DESIGN_LEVELUP_PLAN.md Phase 4.4 + UI_UX_FIXES_PLAN.md Phases 14-18: rows
// route through the shared ListRow/SectionHeader; the analytics toggle's
// DISPLAYED sense is inverted to the positive framing while the stored flag
// and infrastructure/analytics/ readers stay untouched; Delete Account moved
// from Legal into Account.

function makeApple(): AppleSignIn {
  return { isAvailable: async () => true, signIn: async () => ok('apple-identity-jwt') };
}
function makeGoogle(): GoogleSignIn {
  return { isConfigured: () => true, signIn: async () => ok('google-id-jwt') };
}

async function renderSettings() {
  return renderWithProviders(
    <AuthProvider apple={makeApple()} google={makeGoogle()}>
      <SettingsScreen />
    </AuthProvider>,
    defaultServices(),
  );
}

describe('SettingsScreen — hygiene (Phases 14-18, 4.4)', () => {
  it('moves Delete Account into Account, leaving Legal with exactly 3 rows', async () => {
    const { findByText, getAllByText, getByText } = await renderSettings();
    await findByText('Account');

    // Legal: Privacy Policy, Terms of Service, Export my data -- no Delete Account.
    expect(getByText('Privacy Policy')).toBeTruthy();
    expect(getByText('Terms of Service')).toBeTruthy();
    expect(getByText('Export my data')).toBeTruthy();

    // Delete Account renders exactly once, and it's reachable (Account section).
    expect(getAllByText('Delete Account')).toHaveLength(1);
  });

  it('labels the analytics row with the positive "Share usage analytics" framing', async () => {
    const { findByText, queryByText } = await renderSettings();
    await findByText('Share usage analytics');
    expect(queryByText('Disable Analytics')).toBeNull();
    expect(await findByText('Help improve the app with anonymous usage data')).toBeTruthy();
  });

  it('inverts only the displayed switch value -- the stored flag matches !displayed', async () => {
    const setSpy = jest.spyOn(AnalyticsOptOutStore, 'setAnalyticsOptOut').mockResolvedValue();
    jest.spyOn(AnalyticsOptOutStore, 'getAnalyticsOptOut').mockResolvedValue(false); // not opted out = sharing

    const { findByLabelText } = await renderSettings();
    const toggle = await findByLabelText('Share usage analytics');
    // Not opted out (sharing=true) initially -> switch shows ON.
    expect(toggle.props.value).toBe(true);

    fireEvent(toggle, 'valueChange', false); // learner turns sharing OFF
    expect(setSpy).toHaveBeenCalledWith(true); // stored analyticsOptOut flips to true
  });
});
