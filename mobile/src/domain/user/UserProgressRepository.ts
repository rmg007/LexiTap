import type { WordId, TierId } from '@/domain/vocabulary/ids';
import type { UserProgress } from '@/domain/user/UserProgress';

// PORT implemented in infrastructure/db. Append-only invariant lives in
// quiz_attempts, not here — user_progress is the mutable SRS state.
export interface UserProgressRepository {
  get(wordId: WordId): Promise<UserProgress | null>;
  upsert(progress: UserProgress): Promise<void>;
  countDue(tierId: TierId, now: number): Promise<number>;
}
