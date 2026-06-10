/**
 * `synthesize-senses` — validate and serialize `SenseIngestItem[]` to the JSONL
 * ingest format consumed by `ingest-senses`. This is the write side of the
 * Phase-1 synthesis pipeline; `parseSenseIngestFile` is the read side.
 *
 * Two entry points:
 *   validateSenseIngestItem(item)  — pure pre-write check (no DB, no I/O);
 *                                    used by Phase-2 enrichment providers before
 *                                    they call ingest-senses.
 *   serializeSenseIngestFile(items) — emit JSONL (one JSON object per line, \n
 *                                    terminated). Items are emitted verbatim; call
 *                                    validateSenseIngestItem first if you want
 *                                    pre-flight errors.
 *
 * Round-trip guarantee:
 *   parseSenseIngestFile(serializeSenseIngestFile(items)).items  ≡ items
 *   (parse ∘ serialize is the identity, modulo field ordering.)
 */

import type { SenseIngestItem, SenseIngestSense, SenseIngestExample } from '@/commands/ingest-senses';

// ─── pre-write validation ──────────────────────────────────────────────────

export interface SenseIngestValidationError {
  /** Human-readable path: e.g. "senses[0].short_gloss" */
  field: string;
  message: string;
}

/**
 * Validate a single `SenseIngestItem` without touching the DB. Returns an empty
 * array when the item is structurally valid. These are the WRITE-side invariants:
 *
 *   V1  word_id must be a non-empty string starting with "word_" (format guard)
 *   V2  senses array must be non-empty
 *   V3  sense_index values must be 0-based and contiguous (0,1,2,…)
 *   V4  each sense must have a non-empty short_gloss
 *   V5  each sense must have a non-empty explanation
 *   V6  explanation must differ from short_gloss (identical = slop)
 *   V7  examples array must be non-empty per sense
 *   V8  each example must have a non-empty text
 *   V9  example text must not contain a "_" blank (teaching sentences only;
 *       cloze blanks live in words.example_sentence, never here)
 *   V10 example_index values within a sense must be 0-based and contiguous
 */
export function validateSenseIngestItem(
  item: SenseIngestItem,
): SenseIngestValidationError[] {
  const errors: SenseIngestValidationError[] = [];
  const push = (field: string, message: string) => errors.push({ field, message });

  // V1 word_id format
  if (!item.word_id || typeof item.word_id !== 'string') {
    push('word_id', 'must be a non-empty string');
    return errors; // can't validate senses without a word_id
  }
  if (!item.word_id.startsWith('word_')) {
    push('word_id', `must start with "word_", got "${item.word_id}"`);
  }

  // V2 senses non-empty
  if (!Array.isArray(item.senses) || item.senses.length === 0) {
    push('senses', 'must be a non-empty array');
    return errors;
  }

  // Sort by sense_index for contiguity check
  const sorted = [...item.senses].sort((a, b) => a.sense_index - b.sense_index);

  // V3 contiguous 0-based sense_index
  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i]!;
    if (s.sense_index !== i) {
      const msg =
        i === 0
          ? `sense_index must start at 0, found ${s.sense_index}`
          : `sense_index gap: expected ${i}, found ${s.sense_index}`;
      push(`senses[${i}].sense_index`, msg);
    }
  }

  for (const s of sorted) {
    const prefix = `senses[${s.sense_index}]`;
    validateSenseIngestSense(s, prefix, push);
  }

  return errors;
}

function validateSenseIngestSense(
  s: SenseIngestSense,
  prefix: string,
  push: (field: string, message: string) => void,
): void {
  // V4
  if (!s.short_gloss || !s.short_gloss.trim()) {
    push(`${prefix}.short_gloss`, 'must be non-empty');
  }
  // V5
  if (!s.explanation || !s.explanation.trim()) {
    push(`${prefix}.explanation`, 'must be non-empty');
  }
  // V6 explanation != short_gloss
  if (
    s.explanation &&
    s.short_gloss &&
    s.explanation.trim().toLowerCase() === s.short_gloss.trim().toLowerCase()
  ) {
    push(
      `${prefix}.explanation`,
      'must differ from short_gloss — write felt teaching prose, not a gloss copy',
    );
  }

  // V7 examples non-empty
  if (!Array.isArray(s.examples) || s.examples.length === 0) {
    push(`${prefix}.examples`, 'must be a non-empty array');
    return;
  }

  // Sort by example_index for contiguity check
  const sortedExamples = [...s.examples].sort((a, b) => a.example_index - b.example_index);

  // V10 contiguous 0-based example_index
  for (let i = 0; i < sortedExamples.length; i++) {
    const ex = sortedExamples[i]!;
    if (ex.example_index !== i) {
      const msg =
        i === 0
          ? `example_index must start at 0, found ${ex.example_index}`
          : `example_index gap: expected ${i}, found ${ex.example_index}`;
      push(`${prefix}.examples[${i}].example_index`, msg);
    }
  }

  for (const ex of sortedExamples) {
    validateSenseIngestExample(ex, `${prefix}.examples[${ex.example_index}]`, push);
  }
}

function validateSenseIngestExample(
  ex: SenseIngestExample,
  prefix: string,
  push: (field: string, message: string) => void,
): void {
  // V8
  if (!ex.text || !ex.text.trim()) {
    push(`${prefix}.text`, 'must be non-empty');
  }
  // V9 no cloze blank
  if (ex.text && ex.text.includes('_')) {
    push(
      `${prefix}.text`,
      'teaching examples must be full sentences with no "_" blank (cloze lives only in words.example_sentence)',
    );
  }
}

// ─── serialization ─────────────────────────────────────────────────────────

/**
 * Serialize `SenseIngestItem[]` to JSONL: one compact JSON object per line,
 * newline-terminated. The output is ready to write to a `.jsonl` file and be
 * consumed by `ingest-senses --source <path>`.
 *
 * Field order matches the canonical ingest format spec (word_id, word, senses)
 * for readability in diffs. No extra whitespace within a line — one line = one
 * word (consistent with the sample-senses.jsonl style).
 */
export function serializeSenseIngestFile(items: SenseIngestItem[]): string {
  return items.map((item) => JSON.stringify(canonicalize(item))).join('\n') + (items.length > 0 ? '\n' : '');
}

/** Emit a canonical field order so serialization is deterministic + diff-friendly. */
function canonicalize(item: SenseIngestItem): object {
  return {
    word_id: item.word_id,
    ...(item.word !== undefined ? { word: item.word } : {}),
    senses: item.senses.map((s) => ({
      sense_index: s.sense_index,
      ...(s.pos !== undefined && s.pos !== null ? { pos: s.pos } : {}),
      short_gloss: s.short_gloss,
      explanation: s.explanation,
      ...(s.image_path !== undefined ? { image_path: s.image_path } : {}),
      examples: s.examples.map((ex) => ({
        example_index: ex.example_index,
        text: ex.text,
      })),
    })),
  };
}
