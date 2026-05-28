// Migration 002: add keyset pagination indexes to user.db.
//
// idx_progress_keyset is the compound index required by the review-date keyset
// pagination pattern in DATABASE_SCHEMA.md §Keyset Pagination. The single-
// column idx_progress_next_review (from 001) still serves the SRS due-word
// query; this index serves the paginated progress list where duplicate
// next_review_date values must be broken by word_id.

export const MIGRATION_002_KEYSET_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_progress_keyset ON user_progress(next_review_date, word_id);
`;
