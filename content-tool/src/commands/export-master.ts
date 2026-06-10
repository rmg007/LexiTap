/**
 * `export-master` — dump the working DB to the canonical `words_master.jsonl`
 * (one JSON object per line, one line per word). This is the inverse of the
 * JSONL `import`: it round-trips DB → JSONL so the master file can be edited and
 * re-imported. It also bootstraps the master file the first time, from a working
 * DB built by the legacy CSV pipeline (CONTENT_PIPELINE_JSONL_PLAN.md).
 *
 * Output shape per line (see the plan's Master JSONL Schema):
 *   {
 *     "word", "pos", "categories" (CEFR + tier slugs), "reviewed" (bool),
 *     "definition", "example_sentence",
 *     "frequency_rank"?, "word_type"?, "difficulty"?, "theme"?,
 *     "synonyms" [], "antonyms" [], "usage_notes" (null|string),
 *     "image_path" (null|string), "audio_path" (null|string),
 *     "senses": [ { sense_index, pos, short_gloss, explanation, image_path, examples:[str] } ],
 *     "questions": [ { question_index, type, prompt, correct, distractors:[str], hint, explanation, reviewed } ]
 *   }
 *
 * Words are ordered by frequency_rank ASC (NULLs last), then word ASC, so the
 * output is deterministic and diff-stable across runs.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { DB } from '@/lib/db';
import { openWorkingDb } from '@/lib/db';
import { PROJECT_ROOT } from '@/lib/config';
import { logger } from '@/lib/logger';
import { flagValue } from '@/commands/validate';
import type {
  WordRow,
  WordTierRow,
  WordSenseRow,
  SenseExampleRow,
  WordQuestionRow,
} from '@/schema/types';

export const DEFAULT_MASTER_PATH = resolve(PROJECT_ROOT, 'data', 'input', 'words_master.jsonl');

/** The set of CEFR labels that ride in `categories` alongside tier slugs. */
export const CEFR_LEVELS: ReadonlySet<string> = new Set(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);

// ─── master record shape (serialized as one JSONL line) ─────────────────────

export interface MasterSense {
  sense_index: number;
  pos: string | null;
  short_gloss: string;
  explanation: string;
  image_path: string | null;
  examples: string[];
}

export interface MasterQuestion {
  question_index: number;
  type: string;
  prompt: string;
  correct: string;
  distractors: string[];
  hint: string | null;
  explanation: string | null;
  reviewed: boolean;
}

export interface MasterWord {
  word: string;
  pos: string | null;
  categories: string[];
  reviewed: boolean;
  definition: string;
  example_sentence: string;
  frequency_rank: number | null;
  word_type: string | null;
  difficulty: number | null;
  theme: string | null;
  synonyms: string[];
  antonyms: string[];
  usage_notes: string | null;
  image_path: string | null;
  audio_path: string | null;
  senses: MasterSense[];
  questions: MasterQuestion[];
}

/** Parse a JSON-array TEXT column ('["a","b"]') into a string[]; null/'' → []. */
function parseJsonArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((x) => String(x)) : [];
  } catch {
    return [];
  }
}

// ─── load from working DB ───────────────────────────────────────────────────

function activeWords(db: DB): WordRow[] {
  return db
    .prepare(
      `SELECT * FROM words WHERE deleted_at IS NULL
       ORDER BY (frequency_rank IS NULL), frequency_rank ASC, word ASC`,
    )
    .all() as WordRow[];
}

function tierMembershipsByWord(db: DB): Map<string, string[]> {
  const rows = db
    .prepare(`SELECT word_id, tier_id FROM word_tiers ORDER BY word_id, tier_id`)
    .all() as WordTierRow[];
  const map = new Map<string, string[]>();
  for (const r of rows) {
    const list = map.get(r.word_id) ?? [];
    list.push(r.tier_id);
    map.set(r.word_id, list);
  }
  return map;
}

