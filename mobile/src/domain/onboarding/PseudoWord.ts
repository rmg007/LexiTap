// DIAG-A pseudo-word (non-word). Interleaved into the adaptive diagnostic as a
// lie detector: a learner who claims to "know" a non-word is over-claiming, and
// the aggregate false-alarm rate corrects their frontier estimate downward.
// Sourced read-only from the bundled words.db `pseudo_words` table — these are
// curated content, never seeded into user_progress.
export interface PseudoWord {
  id: string;
  word: string;
  /** 0–1 similarity to real English phonotactics; higher = more word-like. Optional. */
  phonemeSimilarityScore?: number;
}

// PORT implemented in infrastructure/db. The diagnostic use case depends only on
// this — never on the SQLite concrete.
export interface PseudoWordRepository {
  /** Up to `limit` pseudo-words for one diagnostic run. May return fewer (or none). */
  getPseudoWords(limit: number): Promise<PseudoWord[]>;
}
