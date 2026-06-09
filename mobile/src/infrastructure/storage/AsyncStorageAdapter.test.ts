import AsyncStorage from '@react-native-async-storage/async-storage';
import { AsyncStorageAdapter } from './AsyncStorageAdapter';

jest.mock('@react-native-async-storage/async-storage');

const RESTORE_PENDING_KEY = 'lexitap.backup.restorePending';

describe('AsyncStorageAdapter — pending restore flag', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getPendingRestore returns false when the flag is unset', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    await expect(new AsyncStorageAdapter().getPendingRestore()).resolves.toBe(false);
    expect(AsyncStorage.getItem).toHaveBeenCalledWith(RESTORE_PENDING_KEY);
  });

  it('getPendingRestore returns true only for the exact "1" marker', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('1');
    await expect(new AsyncStorageAdapter().getPendingRestore()).resolves.toBe(true);

    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');
    await expect(new AsyncStorageAdapter().getPendingRestore()).resolves.toBe(false);
  });

  it('setPendingRestore writes the "1" marker to the flag key', async () => {
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

    await new AsyncStorageAdapter().setPendingRestore();

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(RESTORE_PENDING_KEY, '1');
  });

  it('clearPendingRestore removes the flag key', async () => {
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

    await new AsyncStorageAdapter().clearPendingRestore();

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(RESTORE_PENDING_KEY);
  });
});
