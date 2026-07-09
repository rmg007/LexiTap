/**
 * `import-master` — load the canonical `words_master.jsonl` into the working DB.
 * This is the JSONL successor to the per-tier CSV `import` (the inverse of
 * `export-master`). One line = one word's COMPLETE record: identity + categories
 * + content + nested senses + nested questions (CONTENT_PIPELINE_JSONL_PLAN.md).
 *
 * The master file is the source of truth, so a re-import is a full upsert per
 * word: word content fields, cefr_level, reviewed, and synonyms/antonyms are all
 * overwritten, and word_tiers / word_senses / sense_examples / word_questions are
 * REPLACED clean-slate for that word (stale rows for a word never linger).
 *
 * `categories` carries BOTH the CEFR level and the tier slugs in one array:
 *   - A1/A2/B1/B2/C1/C2  -> words.cefr_level (first wins; >1 warns)
 *   - any configured tier slug -> a word_tiers row
 *   - anything else -> a hard error (a typo'd category must not silently vanish)
 *
 * PRUNE (default on): a word's row lingering forever after its line is deleted
 * from the master file was a real recurring bug (161 "purged" function words and
 * 27 proper nouns both zombied back into a shipped `words.db` a day after being
 * removed — see memory/2026-07-07_proper-noun-purge-and-zombie-words-bug.md).
 * Every real invocation of this command (CLI docs, PHASE3_4_RUNBOOK.md, the
 * `categorize`/`enrich-master` "next" hints) always passes the WHOLE canonical
 * `words_master.jsonl`, never a filtered subset — so treating "absent from this
 * import" as "removed" is safe as the default. Any active `words` row whose id
 * isn't in the parsed set is soft-deleted (`deleted_at`), and its `word_tiers` /
 * `word_senses` / `sense_examples` / `word_questions` rows are cleaned up the
 * same way an existing word's children are on a normal re-import. Soft-deleting
 * (not hard-deleting) `words` means re-adding the same word later is a plain
 * upsert that clears `deleted_at` back to NULL — no special-cased "undelete".
 * Pass `--no-prune` (or `{ prune: false }`) to import against a deliberately
 * partial file without touching anything absent from it.
 */

import { existsSync, readFileSync } from 'node:fs';
import type { DB } from '@/lib/db';
import { openWorkingDb, openWorkingDbReadonly, WORKING_DB_PATH } from '@/lib/db';
import { loadConfig, tierSlugs } from '@/lib/config';
import { makeWordId, makeSenseId, makeExampleId, makeQuestionId, normalizeWord } from '@/lib/ids';
import { logger } from '@/lib/logger';
import { flagValue, DEFAULT_DEFINITION_LICENSE } from '@/commands/validate';
import { CEFR_LEVELS, type MasterWord, type MasterSense, type MasterQuestion } from '@/commands/export-master';
import { QUESTION_TYPES } from '@/schema/types';

// ─── parse + validate ────────────────────────────────────────────────────────

export interface MasterParseError {
  line: number;
  message: string;
}

export interface MasterParseResult {
  records: MasterWord[];
  errors: MasterParseError[];
}

const QUESTION_TYPE_SET: ReadonlySet<string> = new Set(QUESTION_TYPES);

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string');
}

function nonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

/**
 * Validate + coerce one raw object into a MasterWord, or return an error string.
 * `validSlugs` is the configured tier set; an unknown category slug is an error.
 */
