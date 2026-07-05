import {
  openDatabaseAsync,
  type SQLiteDatabase,
  type SQLiteBindParams,
} from 'expo-sqlite';
import { pendingMigrations } from '@/infrastructure/db/migrations';
import { installContentDb, contentDbAttachPath } from '@/infrastructure/db/contentDb';

// Typed handle over the single live SQLite connection. The connection is opened
// on the read-write user.db; the read-only content words.db is ATTACHed as
// `userdb`... actually the reverse — see openDatabase below. Repositories take
// this handle in their constructor and never call expo-sqlite directly.
//
// We expose a thin, intention-revealing surface (all/first/run/transaction)
// rather than the raw SQLiteDatabase so the query functions stay the only
// place SQL strings live and so the transaction seam is explicit.
export interface DatabaseHandle {
  // SELECT returning many rows, mapped by the caller.
  all<T>(sql: string, params: SQLiteBindParams): Promise<T[]>;
  // SELECT returning a single row or null.
  first<T>(sql: string, params: SQLiteBindParams): Promise<T | null>;
  // INSERT/UPDATE; returns lastInsertRowId + changes.
  run(sql: string, params: SQLiteBindParams): Promise<{ lastInsertRowId: number; changes: number }>;
  // Atomic unit of work (e.g. the AnswerQuestion path: append attempt + update
  // progress + insert event_log). Commits on resolve, rolls back on throw.
  transaction(work: (tx: DatabaseHandle) => Promise<void>): Promise<void>;
}

// Wrap a SQLiteDatabase (or a transaction context, which has the same surface)
// in the DatabaseHandle interface.
function wrap(db: SQLiteDatabase): DatabaseHandle {
  return {
    all: <T>(sql: string, params: SQLiteBindParams) => db.getAllAsync<T>(sql, params),
    first: <T>(sql: string, params: SQLiteBindParams) => db.getFirstAsync<T>(sql, params),
    run: async (sql: string, params: SQLiteBindParams) => {
      const r = await db.runAsync(sql, params);
      return { lastInsertRowId: r.lastInsertRowId, changes: r.changes };
    },
    transaction: (work) =>
      db.withTransactionAsync(async () => {
        // expo-sqlite's withTransactionAsync runs `task` against the same `db`
        // connection inside a transaction, so reusing `wrap(db)` is correct.
        await work(wrap(db));
      }),
  };
}

// user.db is created/persisted in the app's writable SQLite directory by
// expo-sqlite, which resolves it by name. The read-only content words.db is
// ATTACHed by ABSOLUTE path instead (see contentDbAttachPath / the ATTACH below).
const USER_DB_NAME = 'user.db';

// Run forward-only migrations on user.db, gating each step on PRAGMA
// user_version. Pure version-selection logic lives in migrations/index.ts
// (pendingMigrations); this function performs the I/O.
async function applyMigrations(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version', []);
  const current = row?.user_version ?? 0;
  for (const migration of pendingMigrations(current)) {
    await db.withExclusiveTransactionAsync(async (tx) => {
      await tx.execAsync(migration.sql);
      // Bump user_version INSIDE the same transaction so the schema change and
      // the version write commit atomically. If the process is killed anywhere
      // in here, SQLite rolls the whole thing back — so a half-applied migration
      // can never survive to replay on the next launch. That matters because a
      // migration may contain a non-idempotent statement (e.g. 003's
      // `ALTER TABLE ... ADD COLUMN`, which has no IF NOT EXISTS and throws
      // `duplicate column name` on a second run); a non-atomic bump left exactly
      // that replay window, which could brick startup. user_version is a header
      // field and participates in the transaction. It cannot be parameterized;
      // the value is an internal integer constant from our own ledger.
      await tx.execAsync(`PRAGMA user_version = ${migration.version}`);
    });
  }
}

// Bootstrap entry point. Integration owner calls this from container.ts at
// launch and passes the returned handle to every repository constructor.
//
// Open/ATTACH sequence:
//   0. Install the bundled content DB: copy words.db out of the app bundle into
//      expo-sqlite's directory if missing or stale. expo-sqlite does NOT read
//      from the bundle, so without this ATTACH would silently create an EMPTY
//      words.db and every content query would return zero rows (the C0 bug).
//   1. Open the read-write user.db as the MAIN connection (it is the only one
//      we ever write to, and runs the migrations).
//   2. ATTACH the now-present read-only words.db as `contentdb` so cross-DB
//      joins (review queue, history render) can reach content from the writable
//      connection. The schema docs phrase the join as words.db-main +
//      userdb-attached; functionally the ATTACH join is symmetric, and making
//      user.db the main connection keeps all writes/migrations on one handle.
//   3. Apply forward-only migrations gated by PRAGMA user_version.
//
// Query functions reference content tables as `contentdb.words` /
// `contentdb.content_tiers` and user tables unqualified (main).
export async function openDatabase(): Promise<DatabaseHandle> {
  // Step 0: must complete before ATTACH (see note above).
  await installContentDb();
  const db = await openDatabaseAsync(USER_DB_NAME);
  await db.execAsync('PRAGMA foreign_keys = ON');
  // ATTACH the bundled content DB read-only, by ABSOLUTE path. A bare name
  // ('words.db') is resolved by SQLite against the process CWD (app-bundle root
  // on iOS), not expo-sqlite's dir, so it fails to open on-device even though
  // installContentDb() just placed the file there — that was the C0 bug.
  await db.execAsync(`ATTACH DATABASE '${contentDbAttachPath()}' AS contentdb`);
  await applyMigrations(db);
  return wrap(db);
}
