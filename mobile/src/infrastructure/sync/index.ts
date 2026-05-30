// Public surface of the sync infrastructure module.
// SupabaseSyncService removed (2026-05-28): per-table sync replaced by encrypted
// blob backup (Phase 3+). supabaseClient and SyncError retained for auth/backup.
export { createSupabaseClient } from '@/infrastructure/sync/supabaseClient';
export { SyncError } from '@/infrastructure/sync/errors';
