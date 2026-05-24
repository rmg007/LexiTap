// Sync PORT. Implemented in infrastructure/sync (Supabase). Last-write-wins by
// last_reviewed_at; the cloud is a mirror, never the authority. push/pull are
// transactional in the adapter.

export interface SyncService {
  pull(userId: string): Promise<void>;
  push(userId: string, sinceCursor: number): Promise<void>;
}
