import AsyncStorage from '@react-native-async-storage/async-storage';

// anon_id is analytics infrastructure, not user learning data — lives here
// rather than AsyncStorageAdapter. Generated once on first launch, persisted
// forever. Never tied to any PII; it is the only identifier passed to PostHog.

const KEY = 'lexitap.anon_id';

function generateUuidV4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export async function getOrCreateAnonId(): Promise<string> {
  const existing = await AsyncStorage.getItem(KEY);
  if (existing) return existing;
  const id = generateUuidV4();
  await AsyncStorage.setItem(KEY, id);
  return id;
}
