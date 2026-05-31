import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAnalyticsOptOut, setAnalyticsOptOut } from './AnalyticsOptOutStore';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage');

describe('AnalyticsOptOutStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAnalyticsOptOut', () => {
    it('returns false when opt-out is not set', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await getAnalyticsOptOut();

      expect(result).toBe(false);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('lexitap.analytics_opt_out');
    });

    it('returns true when opt-out is set to "true"', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');

      const result = await getAnalyticsOptOut();

      expect(result).toBe(true);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('lexitap.analytics_opt_out');
    });

    it('returns false on storage failure (fail-closed)', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const result = await getAnalyticsOptOut();

      expect(result).toBe(false);
    });
  });

  describe('setAnalyticsOptOut', () => {
    it('sets the opt-out flag to "true" when passed true', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await setAnalyticsOptOut(true);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith('lexitap.analytics_opt_out', 'true');
    });

    it('removes the opt-out flag when passed false', async () => {
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

      await setAnalyticsOptOut(false);

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('lexitap.analytics_opt_out');
    });

    it('swallows storage errors on set', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      await expect(setAnalyticsOptOut(true)).resolves.toBeUndefined();
    });

    it('swallows storage errors on remove', async () => {
      (AsyncStorage.removeItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      await expect(setAnalyticsOptOut(false)).resolves.toBeUndefined();
    });
  });
});