export function coerceMasterWord(
  raw: unknown,
  validSlugs: ReadonlySet<string>,
): { record: MasterWord } | { error: string } {
  if (!raw || typeof raw !== 'object') return { error: 'not a JSON object' };
  const o = raw as Record<string, unknown>;

  if (!nonEmptyString(o.word)) return { error: 'missing/empty required field: word' };
  if (!nonEmptyString(o.definition)) return { error: `word '${String(o.word)}': missing/empty definition` };
  if (!nonEmptyString(o.example_sentence))
    return { error: `word '${String(o.word)}': missing/empty example_sentence` };
  if (!Array.isArray(o.categories) || !isStringArray(o.categories))
    return { error: `word '${String(o.word)}': categories must be an array of strings` };

  // Route categories; reject unknown slugs (not CEFR, not a configured tier).
  for (const cat of o.categories) {
    if (!CEFR_LEVELS.has(cat) && !validSlugs.has(cat)) {
      return { error: `word '${String(o.word)}': unknown category '${cat}' (not a CEFR level or configured tier)` };
    }
  }

  // senses (optional)
  const senses: MasterSense[] = [];
  if (o.senses !== undefined) {
    if (!Array.isArray(o.senses)) return { error: `word '${String(o.word)}': senses must be an array` };
    for (const s of o.senses) {
      if (!s || typeof s !== 'object') return { error: `word '${String(o.word)}': a sense is not an object` };
      const so = s as Record<string, unknown>;
      if (typeof so.sense_index !== 'number')
        return { error: `word '${String(o.word)}': sense missing numeric sense_index` };
      if (!nonEmptyString(so.short_gloss))
        return { error: `word '${String(o.word)}': sense ${so.sense_index} missing short_gloss` };
      if (!nonEmptyString(so.explanation))
        return { error: `word '${String(o.word)}': sense ${so.sense_index} missing explanation` };
      if (so.examples !== undefined && !isStringArray(so.examples))
        return { error: `word '${String(o.word)}': sense ${so.sense_index} examples must be string[]` };
      senses.push({
        sense_index: so.sense_index,
        pos: typeof so.pos === 'string' ? so.pos : null,
        short_gloss: so.short_gloss,
        explanation: so.explanation,
        image_path: typeof so.image_path === 'string' ? so.image_path : null,
        examples: (so.examples as string[] | undefined) ?? [],
      });
    }
  }

  // questions (optional)
  const questions: MasterQuestion[] = [];
  if (o.questions !== undefined) {
    if (!Array.isArray(o.questions)) return { error: `word '${String(o.word)}': questions must be an array` };
    for (const q of o.questions) {
      if (!q || typeof q !== 'object') return { error: `word '${String(o.word)}': a question is not an object` };
      const qo = q as Record<string, unknown>;
      if (typeof qo.question_index !== 'number')
        return { error: `word '${String(o.word)}': question missing numeric question_index` };
      if (typeof qo.type !== 'string' || !QUESTION_TYPE_SET.has(qo.type))
        return { error: `word '${String(o.word)}': question ${qo.question_index} has invalid type '${String(qo.type)}'` };
      if (!nonEmptyString(qo.prompt))
        return { error: `word '${String(o.word)}': question ${qo.question_index} missing prompt` };
      if (!nonEmptyString(qo.correct))
        return { error: `word '${String(o.word)}': question ${qo.question_index} missing correct` };
      if (qo.distractors !== undefined && !isStringArray(qo.distractors))
        return { error: `word '${String(o.word)}': question ${qo.question_index} distractors must be string[]` };
      questions.push({
        question_index: qo.question_index,
        type: qo.type,
        prompt: qo.prompt,
        correct: qo.correct,
        distractors: (qo.distractors as string[] | undefined) ?? [],
        hint: typeof qo.hint === 'string' ? qo.hint : null,
        explanation: typeof qo.explanation === 'string' ? qo.explanation : null,
        reviewed: qo.reviewed === true,
      });
    }
  }

  return {
    record: {
      word: o.word,
      pos: typeof o.pos === 'string' ? o.pos : null,
      categories: o.categories,
      reviewed: o.reviewed === true,
      definition: o.definition,
      example_sentence: o.example_sentence,
      frequency_rank: typeof o.frequency_rank === 'number' ? o.frequency_rank : null,
      word_type: typeof o.word_type === 'string' ? o.word_type : null,
      difficulty: typeof o.difficulty === 'number' ? o.difficulty : null,
      theme: typeof o.theme === 'string' ? o.theme : null,
      synonyms: isStringArray(o.synonyms) ? o.synonyms : [],
      antonyms: isStringArray(o.antonyms) ? o.antonyms : [],
      usage_notes: typeof o.usage_notes === 'string' ? o.usage_notes : null,
      image_path: typeof o.image_path === 'string' ? o.image_path : null,
      audio_path: typeof o.audio_path === 'string' ? o.audio_path : null,
      senses,
      questions,
    },
  };
}

export function parseMasterFile(text: string, validSlugs: ReadonlySet<string>): MasterParseResult {
  const records: MasterWord[] = [];
  const errors: MasterParseError[] = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i]!.trim();
    if (!rawLine) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawLine);
    } catch {
      errors.push({ line: i + 1, message: 'invalid JSON' });
      continue;
    }
    const result = coerceMasterWord(parsed, validSlugs);
    if ('error' in result) {
      errors.push({ line: i + 1, message: result.error });
    } else {
      records.push(result.record);
    }
  }
  return { records, errors };
}

// ─── DB write ─────────────────────────────────────────────────────────────────

