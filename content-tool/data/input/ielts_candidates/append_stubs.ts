/**
 * Phase 2 one-off: append the 2317 net-new IELTS words as stub records
 * (PENDING_DEFINITION) into words_master.jsonl, per plans/IELTS_INGEST_PLAN.md
 * Phase 2. frequency_rank + difficulty are CEFR-bucketed (never null — the
 * TOEFL null-sorts-first regression) using the real anchors already present in
 * the master file for B2/C1/C2 (difficulty avg 3.07/4.00/5.00 respectively).
 *
 * Run: npx tsx data/input/ielts_candidates/append_stubs.ts
 */
import { readMasterRecords, writeMasterRecords, PENDING_DEFINITION, PENDING_EXAMPLE_SENTENCE } from '@/commands/master-store';
import { DEFAULT_MASTER_PATH, type MasterWord } from '@/commands/export-master';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface CleanEntry {
  word: string;
  cefr_level: 'B2' | 'C1' | 'C2';
  batch: number;
  tier: 'Core' | 'Extended';
  source_rank: number;
  flags?: string[];
  resolution?: string;
}

const clean: CleanEntry[] = JSON.parse(readFileSync(resolve(__dirname, 'ielts_clean.json'), 'utf8'));

const records = readMasterRecords(DEFAULT_MASTER_PATH);

const currentMaxRank = records.reduce((max, r) => (r.frequency_rank !== null ? Math.max(max, r.frequency_rank) : max), 0);

// difficulty anchors observed in the existing master corpus for real B2/C1/C2 words:
// B2 avg 3.07 -> 3, C1 avg 4.00 -> 4, C2 avg 5.00 -> 5 (see memory note for the query).
const DIFFICULTY_BY_CEFR: Record<string, number> = { B2: 3, C1: 4, C2: 5 };
const CEFR_ORDER: Record<string, number> = { B2: 0, C1: 1, C2: 2 };
const TIER_ORDER: Record<string, number> = { Core: 0, Extended: 1 };

// Order new stubs by CEFR (easier first), then Tier (Core before Extended),
// then original source order — frequency_rank is then a simple running
// index continuing past the current max, so these words never queue-jump
// ahead of existing content but stay internally well-ordered.
const ordered = [...clean].sort((a, b) => {
  const c = CEFR_ORDER[a.cefr_level]! - CEFR_ORDER[b.cefr_level]!;
  if (c !== 0) return c;
  const t = TIER_ORDER[a.tier]! - TIER_ORDER[b.tier]!;
  if (t !== 0) return t;
  return a.source_rank - b.source_rank;
});

let nextRank = currentMaxRank + 1;
const newRecords: MasterWord[] = ordered.map((e) => {
  const categories = [e.cefr_level, 'ielts', ...(e.tier === 'Extended' ? ['ielts-extended'] : [])];
  const rec: MasterWord = {
    word: e.word,
    pos: null,
    categories,
    reviewed: false,
    definition: PENDING_DEFINITION,
    example_sentence: PENDING_EXAMPLE_SENTENCE,
    frequency_rank: nextRank++,
    word_type: 'vocabulary',
    difficulty: DIFFICULTY_BY_CEFR[e.cefr_level]!,
    theme: null,
    synonyms: [],
    antonyms: [],
    usage_notes: null,
    image_path: null,
    audio_path: null,
    senses: [],
    questions: [],
  };
  return rec;
});

writeMasterRecords(DEFAULT_MASTER_PATH, [...records, ...newRecords]);

console.log(`appended: ${newRecords.length} stub records`);
console.log(`frequency_rank range: ${currentMaxRank + 1}..${nextRank - 1}`);
const byCefr: Record<string, number> = {};
const byTier: Record<string, number> = {};
for (const e of ordered) {
  byCefr[e.cefr_level] = (byCefr[e.cefr_level] ?? 0) + 1;
  byTier[e.tier] = (byTier[e.tier] ?? 0) + 1;
}
console.log('by CEFR:', byCefr);
console.log('by Tier:', byTier);
console.log(`total master file size now: ${records.length + newRecords.length}`);
