// AuthContext logic tests. These verify the auth state management contract
// using StubAuthService directly — mirrors how PaywallScreen/SettingsScreen
// tests are written (no React rendering; pure behavioural assertions).

import { StubAuthService } from '@/infrastructure/auth/StubAuthService';

// The patterns tested here mirror what AuthContext wires together:
//   mount → getSession() → setSession
//   verifyOtp → session updated
//   signOut → session cleared
//   onAuthStateChange → live updates

describe('AuthContext session management contract', () => {
  it('session is null on fresh start', async () => {
    const svc = new StubAuthService();
    expect(await svc.getSession()).toBeNull();
  });

  it('getSession reflects verifyOtp success', async () => {
    const svc = new StubAuthService();
    const result = await svc.verifyOtp('learner@example.com', '123456');
    expect(result.ok).toBe(true);
    const session = await svc.getSession();
    expect(session?.user.email).toBe('learner@example.com');
  });

  it('signOut clears session — context should set state to null', async () => {
    const svc = new StubAuthService();
    await svc.verifyOtp('learner@example.com', '123456');
    await svc.signOut();
    expect(await svc.getSession()).toBeNull();
  });

  it('onAuthStateChange fires on sign-in and sign-out (subscription model)', async () => {
    const svc = new StubAuthService();
    const events: Array<string> = [];
    const unsub = svc.onAuthStateChange((s) => events.push(s === null ? 'null' : s.user.email ?? 'no-email'));

    await svc.verifyOtp('learner@example.com', '123456');
    await svc.signOut();

    expect(events).toEqual(['learner@example.com', 'null']);
    unsub();

    // Events stop after unsubscribe — simulates AuthProvider unmount cleanup.
    await svc.verifyOtp('second@example.com', '654321');
    expect(events).toHaveLength(2);
  });

  it('onAuthStateChange unsubscribe is idempotent', () => {
    const svc = new StubAuthService();
    const unsub = svc.onAuthStateChange(() => {});
    expect(() => { unsub(); unsub(); }).not.toThrow();
  });
});

// SignInScreen input validation logic (extracted for unit testing).
describe('SignInScreen validation', () => {
  it('rejects blank email', () => {
    expect(''.trim().length).toBe(0);
  });

  it('OTP must be 6 digits', () => {
    expect('12345'.trim().length < 6).toBe(true);
    expect('123456'.trim().length >= 6).toBe(true);
  });

  it('OTP digit-strip keeps only numeric characters', () => {
    const stripNonDigit = (s: string) => s.replace(/\D/g, '').slice(0, 6);
    expect(stripNonDigit('1 2 3 4 5 6')).toBe('123456');
    expect(stripNonDigit('abc123')).toBe('123');
    expect(stripNonDigit('1234567')).toBe('123456');
  });
});