function sensesByWord(db: DB): Map<string, MasterSense[]> {
  const senses = db
    .prepare(`SELECT * FROM word_senses WHERE deleted_at IS NULL ORDER BY word_id, sense_index`)
    .all() as WordSenseRow[];
  const examples = db
    .prepare(
      `SELECT se.* FROM sense_examples se
       JOIN word_senses ws ON ws.id = se.sense_id
       WHERE ws.deleted_at IS NULL
       ORDER BY se.sense_id, se.example_index`,
    )
    .all() as SenseExampleRow[];

  const examplesBySense = new Map<string, string[]>();
  for (const ex of examples) {
    const list = examplesBySense.get(ex.sense_id) ?? [];
    list.push(ex.text);
    examplesBySense.set(ex.sense_id, list);
  }

  const map = new Map<string, MasterSense[]>();
  for (const s of senses) {
    const list = map.get(s.word_id) ?? [];
    list.push({
      sense_index: s.sense_index,
      pos: s.pos,
      short_gloss: s.short_gloss,
      explanation: s.explanation,
      image_path: s.image_path,
      examples: examplesBySense.get(s.id) ?? [],
    });
    map.set(s.word_id, list);
  }
  return map;
}

function questionsByWord(db: DB): Map<string, MasterQuestion[]> {
  const rows = db
    .prepare(
      `SELECT * FROM word_questions WHERE deleted_at IS NULL ORDER BY word_id, question_index`,
    )
    .all() as WordQuestionRow[];
  const map = new Map<string, MasterQuestion[]>();
  for (const q of rows) {
    const list = map.get(q.word_id) ?? [];
    list.push({
      question_index: q.question_index,
      type: q.type,
      prompt: q.prompt,
      correct: q.correct,
      distractors: parseJsonArray(q.distractors),
      hint: q.hint,
      explanation: q.explanation,
      reviewed: q.reviewed === 1,
    });
    map.set(q.word_id, list);
  }
  return map;
}

/**
 * Build the ordered MasterWord[] from the working DB. `categories` = the word's
 * CEFR level (if set) first, then its tier slugs (sorted, from word_tiers).
 */
export function buildMasterRecords(db: DB): MasterWord[] {
  const words = activeWords(db);
  const tiers = tierMembershipsByWord(db);
  const senses = sensesByWord(db);
  const questions = questionsByWord(db);

  return words.map((w) => {
    const categories: string[] = [];
    if (w.cefr_level && CEFR_LEVELS.has(w.cefr_level)) categories.push(w.cefr_level);
    categories.push(...(tiers.get(w.id) ?? []));
    return {
      word: w.word,
      pos: w.pos,
      categories,
      reviewed: w.reviewed === 1,
      definition: w.definition,
      example_sentence: w.example_sentence,
      frequency_rank: w.frequency_rank,
      word_type: w.word_type,
      difficulty: w.difficulty,
      theme: w.theme,
      synonyms: parseJsonArray(w.synonyms),
      antonyms: parseJsonArray(w.antonyms),
      usage_notes: w.usage_notes,
      image_path: w.image_path,
      audio_path: w.audio_path,
      senses: senses.get(w.id) ?? [],
      questions: questions.get(w.id) ?? [],
    };
  });
}

/** Serialize MasterWord[] to JSONL (one compact JSON object per line, \n-terminated). */
export function serializeMasterRecords(records: MasterWord[]): string {
  return records.map((r) => JSON.stringify(r)).join('\n') + (records.length > 0 ? '\n' : '');
}

// ─── CLI entry ───────────────────────────────────────────────────────────────

export function exportMasterCommand(args: string[]): void {
  const output = flagValue(args, '--output') ?? DEFAULT_MASTER_PATH;

  const db = openWorkingDb();
  let records: MasterWord[];
  try {
    records = buildMasterRecords(db);
  } finally {
    db.close();
  }

  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, serializeMasterRecords(records), 'utf8');

  const withSenses = records.filter((r) => r.senses.length > 0).length;
  const withQuestions = records.filter((r) => r.questions.length > 0).length;
  logger.print(
    `export-master: ${records.length} words written to ${output} ` +
      `(${withSenses} with senses, ${withQuestions} with questions)`,
  );
}
