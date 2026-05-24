import { MIGRATION_001_INITIAL_SCHEMA } from '@/infrastructure/db/migrations/001_initial_schema';

// Forward-only migration ledger for user.db. Each entry's `version` is written
// to PRAGMA user_version after its `sql` is applied. Migrations MUST be ordered
// by ascending version and never reordered, edited, or removed once shipped
// (DATABASE_SCHEMA.md "Migration Strategy"). To add schema, append a new entry.

export interface Migration {
  readonly version: number;
  readonly name: string;
  readonly sql: string;
}

export const MIGRATIONS: readonly Migration[] = [
  { version: 1, name: '001_initial_schema', sql: MIGRATION_001_INITIAL_SCHEMA },
];

// The schema version the app expects after all migrations are applied. Equal to
// the highest migration version. Pure (no I/O) so it is unit-testable.
export const TARGET_USER_VERSION = MIGRATIONS.reduce(
  (max, m) => (m.version > max ? m.version : max),
  0,
);

// Given the DB's current PRAGMA user_version, return the migrations that still
// need to run, in order. Pure function: this is the migration-version logic the
// runner depends on, and it is the seam unit tests exercise without SQLite.
export function pendingMigrations(currentVersion: number): readonly Migration[] {
  return MIGRATIONS.filter((m) => m.version > currentVersion).sort(
    (a, b) => a.version - b.version,
  );
}
