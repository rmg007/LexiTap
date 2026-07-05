import { SQLiteActiveSessionRepository } from '@/infrastructure/db/repositories/SQLiteActiveSessionRepository';
import type { DatabaseHandle } from '@/infrastructure/db/database';
import type { ActiveSession } from '@/domain/user/ActiveSession';
import type { ActiveSessionRow } from '@/infrastructure/db/rows';
import { asWordId, asTierId } from '@/domain/vocabulary/ids';
import type { Word } from '@/domain/vocabulary/Word';

function word(id: string): Word {
  return {
    id: asWordId(id),
    word: id,
    definition: 'd',
    tierId: asTierId('foundation'),
    wordType: 'vocabulary',
    exampleSentence: '_ x',
    synonyms: [],
    antonyms: [],
    isDeleted: false,
  };
}

// In-memory single-row stub: upsert stores the row, first reads it, run(DELETE)
// clears it. Enough to prove the repo round-trips through the JSON payload.
function memHandle(): DatabaseHandle {
  let row: ActiveSessionRow | null = null;
  return {
    all: jest.fn(),
    first: jest.fn(async () => row as never),
    run: jest.fn(async (sql: string, params: unknown[]) => {
      if (/^\s*DELETE/i.test(sql)) {
        row = null;
      } else {
        // upsert: [id, kind, tier_id, payload, updated_at]
        row = {
          id: 1,
          kind: params[1] as string,
          tier_id: params[2] as string,
          payload: params[3] as string,
          updated_at: params[4] as number,
        };
      }
      return { lastInsertRowId: 1, changes: 1 };
    }),
    transaction: jest.fn(),
  } as unknown as DatabaseHandle;
}

describe('SQLiteActiveSessionRepository', () => {
  const snapshot: ActiveSession = {
    kind: 'learn',
    tierId: 'foundation',
    batch: [word('a'), word('b'), word('c')],
    stage: 'card',
    index: 1,
  };

  it('round-trips a snapshot through the JSON payload', async () => {
    const repo = new SQLiteActiveSessionRepository(memHandle());
    await repo.save(snapshot);
    const got = await repo.get();
    expect(got).toEqual(snapshot);
  });

  it('get() on an empty table returns null', async () => {
    const repo = new SQLiteActiveSessionRepository(memHandle());
    expect(await repo.get()).toBeNull();
  });

  it('clear() removes the snapshot', async () => {
    const db = memHandle();
    const repo = new SQLiteActiveSessionRepository(db);
    await repo.save(snapshot);
    await repo.clear();
    expect(await repo.get()).toBeNull();
  });

  it('maps a corrupt payload to null (defensive, never throws)', async () => {
    const corruptRow: ActiveSessionRow = {
      id: 1,
      kind: 'learn',
      tier_id: 'foundation',
      payload: 'not json{{',
      updated_at: 1,
    };
    const db = {
      all: jest.fn(),
      first: jest.fn(async () => corruptRow),
      run: jest.fn(),
      transaction: jest.fn(),
    } as unknown as DatabaseHandle;
    const repo = new SQLiteActiveSessionRepository(db);
    expect(await repo.get()).toBeNull();
  });
});
