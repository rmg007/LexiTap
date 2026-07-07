/**
 * Shared read/write helpers for the canonical `words_master.jsonl` used by the
 * in-place enrichment commands (`categorize` = Phase 3, `enrich-master` =
 * Phase 4). Both commands load the whole master file, mutate selected records,
 * and rewrite it deterministically — so they reuse one loader, one serializer,
 * and one MasterWord→WordRow adapter (the paid providers take WordRow).
 *
 * They also each keep a tiny sidecar progress file (a JSONL of word_ids) so an
 * interrupted run resumes without re-paying for already-processed words.
 */

import { existsSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { loadConfig, tierSlugs } from '@/lib/config';
import { makeWordId } from '@/lib/ids';
import { DEFAULT_DEFINITION_LICENSE } from '@/commands/validate';
import {
  CEFR_LEVELS,
  serializeMasterRecords,
  type MasterWord,
} from '@/commands/export-master';
import { parseMasterFile } from '@/commands/import-master';
import type { WordRow } from '@/schema/types';

/**
 * Placeholder `definition` for a bare-stub word ingested before enrichment
 * (e.g. a word list with no definitions yet). Non-empty so `parseMasterFile`'s
 * required-field check doesn't throw; `enrich-master` detects this sentinel to
 * know the word also needs its base fields (pos/definition/example_sentence/
 * word_type/theme) generated, not just senses/questions.
 */
export const PENDING_DEFINITION = '__PENDING_ENRICHMENT__';
/** Matching placeholder example_sentence — non-empty, exactly one blank, never the real word. */
export const PENDING_EXAMPLE_SENTENCE = `${PENDING_DEFINITION} _`;

/** Load + validate the master file into ordered MasterWord[]. Throws on any bad line. */
export function readMasterRecords(path: string): MasterWord[] {
  const validSlugs = new Set(tierSlugs(loadConfig()));
  const text = readFileSync(path, 'utf8');
  const { records, errors } = parseMasterFile(text, validSlugs);
  if (errors.length > 0) {
    const head = errors.slice(0, 10).map((e) => `  line ${e.line}: ${e.message}`).join('\n');
    throw new Error(`${errors.length} parse/validation error(s) in ${path}:\n${head}`);
  }
  return records;
}

/** Write records back to the master file in canonical, diff-stable order. */
export function writeMasterRecords(path: string, records: MasterWord[]): void {
  writeFileSync(path, serializeMasterRecords(records), 'utf8');
}

/** The CEFR level riding in a record's categories (first one), or null. */
export function cefrOf(rec: MasterWord): string | null {
  return rec.categories.find((c) => CEFR_LEVELS.has(c)) ?? null;
}

/** The tier slugs riding in a record's categories (everything that isn't CEFR). */
export function tiersOf(rec: MasterWord): string[] {
  return rec.categories.filter((c) => !CEFR_LEVELS.has(c));
}

/** Rebuild a categories array from a CEFR level + tier slugs (CEFR first, tiers sorted). */
export function composeCategories(cefr: string | null, tiers: Iterable<string>): string[] {
  const out: string[] = [];
  if (cefr && CEFR_LEVELS.has(cefr)) out.push(cefr);
  out.push(...[...new Set(tiers)].sort());
  return out;
}

/**
 * Adapt a MasterWord to the WordRow shape the paid providers read (they only
 * touch id/word/pos/definition/example_sentence/cefr_level, but the type is
 * fully populated for safety).
 */
export function masterWordToRow(rec: MasterWord): WordRow {
  return {
    id: makeWordId(rec.word),
    word: rec.word,
    definition: rec.definition,
    pos: rec.pos,
    cefr_level: cefrOf(rec),
    grade_level: null,
    word_type: rec.word_type,
    difficulty: rec.difficulty,
    frequency_rank: rec.frequency_rank,
    theme: rec.theme,
    example_sentence: rec.example_sentence,
    image_path: rec.image_path,
    audio_path: rec.audio_path,
    synonyms: rec.synonyms.length > 0 ? JSON.stringify(rec.synonyms) : null,
    antonyms: rec.antonyms.length > 0 ? JSON.stringify(rec.antonyms) : null,
    usage_notes: rec.usage_notes,
    definition_license: DEFAULT_DEFINITION_LICENSE,
    reviewed: rec.reviewed ? 1 : 0,
    created_at: 0,
    deleted_at: null,
  };
}

/** Words ordered by frequency_rank ASC (NULLs last), then word ASC — deterministic. */
export function orderByFrequency(records: MasterWord[]): MasterWord[] {
  return [...records].sort((a, b) => {
    const ar = a.frequency_rank;
    const br = b.frequency_rank;
    if (ar === null && br === null) return a.word.localeCompare(b.word);
    if (ar === null) return 1;
    if (br === null) return -1;
    if (ar !== br) return ar - br;
    return a.word.localeCompare(b.word);
  });
}

// ─── sidecar progress files (resume) ─────────────────────────────────────────

/** Read a sidecar file of `{ "word_id": "..." }` JSONL lines into a Set. */
export function readProgressIds(path: string): Set<string> {
  if (!existsSync(path)) return new Set();
  const ids = new Set<string>();
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const obj = JSON.parse(trimmed) as { word_id?: unknown };
      if (typeof obj.word_id === 'string') ids.add(obj.word_id);
    } catch {
      /* ignore unparseable progress line */
    }
  }
  return ids;
}

/** Append `{ word_id, ...extra }` lines to a sidecar progress file. */
export function appendProgress(path: string, entries: { word_id: string; [k: string]: unknown }[]): void {
  if (entries.length === 0) return;
  appendFileSync(path, entries.map((e) => JSON.stringify(e)).join('\n') + '\n', 'utf8');
}
