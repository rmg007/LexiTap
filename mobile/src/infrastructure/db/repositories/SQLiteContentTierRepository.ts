import type { ContentTierRepository } from '@/domain/vocabulary/WordRepository';
import type { ContentTier } from '@/domain/vocabulary/Word';
import type { TierId } from '@/domain/vocabulary/ids';
import type { DatabaseHandle } from '@/infrastructure/db/database';
import { mapContentTierRow } from '@/infrastructure/db/mappers';
import { selectAllTiers, selectTierById } from '@/infrastructure/db/queries/wordQueries';

// SQLite implementation of the ContentTierRepository port. Tier metadata lives
// in the read-only words.db (ATTACHed as contentdb).
export class SQLiteContentTierRepository implements ContentTierRepository {
  constructor(private readonly db: DatabaseHandle) {}

  async getAll(): Promise<ContentTier[]> {
    const rows = await selectAllTiers(this.db);
    return rows.map(mapContentTierRow);
  }

  async getById(id: TierId): Promise<ContentTier | null> {
    const row = await selectTierById(this.db, id);
    return row === null ? null : mapContentTierRow(row);
  }
}
