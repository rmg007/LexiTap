import type { BackupPort } from '@/domain/backup/BackupPort';
import { NoopBackupService } from './NoopBackupService';
import { isBackupConfigured } from './backupEnv';

// Factory. Returns SupabaseBackupService when both EXPO_PUBLIC_SUPABASE_URL and
// EXPO_PUBLIC_SUPABASE_ANON_KEY are set (env-gate: prod-allowed when the backend
// is configured); otherwise NoopBackupService. Mirrors createAnalyticsService.
//
// The env-gate is the build-time enforcement point: dev/test builds with no
// Supabase config get the Noop and never reach for the network or filesystem.
// (SupabaseBackupService also re-checks the gate per call as a defensive
// belt-and-braces, so a misconfigured wiring still fails closed.) The gate read
// lives in backupEnv.isBackupConfigured so prod-inlining and Jest agree (see
// that module's comment).
export function createBackupService(): BackupPort {
  if (!isBackupConfigured()) {
    return new NoopBackupService();
  }

  // Dynamic require keeps the Supabase SDK (and its native deps) out of the
  // module graph when the env-gate is closed — same pattern as the analytics
  // factory. createSupabaseClient reads the same env vars and owns auth/session;
  // we borrow only its `.storage` surface so backup never duplicates auth.
  const { createSupabaseClient } =
    require('@/infrastructure/sync/supabaseClient') as typeof import('@/infrastructure/sync/supabaseClient');
  const { SupabaseBackupService } =
    require('./SupabaseBackupService') as typeof import('./SupabaseBackupService');
  return new SupabaseBackupService(createSupabaseClient().storage);
}
