/**
 * Stable, deterministic, CATEGORY-INDEPENDENT word IDs so re-imports are
 * idempotent and `user_progress` references survive a content rebuild
 * (CONTENT_PIPELINE_ARCHITECTURE.md).
 *
 *   id = `word_${sha1(normalize(word)).slice(0, 16)}`
 *
 * The id derives from the normalized surface form ONLY — never the tier. The
 * same word tagged into several categories (foundation + toefl + ...) yields the
 * SAME id, so it is one `words` row and one `user_progress` row across every
 * category (word↔category is many-to-many via `word_tiers`). Editing meaning
 * must be done via definition/usage_notes, NOT by changing the `word` string
 * (that would re-key the row and orphan review history).
 *
 * 16 hex chars = 64 bits: collision-free for any realistic content volume.
 */

import { createHash } from 'node:crypto';

/** trim, lowercase, collapse internal whitespace ("look  up to" == "look up to"). */
export function normalizeWord(word: string): string {
  return word.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function makeWordId(word: string): string {
  const normalized = normalizeWord(word);
  const hash = createHash('sha1').update(normalized).digest('hex').slice(0, 16);
  return `word_${hash}`;
}

export function makeSenseId(wordId: string, senseIndex: number): string {
  const hash = createHash('sha1').update(`${wordId}:${senseIndex}`).digest('hex').slice(0, 16);
  return `sense_${hash}`;
}

export function makeExampleId(senseId: string, exampleIndex: number): string {
  const hash = createHash('sha1').update(`${senseId}:${exampleIndex}`).digest('hex').slice(0, 16);
  return `ex_${hash}`;
}