const UPSERT_WORD = `
INSERT INTO words (
  id, word, definition, pos, cefr_level, grade_level, word_type, difficulty,
  frequency_rank, theme, example_sentence, image_path, audio_path, synonyms,
  antonyms, usage_notes, definition_license, reviewed, created_at, deleted_at
) VALUES (
  @id, @word, @definition, @pos, @cefr_level, NULL, @word_type, @difficulty,
  @frequency_rank, @theme, @example_sentence, @image_path, @audio_path, @synonyms,
  @antonyms, @usage_notes, @definition_license, @reviewed, @created_at, NULL
)
ON CONFLICT(id) DO UPDATE SET
  word = excluded.word,
  definition = excluded.definition,
  pos = excluded.pos,
  cefr_level = excluded.cefr_level,
  word_type = excluded.word_type,
  difficulty = excluded.difficulty,
  frequency_rank = excluded.frequency_rank,
  theme = excluded.theme,
  example_sentence = excluded.example_sentence,
  image_path = excluded.image_path,
  audio_path = excluded.audio_path,
  synonyms = excluded.synonyms,
  antonyms = excluded.antonyms,
  usage_notes = excluded.usage_notes,
  reviewed = excluded.reviewed,
  deleted_at = NULL
`.trim();

export interface ImportMasterResult {
  words: number;
  memberships: number;
  senses: number;
  examples: number;
  questions: number;
  /** words whose `categories` held more than one CEFR level (first kept). */
  multiCefrWarnings: number;
  /** active words soft-deleted because their word was absent from this import. */
  pruned: number;
}

/**
 * Active `words` rows (id + word) in `db` whose id is NOT among `records` —
 * i.e. what a real (non-`--no-prune`) import would soft-delete. Exported so the
 * CLI can preview the prune set under `--dry-run` without writing anything.
 */
export function findPruneCandidates(db: DB, records: MasterWord[]): { id: string; word: string }[] {
  const keepIds = new Set(records.map((r) => makeWordId(r.word)));
  const active = db.prepare(`SELECT id, word FROM words WHERE deleted_at IS NULL`).all() as {
    id: string;
    word: string;
  }[];
  return active.filter((w) => !keepIds.has(w.id));
}

/**
 * Write parsed master records into the working DB. Full upsert per word; child
 * rows (tiers/senses/examples/questions) are replaced clean-slate. By default,
 * any active word absent from `records` is pruned (see the file-header PRUNE
 * note) — pass `{ prune: false }` to import a deliberately partial file as-is.
 * Single transaction — a throw rolls the whole import (and prune) back.
 */
export function importMaster(
  db: DB,
  records: MasterWord[],
  options: { now?: () => number; prune?: boolean } = {},
): ImportMasterResult {
  const now = options.now ?? (() => Date.now());
  const prune = options.prune ?? true;
  const result: ImportMasterResult = {
    words: 0,
    memberships: 0,
    senses: 0,
    examples: 0,
    questions: 0,
    multiCefrWarnings: 0,
    pruned: 0,
  };

  const upsertWord = db.prepare(UPSERT_WORD);
  const delTiers = db.prepare(`DELETE FROM word_tiers WHERE word_id = ?`);
  const insTier = db.prepare(`INSERT OR IGNORE INTO word_tiers (word_id, tier_id) VALUES (?, ?)`);
  const selSenseIds = db.prepare(`SELECT id FROM word_senses WHERE word_id = ?`);
  const delExamples = db.prepare(`DELETE FROM sense_examples WHERE sense_id = ?`);
  const delSenses = db.prepare(`DELETE FROM word_senses WHERE word_id = ?`);
  const insSense = db.prepare(
    `INSERT INTO word_senses (id, word_id, sense_index, pos, short_gloss, explanation, image_path, created_at, deleted_at)
     VALUES (@id, @word_id, @sense_index, @pos, @short_gloss, @explanation, @image_path, @created_at, NULL)`,
  );
  const insExample = db.prepare(
    `INSERT INTO sense_examples (id, sense_id, example_index, text, created_at)
     VALUES (@id, @sense_id, @example_index, @text, @created_at)`,
  );
  const delQuestions = db.prepare(`DELETE FROM word_questions WHERE word_id = ?`);
  const insQuestion = db.prepare(
    `INSERT INTO word_questions (id, word_id, question_index, type, prompt, correct, distractors, hint, explanation, reviewed, created_at, deleted_at)
     VALUES (@id, @word_id, @question_index, @type, @prompt, @correct, @distractors, @hint, @explanation, @reviewed, @created_at, NULL)`,
  );
  const pruneWord = db.prepare(`UPDATE words SET deleted_at = @deleted_at WHERE id = @id`);

  const tx = db.transaction((items: MasterWord[]) => {
    for (const rec of items) {
      const wordId = makeWordId(rec.word);
      const ts = now();

      const cefrs = rec.categories.filter((c) => CEFR_LEVELS.has(c));
      if (cefrs.length > 1) result.multiCefrWarnings += 1;
      const tiers = rec.categories.filter((c) => !CEFR_LEVELS.has(c));

      upsertWord.run({
        id: wordId,
        word: normalizeWord(rec.word),
        definition: rec.definition,
        pos: rec.pos,
        cefr_level: cefrs[0] ?? null,
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
        created_at: ts,
      });
      result.words += 1;

      // Replace tier memberships clean-slate.
      delTiers.run(wordId);
      for (const tier of tiers) {
        insTier.run(wordId, tier);
        result.memberships += 1;
      }

      // Replace senses + examples clean-slate.
      const existingSenseIds = (selSenseIds.all(wordId) as { id: string }[]).map((r) => r.id);
      for (const sid of existingSenseIds) delExamples.run(sid);
      delSenses.run(wordId);
      for (const s of rec.senses) {
        const senseId = makeSenseId(wordId, s.sense_index);
        insSense.run({
          id: senseId,
          word_id: wordId,
          sense_index: s.sense_index,
          pos: s.pos,
          short_gloss: s.short_gloss,
          explanation: s.explanation,
          image_path: s.image_path,
          created_at: ts,
        });
        result.senses += 1;
        s.examples.forEach((text, exIndex) => {
          insExample.run({
            id: makeExampleId(senseId, exIndex),
            sense_id: senseId,
            example_index: exIndex,
            text,
            created_at: ts,
          });
          result.examples += 1;
        });
      }

      // Replace questions clean-slate.
      delQuestions.run(wordId);
      for (const q of rec.questions) {
        insQuestion.run({
          id: makeQuestionId(wordId, q.question_index),
          word_id: wordId,
          question_index: q.question_index,
          type: q.type,
          prompt: q.prompt,
          correct: q.correct,
          distractors: JSON.stringify(q.distractors),
          hint: q.hint,
          explanation: q.explanation,
          reviewed: q.reviewed ? 1 : 0,
          created_at: ts,
        });
        result.questions += 1;
      }
    }

    // Prune: any active word not present in this import is soft-deleted, and
    // its children are cleaned up the same way an existing word's children are
    // replaced above (word_tiers/sense_examples have no deleted_at column — hard
    // delete; words/word_senses/word_questions carry it — soft delete for words,
    // hard delete for senses/questions since they're always rebuilt from scratch
    // if the word ever comes back).
    if (prune) {
      const ts = now();
      for (const { id } of findPruneCandidates(db, items)) {
        pruneWord.run({ id, deleted_at: ts });
        delTiers.run(id);
        const existingSenseIds = (selSenseIds.all(id) as { id: string }[]).map((r) => r.id);
        for (const sid of existingSenseIds) delExamples.run(sid);
        delSenses.run(id);
        delQuestions.run(id);
        result.pruned += 1;
      }
    }
  });

  tx(records);
  return result;
}

