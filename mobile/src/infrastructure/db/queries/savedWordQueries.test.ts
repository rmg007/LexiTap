import {
  insertSavedWord,
  deleteSavedWord,
  selectIsSaved,
  selectSavedWordCount,
  selectSavedWordsPage,
} from '@/infrastructure/db/queries/savedWordQueries';
import type { DatabaseHandle } from '@/infrastructure/db/database';

// Stub the handle so we can assert the exact SQL + bound params without a real
// DB. The load-bearing checks: parameterized (no ${...} interpolation of values)
// and the keyset comparator/order match (DESC saved_at, ASC word id).

function stubHandle(): {
  db: DatabaseHandle;
  run: jest.Mock;
  first: jest.Mock;
  all: jest.Mock;
} {
  const run = jest.fn().mockResolvedValue({ lastInsertRowId: 0, changes: 1 });
  const first = jest.fn().mockResolvedValue(null);
  const all = jest.fn().mockResolvedValue([]);
  const db = { run, first, all, transaction: jest.fn() } as unknown as DatabaseHandle;
  return { db, run, first, all };
}

describe('savedWordQueries', () => {
  it('insertSavedWord uses INSERT OR IGNORE with [wordId, savedAt, source] bound', async () => {
    const { db, run } = stubHandle();
    await insertSavedWord(db, 'w1', 1234, 'learn');
    const [sql, params] = run.mock.calls[0]!;
    expect(sql).toContain('INSERT OR IGNORE INTO saved_words');
    expect(sql).not.toContain('${'); // no interpolation
    expect(params).toEqual(['w1', 1234, 'learn']);
  });

  it('deleteSavedWord binds [wordId]', async () => {
    const { db, run } = stubHandle();
    await deleteSavedWord(db, 'w1');
    const [sql, params] = run.mock.calls[0]!;
    expect(sql).toContain('DELETE FROM saved_words WHERE word_id = ?');
    expect(params).toEqual(['w1']);
  });

  it('selectIsSaved binds [wordId] and counts', async () => {
    const { db, first } = stubHandle();
    await selectIsSaved(db, 'w9');
    const [sql, params] = first.mock.calls[0]!;
    expect(sql).toContain('SELECT COUNT(*) AS n FROM saved_words WHERE word_id = ?');
    expect(params).toEqual(['w9']);
  });

  it('selectSavedWordCount binds nothing', async () => {
    const { db, first } = stubHandle();
    await selectSavedWordCount(db);
    const [sql, params] = first.mock.calls[0]!;
    expect(sql).toContain('SELECT COUNT(*) AS n FROM saved_words');
    expect(params).toEqual([]);
  });

  it('selectSavedWordsPage orders DESC/ASC, filters active, joins contentdb, binds keyset', async () => {
    const { db, all } = stubHandle();
    await selectSavedWordsPage(db, 5000, 'w5', 20);
    const [sql, params] = all.mock.calls[0]!;
    expect(sql).toContain('FROM saved_words s');
    expect(sql).toContain('JOIN contentdb.words w');
    expect(sql).toContain('w.deleted_at IS NULL');
    expect(sql).toContain('ORDER BY s.saved_at DESC, w.id ASC');
    // DESC keyset comparator (strictly-older, tie-broken by later id)
    expect(sql).toContain('s.saved_at < ?');
    expect(sql).not.toContain('${');
    // [afterSavedAt, afterSavedAt, afterSavedAt, afterWordId, limit]
    expect(params).toEqual([5000, 5000, 5000, 'w5', 20]);
  });

  it('selectSavedWordsPage first page passes null cursors', async () => {
    const { db, all } = stubHandle();
    await selectSavedWordsPage(db, null, null, 20);
    const [, params] = all.mock.calls[0]!;
    expect(params).toEqual([null, null, null, null, 20]);
  });
});
