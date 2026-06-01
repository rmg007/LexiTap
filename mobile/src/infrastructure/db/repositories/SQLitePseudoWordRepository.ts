import type { PseudoWord, PseudoWordRepository } from '@/domain/onboarding/PseudoWord';
import type { DatabaseHandle } from '@/infrastructure/db/database';
import { mapPseudoWordRow } from '@/infrastructure/db/mappers';
import { selectPseudoWords } from '@/infrastructure/db/queries/wordQueries';

// SQLite implementation of the PseudoWordRepository port (DIAG-A). Reads from the
// ATTACHed read-only content DB (`contentdb.pseudo_words`). Fail-soft: a content
// DB built before the DIAG-A schema has no pseudo_words table, so a query error
// resolves to an empty list rather than breaking onboarding — the diagnostic
// simply runs without a lie detector (false-alarm rate 0).
export class SQLitePseudoWordRepository implements PseudoWordRepository {
  constructor(private readonly db: DatabaseHandle) {}

  async getPseudoWords(limit: number): Promise<PseudoWord[]> {
    try {
      const rows = await selectPseudoWords(this.db, limit);
      return rows.map(mapPseudoWordRow);
    } catch {
      return [];
    }
  }
}