// ─── CLI entry ─────────────────────────────────────────────────────────────────

export function importMasterCommand(args: string[]): void {
  const source = flagValue(args, '--source');
  const dryRun = args.includes('--dry-run');
  const prune = !args.includes('--no-prune');
  if (!source) throw new Error('import-master requires --source <path.jsonl>');

  const validSlugs = new Set(tierSlugs(loadConfig()));
  const text = readFileSync(source, 'utf8');
  const { records, errors } = parseMasterFile(text, validSlugs);

  if (errors.length > 0) {
    for (const e of errors.slice(0, 20)) logger.error(`line ${e.line}: ${e.message}`);
    throw new Error(`${errors.length} parse/validation error(s) in ${source} — fix before importing`);
  }

  if (dryRun) {
    const senses = records.reduce((n, r) => n + r.senses.length, 0);
    const questions = records.reduce((n, r) => n + r.questions.length, 0);
    logger.print(
      `dry-run: ${records.length} words / ${senses} senses / ${questions} questions parsed (nothing written)`,
    );
    if (!prune) {
      logger.print('dry-run: --no-prune passed — no words would be pruned');
      return;
    }
    if (!existsSync(WORKING_DB_PATH)) {
      logger.print('dry-run: working DB does not exist yet — nothing to prune');
      return;
    }
    const db = openWorkingDbReadonly();
    try {
      const candidates = findPruneCandidates(db, records);
      if (candidates.length === 0) {
        logger.print('dry-run: no active words are absent from the source — nothing would be pruned');
      } else {
        const sample = candidates.slice(0, 10).map((c) => c.word).join(', ');
        logger.print(
          `dry-run: would prune ${candidates.length} word(s) absent from ${source}: ${sample}` +
            (candidates.length > 10 ? ', …' : ''),
        );
      }
    } finally {
      db.close();
    }
    return;
  }

  const db = openWorkingDb();
  try {
    const r = importMaster(db, records, { prune });
    if (r.multiCefrWarnings > 0) {
      logger.warn(`${r.multiCefrWarnings} word(s) had >1 CEFR level in categories — kept the first`);
    }
    logger.print(
      `import-master: ${r.words} words / ${r.memberships} memberships / ${r.senses} senses / ${r.examples} examples / ${r.questions} questions` +
        (prune ? ` / ${r.pruned} pruned` : ' (pruning skipped: --no-prune)'),
    );
  } finally {
    db.close();
  }
}
