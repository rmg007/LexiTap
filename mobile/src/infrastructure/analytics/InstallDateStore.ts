import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'lexitap.install_date';

export async function getOrSetInstallDate(): Promise<number> {
  const stored = await AsyncStorage.getItem(KEY);
  if (stored) return parseInt(stored, 10);
  const now = Date.now();
  await AsyncStorage.setItem(KEY, String(now));
  return now;
}

export function daysSince(installMs: number): number {
  return Math.floor((Date.now() - installMs) / (1000 * 60 * 60 * 24));
}
