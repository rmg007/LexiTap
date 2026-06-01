// The factory dynamically require()s the Supabase client + service only when the
// env-gate is open. We mock the SDK client + the service constructor so the
// env→Supabase branch never touches real native modules, and we mock the gate
// (isBackupConfigured) directly rather than fighting babel-preset-expo's
// build-time inlining of EXPO_PUBLIC_* dot-reads (which makes runtime
// process.env mutation ineffective for those vars — see SupabaseBackupService).
jest.mock('@/infrastructure/sync/supabaseClient', () => ({
  __esModule: true,
  createSupabaseClient: jest.fn(),
}));
jest.mock('./SupabaseBackupService', () => ({
  __esModule: true,
  SupabaseBackupService: jest.fn(),
}));
jest.mock('./backupEnv', () => ({
  __esModule: true,
  isBackupConfigured: jest.fn(),
}));

import { createBackupService } from './createBackupService';
import { NoopBackupService } from './NoopBackupService';
import { createSupabaseClient } from '@/infrastructure/sync/supabaseClient';
import { SupabaseBackupService } from './SupabaseBackupService';
import { isBackupConfigured } from './backupEnv';

const mockIsConfigured = isBackupConfigured as jest.Mock;

describe('createBackupService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns NoopBackupService when the env-gate is closed (vars unset)', () => {
    mockIsConfigured.mockReturnValue(false);

    const service = createBackupService();

    expect(service).toBeInstanceOf(NoopBackupService);
    // Env-gate closed → the SDK is never reached.
    expect(createSupabaseClient).not.toHaveBeenCalled();
    expect(SupabaseBackupService).not.toHaveBeenCalled();
  });

  it('returns SupabaseBackupService wired with the client storage when the gate is open', () => {
    mockIsConfigured.mockReturnValue(true);
    const fakeStorage = { from: jest.fn() };
    (createSupabaseClient as jest.Mock).mockReturnValue({ storage: fakeStorage });

    createBackupService();

    // Auth is NOT duplicated: the factory borrows the existing client's storage.
    expect(createSupabaseClient).toHaveBeenCalledTimes(1);
    expect(SupabaseBackupService).toHaveBeenCalledWith(fakeStorage);
  });
});
