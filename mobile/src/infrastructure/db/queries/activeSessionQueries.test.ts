import {
  selectActiveSession,
  upsertActiveSession,
  deleteActiveSession,
} from '@/infrastructure/db/queries/activeSessionQueries';
import type { DatabaseHandle } from '@/infrastructure/db/database';

function stubHandle(): {
  db: DatabaseHandle;
  run: jest.Mock;
  first: jest.Mock;
} {
  const run = jest.fn().mockResolvedValue({ lastInsertRowId: 0, changes: 1 });
  const first = jest.fn().mockResolvedValue(null);
  const db = { run, first, all: jest.fn(), transaction: jest.fn() } as unknown as DatabaseHandle;
  return { db, run, first };
}

describe('activeSessionQueries', () => {
  it('selectActiveSession reads the single row (id = 1)', async () => {
    const { db, first } = stubHandle();
    await selectActiveSession(db);
    const [sql, params] = first.mock.calls[0]!;
    expect(sql).toContain('FROM active_session WHERE id = ?');
    expect(params).toEqual([1]);
  });

  it('upsertActiveSession INSERT ... ON CONFLICT(id) with id=1 bound', async () => {
    const { db, run } = stubHandle();
    await upsertActiveSession(db, {
      kind: 'learn',
      tierId: 'foundation',
      payload: '{"batch":[],"stage":"card","index":0}',
      updatedAt: 999,
    });
    const [sql, params] = run.mock.calls[0]!;
    expect(sql).toContain('INSERT INTO active_session');
    expect(sql).toContain('ON CONFLICT(id) DO UPDATE SET');
    expect(sql).not.toContain('${');
    expect(params).toEqual([1, 'learn', 'foundation', '{"batch":[],"stage":"card","index":0}', 999]);
  });

  it('deleteActiveSession removes the single row', async () => {
    const { db, run } = stubHandle();
    await deleteActiveSession(db);
    const [sql, params] = run.mock.calls[0]!;
    expect(sql).toContain('DELETE FROM active_session WHERE id = ?');
    expect(params).toEqual([1]);
  });
});
