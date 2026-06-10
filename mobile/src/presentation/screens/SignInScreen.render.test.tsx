import { fireEvent, waitFor } from '@testing-library/react-native';
import { SignInScreen } from '@/presentation/screens/SignInScreen';
import { AuthProvider, type AppleSignIn, type GoogleSignIn } from '@/presentation/auth/AuthContext';
import { renderWithProviders, defaultServices } from '@/test-utils/renderWithProviders';
import { err, ok } from '@/domain/auth/AuthPort';
import type { Result } from '@/domain/auth/AuthPort';

// Render tests for the native provider buttons on SignInScreen (AUTH-1):
// - buttons render only when the provider is available/configured
// - success navigates home; 'cancelled' is a SILENT no-op (no error text)
// - other failures surface the error message (existing magic-link pattern)
//
// expo-router is module-mocked (no navigation container in Jest); the native
// Apple/Google SDKs resolve to src/__mocks__ via jest.config.js, and the
// adapters themselves are injected through AuthProvider's apple/google props.

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  router: { replace: (...args: unknown[]) => mockReplace(...args), push: jest.fn() },
}));

function makeApple(overrides: Partial<AppleSignIn> = {}): AppleSignIn {
  return {
    isAvailable: async () => true,
    signIn: async () => ok('apple-identity-jwt'),
    ...overrides,
  };
}

function makeGoogle(overrides: Partial<GoogleSignIn> = {}): GoogleSignIn {
  return {
    isConfigured: () => true,
    signIn: async () => ok('google-id-jwt'),
    ...overrides,
  };
}

async function renderScreen(apple: AppleSignIn, google: GoogleSignIn) {
  return renderWithProviders(
    <AuthProvider apple={apple} google={google}>
      <SignInScreen />
    </AuthProvider>,
    defaultServices(),
  );
}

// Raw real-timer flush: lets deferred React 19 state updates (async
// availability effect, post-press setState) commit when waitFor has nothing to
// observe — the documented harness pattern for deferred toggles. Deliberately
// NOT act()-wrapped: wrapping it poisons the act environment for the NEXT
// test's render in this file (the subsequent render commits an empty tree).
// Cost: benign "not wrapped in act" console noise on the press-driven updates.
const flush = () => new Promise((r) => setTimeout(r, 50));

describe('SignInScreen native provider buttons (render)', () => {
  beforeEach(() => {
    mockReplace.mockClear();
  });

  it('shows both provider buttons when Apple is available and Google is configured', async () => {
    const utils = await renderScreen(makeApple(), makeGoogle());
    await waitFor(() => expect(utils.getByTestId('apple-sign-in-button')).toBeTruthy());
    expect(utils.getByText('Continue with Google')).toBeTruthy();
    expect(utils.getByText('or')).toBeTruthy();
  });

  it('hides both buttons (and the divider) when neither provider is usable', async () => {
    const utils = await renderScreen(
      makeApple({ isAvailable: async () => false }),
      makeGoogle({ isConfigured: () => false }),
    );
    // Let the async availability effect settle before asserting absence.
    await utils.findByLabelText('Email address');
    await flush();
    expect(utils.queryByTestId('apple-sign-in-button')).toBeNull();
    expect(utils.queryByText('Continue with Google')).toBeNull();
    expect(utils.queryByText('or')).toBeNull();
  });

  it('shows only the Google button when Apple is unavailable', async () => {
    const utils = await renderScreen(
      makeApple({ isAvailable: async () => false }),
      makeGoogle(),
    );
    await utils.findByText('Continue with Google');
    await flush();
    expect(utils.queryByTestId('apple-sign-in-button')).toBeNull();
  });

  it('navigates home after a successful Google sign-in', async () => {
    const utils = await renderScreen(makeApple(), makeGoogle());
    fireEvent.press(await utils.findByText('Continue with Google'));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
  });

  it('navigates home after a successful Apple sign-in', async () => {
    const utils = await renderScreen(makeApple(), makeGoogle());
    const button = await utils.findByTestId('apple-sign-in-button');
    fireEvent.press(button);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
  });

  it("treats 'cancelled' as a silent no-op — no error text, no navigation", async () => {
    const cancelled: Result<string> = err({
      kind: 'cancelled',
      message: 'Sign-in was cancelled.',
    });
    const utils = await renderScreen(
      makeApple(),
      makeGoogle({ signIn: async () => cancelled }),
    );
    fireEvent.press(await utils.findByText('Continue with Google'));
    await flush();
    expect(mockReplace).not.toHaveBeenCalled();
    expect(utils.queryByText('Sign-in was cancelled.')).toBeNull();
  });

  it('surfaces non-cancelled provider failures as error text', async () => {
    const failure: Result<string> = err({
      kind: 'network',
      message: 'Network error. Check your connection.',
    });
    const utils = await renderScreen(
      makeApple(),
      makeGoogle({ signIn: async () => failure }),
    );
    fireEvent.press(await utils.findByText('Continue with Google'));
    await utils.findByText('Network error. Check your connection.');
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
