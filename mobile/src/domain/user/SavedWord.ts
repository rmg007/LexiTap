import type { WordId } from '@/domain/vocabulary/ids';
import type { Word } from '@/domain/vocabulary/Word';
import type { MasteryLevel } from '@/domain/user/UserProgress';

// Saved / bookmarked words (WORD_FEEDBACK_PLAN §2). A word the learner flagged to
// review later — a mutable personal list, decoupled from the SRS scheduler (a
// save never perturbs next_review_date or the forgiveness cap). Persisted in
// user.db `saved_words` (word_id PK => idempotent save, hard-delete on unsave;
// no soft-delete because a bookmark is not replay/audit state).

// Where the save originated — descriptive only, for future analytics/tuning.
export type SavedWordSource = 'manual' | 'learn' | 'quiz' | 'browser';

export interface SavedWord {
  wordId: WordId;
  savedAt: number; // epoch ms
  source: SavedWordSource;
}

// A saved word joined to its content for the Saved-words list (word text +
// gloss come from contentdb.words; masteryLevel overlays current progress).
export interface SavedWordListItem {
  word: Word;
  savedAt: number;
  masteryLevel: MasteryLevel;
}

export interface SavedWordRepository {
  isSaved(wordId: WordId): Promise<boolean>;
  // Idempotent (INSERT OR IGNORE) — re-saving a word is a no-op, not a throw.
  save(wordId: WordId, source: SavedWordSource, nowMs: number): Promise<void>;
  unsave(wordId: WordId): Promise<void>;
  count(): Promise<number>;
  // Keyset page ordered saved_at DESC (newest first), tie-broken by word id ASC.
  // Pass null cursors for the first page; subsequent pages pass the last item's
  // (savedAt, word.id).
  listPage(
    afterSavedAt: number | null,
    afterWordId: string | null,
    limit: number,
  ): Promise<SavedWordListItem[]>;
}
