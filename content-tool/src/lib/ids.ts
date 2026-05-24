/**
 * Stable, deterministic word IDs so re-imports are idempotent and `user_progress`
 * references survive a content rebuild (CONTENT_PIPELINE_ARCHITECTURE.md).
 *
 *   id = `word_${tier}_${sha1(normalize(word) + '|' + tier).slice(0, 8)}`
 *
 * The same word+tier always yields the same ID. Editing meaning must be done via
 * definition/usage_notes, NOT by changing the `word` string (that would re-key
 * the row and orphan review history).
 */

import { createHash } from 'node:crypto';

/** trim, lowercase, collapse internal whitespace ("look  up to" == "look up to"). */
export function normalizeWord(word: string): string {
  return word.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function makeWordId(word: string, tier: string): string {
  const normalized = normalizeWord(word);
  const hash = createHash('sha1').update(`${normalized}|${tier}`).digest('hex').slice(0, 8);
  return `word_${tier}_${hash}`;
}
