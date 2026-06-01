import AsyncStorage from '@react-native-async-storage/async-storage';

// Typed wrapper over AsyncStorage for small, flat key-value settings ONLY.
// Source of truth for the user's IANA timezone (mirrored to Supabase, never the
// reverse), the sync cursor (epoch ms of the last successful push), and the
// forgiveness config version tag. NEVER store structured learning data here —
// that lives in user.db (DATABASE_SCHEMA.md / SRS_FORGIVENESS_MECHANICS.md).
//
// Keys are namespaced to avoid collisions with other libraries' AsyncStorage
// usage. Values are stored as plain strings; numbers are (de)serialized here so
// callers get typed accessors.

const KEYS = {
  timezone: 'lexitap.timezone',
  syncCursor: 'lexitap.sync.cursor',
  forgivenessConfigVersion: 'lexitap.forgiveness.config.version',
  onboardingComplete: 'lexitap.onboarding.completed',
  lastBackupAtMs: 'lexitap.backup.lastBackupAtMs',
} as const;

export class AsyncStorageAdapter {
  // The user's IANA timezone (e.g. "America/New_York"). Source of truth for
  // streak boundary evaluation; AsyncStorage, not the device clock or cloud.
  async getTimezone(): Promise<string | null> {
    return AsyncStorage.getItem(KEYS.timezone);
  }

  async setTimezone(tz: string): Promise<void> {
    await AsyncStorage.setItem(KEYS.timezone, tz);
  }

  // Sync cursor: epoch ms of the last successful push. Returns null when never
  // synced (callers treat that as "push everything").
  async getSyncCursor(): Promise<number | null> {
    const raw = await AsyncStorage.getItem(KEYS.syncCursor);
    if (raw === null) return null;
    const n = Number(raw);
    // Guard against a corrupt/non-numeric stored value rather than returning NaN.
    return Number.isFinite(n) ? n : null;
  }

  async setSyncCursor(cursor: number): Promise<void> {
    await AsyncStorage.setItem(KEYS.syncCursor, String(cursor));
  }

  // forgiveness.config.version — tags which parameter set produced behavior
  // (SRS_FORGIVENESS_MECHANICS.md), enabling future tuning as a config change.
  async getForgivenessConfigVersion(): Promise<string | null> {
    return AsyncStorage.getItem(KEYS.forgivenessConfigVersion);
  }

  async setForgivenessConfigVersion(version: string): Promise<void> {
    await AsyncStorage.setItem(KEYS.forgivenessConfigVersion, version);
  }

  // First-run onboarding gate. True once the user has completed (or skipped
  // through) the diagnostic, so the gate never re-shows it. This is a UX flag,
  // not learning data — the seeded mastery itself lives in user.db.
  async isOnboardingComplete(): Promise<boolean> {
    return (await AsyncStorage.getItem(KEYS.onboardingComplete)) === '1';
  }

  async setOnboardingComplete(): Promise<void> {
    await AsyncStorage.setItem(KEYS.onboardingComplete, '1');
  }

  // Epoch ms of the last successful backup upload. Stored per-device (not in
  // user.db) so a restore from backup does not reset the per-device throttle.
  async getLastBackupAtMs(): Promise<number | null> {
    const raw = await AsyncStorage.getItem(KEYS.lastBackupAtMs);
    if (raw === null) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }

  async setLastBackupAtMs(ms: number): Promise<void> {
    await AsyncStorage.setItem(KEYS.lastBackupAtMs, String(ms));
  }
}
