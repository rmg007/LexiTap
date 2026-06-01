import * as SecureStore from "expo-secure-store";

// SecureStore-backed storage adapter for the Supabase auth client. Tokens are
// the most sensitive data we persist, so they go to the OS keychain/keystore
// (encrypted at rest) rather than AsyncStorage (plaintext). Shape matches
// Supabase's `SupportedStorage` (async getItem/setItem/removeItem).
//
// SecureStore key constraint: keys may only contain alphanumeric chars plus
// ".", "-", and "_". Supabase's default storage key is `sb-<ref>-auth-token`,
// which satisfies this. We never rename it, so no sanitisation is needed.
//
// Fail-soft: read errors resolve to null (treated as "no session" → user is
// asked to sign in again) and write/delete errors are swallowed. A keychain
// failure must never crash the app or surface a raw native error.
export interface SecureStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export const secureStoreAdapter: SecureStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // Swallow: a keychain write failure must not crash the app. Worst case
      // the session is not persisted and the user re-authenticates next launch.
    }
  },
  async removeItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // Swallow: failing to clear a token must not crash sign-out.
    }
  },
};
