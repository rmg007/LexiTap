import type { DatabaseHandle } from '@/infrastructure/db/database';
import type { SavedWordListRow } from '@/infrastructure/db/rows';

// Named, parameterized queries for saved_words (WORD_FEEDBACK_PLAN §2). The ONLY
// place these SQL strings live; ? placeholders only, never interpolation.
//
// saved_words is a user.db (MAIN / unqualified) table storing just word_id. The
// list read joins the read-only content DB (ATTACHed AS `contentdb`) for the
// word text/gloss and LEFT JOINs user_progress for the mastery overlay. Because
// saved_words has no tier context (a word belongs to many tiers), the list
// projects a representative tier via a min-tier subquery — the same trick
// selectWordById uses — so mapWordRow's required tier_id is satisfied.

export function insertSavedWord(
  db: DatabaseHandle,
  wordId: string,
  savedAt: number,
  source: string,
): Promise<{ lastInsertRowId: number; changes: number }> {
  // INSERT OR IGNORE => re-saving an already-saved word is a no-op (word_id PK).
  return db.run(
    `INSERT OR IGNORE INTO saved_words (word_id, saved_at, source) VALUES (?, ?, ?)`,
    [wordId, savedAt, source],
  );
}

export function deleteSavedWord(
  db: DatabaseHandle,
  wordId: string,
): Promise<{ lastInsertRowId: number; changes: number }> {
  return db.run(`DELETE FROM saved_words WHERE word_id = ?`, [wordId]);
}

export function selectIsSaved(
  db: DatabaseHandle,
  wordId: string,
): Promise<{ n: number } | null> {
  return db.first<{ n: number }>(
    `SELECT COUNT(*) AS n FROM saved_words WHERE word_id = ?`,
    [wordId],
  );
}

export function selectSavedWordCount(db: DatabaseHandle): Promise<{ n: number } | null> {
  return db.first<{ n: number }>(`SELECT COUNT(*) AS n FROM saved_words`, []);
}

// Keyset page ordered saved_at DESC (newest first), tie-broken by word id ASC.
// First page: pass null cursors. Next page: pass the last row's (saved_at, id).
// The DESC comparator is `saved_at < ?` (NOT `>`), tie-break `w.id > ?` — must
// match ORDER BY exactly or pages drop/duplicate rows. The active filter
// (w.deleted_at IS NULL) hides content removed from study paths. Column list is
// inlined (not a shared const) to keep the query free of ${...} interpolation.
export function selectSavedWordsPage(
  db: DatabaseHandle,
  afterSavedAt: number | null,
  afterWordId: string | null,
  limit: number,
): Promise<SavedWordListRow[]> {
  return db.all<SavedWordListRow>(
    `SELECT
       w.id, w.word, w.definition, w.pos, w.cefr_level, w.grade_level,
       w.word_type, w.difficulty, w.frequency_rank, w.theme, w.example_sentence,
       w.image_path, w.audio_path, w.synonyms, w.antonyms, w.usage_notes,
       w.created_at, w.deleted_at,
       (SELECT wt.tier_id FROM contentdb.word_tiers wt
         WHERE wt.word_id = w.id ORDER BY wt.tier_id LIMIT 1) AS tier_id,
       s.saved_at AS saved_at,
       COALESCE(p.mastery_level, 0) AS mastery_level
     FROM saved_words s
     JOIN contentdb.words w ON w.id = s.word_id AND w.deleted_at IS NULL
     LEFT JOIN user_progress p ON p.word_id = s.word_id
     WHERE (? IS NULL OR (s.saved_at < ? OR (s.saved_at = ? AND w.id > ?)))
     ORDER BY s.saved_at DESC, w.id ASC
     LIMIT ?`,
    [afterSavedAt, afterSavedAt, afterSavedAt, afterWordId, limit],
  );
}
