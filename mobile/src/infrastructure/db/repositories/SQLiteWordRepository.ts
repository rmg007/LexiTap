import type { WordRepository, WordWithProgress } from '@/domain/vocabulary/WordRepository';
import type { Word, WordSense } from '@/domain/vocabulary/Word';
import type { TierId, WordId } from '@/domain/vocabulary/ids';
import type { DatabaseHandle } from '@/infrastructure/db/database';
import { mapWordRow, mapUserProgressRow, mapSenseRows } from '@/infrastructure/db/mappers';
import {
  selectWordsDueForReview,
  selectNewWords,
  selectWordById,
  selectWordsByTier,
  selectSensesForWord,
  joinRowToProgressRow,
} from '@/infrastructure/db/queries/wordQueries';

// SQLite implementation of the WordRepository port. Reads content from the
// ATTACHed read-only words.db joined with the writable user_progress, and maps
// rows to domain types. `now` for the due-filter is sourced from Date.now() so
// the query stays a pure parameterized SELECT (DATABASE_SCHEMA.md convention 5).
export class SQLiteWordRepository implements WordRepository {
  constructor(private readonly db: DatabaseHandle) {}

  async getWordsDueForReview(tierId: TierId, limit: number): Promise<WordWithProgress[]> {
    const rows = await selectWordsDueForReview(this.db, tierId, Date.now(), limit);
    return rows.map((row) => ({
      word: mapWordRow(row),
      progress: mapUserProgressRow(joinRowToProgressRow(row)),
    }));
  }

  async getNewWords(tierId: TierId, limit: number): Promise<Word[]> {
    const rows = await selectNewWords(this.db, tierId, limit);
    return rows.map(mapWordRow);
  }

  async getById(id: WordId): Promise<Word | null> {
    const row = await selectWordById(this.db, id);
    return row === null ? null : mapWordRow(row);
  }

  async getWordsByTier(tierId: TierId): Promise<Word[]> {
    const rows = await selectWordsByTier(this.db, tierId);
    return rows.map(mapWordRow);
  }

  // Fail-soft: a content DB built before the rich-detail schema has no
  // word_senses/sense_examples tables, so the query throws. Resolve to [] rather
  // than break the detail screen — it falls back to the flat definition. Same
  // tolerance as SQLitePseudoWordRepository (DIAG-A).
  async getSensesForWord(id: WordId): Promise<WordSense[]> {
    try {
      const rows = await selectSensesForWord(this.db, id);
      return mapSenseRows(rows);
    } catch {
      return [];
    }
  }
}
