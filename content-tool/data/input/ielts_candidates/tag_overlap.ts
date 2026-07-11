/**
 * Phase 1 one-off: tag the 683 IELTS overlap words (add `ielts` / `ielts-extended`
 * to categories) and backfill `cefr_level` where missing, per
 * plans/IELTS_INGEST_PLAN.md Phase 1. Reuses master-store.ts helpers so the
 * mutation matches categorize.ts's own tag-mutation pattern exactly.
 *
 * Run: npx tsx data/input/ielts_candidates/tag_overlap.ts
 */
import { readMasterRecords, writeMasterRecords, cefrOf, tiersOf, composeCategories } from '@/commands/master-store';
import { normalizeWord } from '@/lib/ids';
import { DEFAULT_MASTER_PATH } from '@/commands/export-master';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface OverlapEntry {
  word: string;
  cefr_level: string;
  batch: number;
  tier: 'Core' | 'Extended';
  source_rank: number;
}

const overlapPath = resolve(__dirname, 'ielts_overlap.json');
const overlap: OverlapEntry[] = JSON.parse(readFileSync(overlapPath, 'utf8'));

const records = readMasterRecords(DEFAULT_MASTER_PATH);
const byWord = new Map(records.map((r) => [normalizeWord(r.word), r] as const));

let ieltsAdded = 0;
let extendedAdded = 0;
let cefrBackfilled = 0;
let cefrAlreadySet = 0;
let notFound = 0;
const conflicts: { word: string; existing: string; source: string }[] = [];

for (const e of overlap) {
  const rec = byWord.get(normalizeWord(e.word));
  if (!rec) {
    notFound += 1;
    continue;
  }

  const existingTiers = new Set(tiersOf(rec));
  if (!existingTiers.has('ielts')) {
    existingTiers.add('ielts');
    ieltsAdded += 1;
  }
  if (e.tier === 'Extended' && !existingTiers.has('ielts-extended')) {
    existingTiers.add('ielts-extended');
    extendedAdded += 1;
  }

  const existingCefr = cefrOf(rec);
  let nextCefr = existingCefr;
  if (!existingCefr) {
    nextCefr = e.cefr_level;
    cefrBackfilled += 1;
  } else if (existingCefr !== e.cefr_level) {
    conflicts.push({ word: rec.word, existing: existingCefr, source: e.cefr_level });
    cefrAlreadySet += 1;
    // don't overwrite — nextCefr stays existingCefr
  } else {
    cefrAlreadySet += 1;
  }

  rec.categories = composeCategories(nextCefr, existingTiers);
}

writeMasterRecords(DEFAULT_MASTER_PATH, records);

if (conflicts.length > 0) {
  writeFileSync(resolve(__dirname, 'ielts_cefr_conflicts.json'), JSON.stringify(conflicts, null, 1), 'utf8');
}

console.log(`overlap entries processed: ${overlap.length}`);
console.log(`not found in master (unexpected):        ${notFound}`);
console.log(`ielts tag added:                          ${ieltsAdded}`);
console.log(`ielts-extended tag added:                 ${extendedAdded}`);
console.log(`cefr_level backfilled (was null):         ${cefrBackfilled}`);
console.log(`cefr_level already set (kept, no overwrite): ${cefrAlreadySet}`);
console.log(`cefr conflicts (source disagreed, flagged): ${conflicts.length}`);
if (conflicts.length > 0) {
  console.log('conflicts written to ielts_cefr_conflicts.json:');
  for (const c of conflicts) console.log(`  ${c.word}: existing=${c.existing} source=${c.source}`);
}
