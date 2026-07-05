import type {
  SavedWordRepository,
  SavedWordListItem,
  SavedWordSource,
} from '@/domain/user/SavedWord';
import type { WordId } from '@/domain/vocabulary/ids';
import type { DatabaseHandle } from '@/infrastructure/db/database';
import { mapSavedWordListRow } from '@/infrastructure/db/mappers';
import {
  insertSavedWord,
  deleteSavedWord,
  selectIsSaved,
  selectSavedWordCount,
  selectSavedWordsPage,
} from '@/infrastructure/db/queries/savedWordQueries';

// SQLite implementation of SavedWordRepository. Thin: delegates to the named
// queries and maps rows (mirrors SQLiteUserStatsRepository / SQLiteUserProgress).
export class SQLiteSavedWordRepository implements SavedWordRepository {
  constructor(private readonly db: DatabaseHandle) {}

  async isSaved(wordId: WordId): Promise<boolean> {
    const row = await selectIsSaved(this.db, wordId);
    return (row?.n ?? 0) > 0;
  }

  async save(wordId: WordId, source: SavedWordSource, nowMs: number): Promise<void> {
    await insertSavedWord(this.db, wordId, nowMs, source);
  }

  async unsave(wordId: WordId): Promise<void> {
    await deleteSavedWord(this.db, wordId);
  }

  async count(): Promise<number> {
    const row = await selectSavedWordCount(this.db);
    return row?.n ?? 0;
  }

  async listPage(
    afterSavedAt: number | null,
    afterWordId: string | null,
    limit: number,
  ): Promise<SavedWordListItem[]> {
    const rows = await selectSavedWordsPage(this.db, afterSavedAt, afterWordId, limit);
    return rows.map(mapSavedWordListRow);
  }
}
