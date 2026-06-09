import type { Word, ContentTier, WordSense } from '@/domain/vocabulary/Word';
import type { TierId, WordId } from '@/domain/vocabulary/ids';
import type { UserProgress } from '@/domain/user/UserProgress';

// Word joined with the caller's progress — the review-queue shape
// (DATA_MODELS.md). Built by the infrastructure layer via an ATTACH join.
export interface WordWithProgress {
  word: Word;
  progress: UserProgress;
}

// PORT implemented in infrastructure/db. Use cases depend only on this.
export interface WordRepository {
  // Active words (deleted_at IS NULL) joined with progress, due for review.
  getWordsDueForReview(tierId: TierId, limit: number): Promise<WordWithProgress[]>;
  // Active words the user has never seen, for the learn flow.
  getNewWords(tierId: TierId, limit: number): Promise<Word[]>;
  // Unfiltered (includes soft-deleted) for history/replay render.
  getById(id: WordId): Promise<Word | null>;
  // Active words in a tier, for distractor pools and tier browsing.
  getWordsByTier(tierId: TierId): Promise<Word[]>;
  // Rich detail layer (additive). The distinct senses of a word, each with felt
  // explanation + teaching examples, ordered by sense_index. Empty for
  // un-backfilled words OR a content DB predating the rich-detail schema
  // (fail-soft) — the detail screen then falls back to the flat definition.
  getSensesForWord(id: WordId): Promise<WordSense[]>;
}

export interface ContentTierRepository {
  getAll(): Promise<ContentTier[]>;
  getById(id: TierId): Promise<ContentTier | null>;
}
