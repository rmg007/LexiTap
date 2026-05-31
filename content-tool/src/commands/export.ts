/**
 * `export` — build the immutable `words.db` from the working DB. Always rebuilt
 * from scratch (CONTENT_PIPELINE_ARCHITECTURE.md export steps):
 *   1. fresh DB + content DDL
 *   2. populate content_tiers from config, writing OBSERVED word_count per tier
 *   3. copy active (deleted_at IS NULL) words rows
 *   5. set PRAGMA user_version (content version integer)
 *   6. write build-manifest.json
 *   7. run validate semantics against the output DB; abort on error
 *
 * Because package.json maps `build:db` to `tsx src/cli.ts export`, this command
 * is self-bootstrapping: if the working DB has no rows yet it first imports the
 * sample input + runs offline enrichment, so `npm run build:db` produces a real
 * Foundation words.db from a clean checkout.
 */

import {
  writeFileSync,
  readFileSync,
  existsSync,
  readdirSync,
  mkdirSync,
  rmSync,
  copyFileSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import type { DB } from '@/lib/db';
import { openWorkingDb, createFreshOutputDb, WORKING_DB_PATH, OUTPUT_DB_PATH } from '@/lib/db';
import { loadConfig, type AppConfig, type TierConfig, PROJECT_ROOT } from '@/lib/config';
import { buildWordIndex } from '@/lib/fingerprint';
import { validateRows } from '@/commands/validate';
import { importRows } from '@/commands/import';
import { runEnrich } from '@/commands/enrich';
import { parseByExtension } from '@/lib/csv';
import { defaultProviders } from '@/providers/defaultProviders';
import { logger } from '@/lib/logger';
import { flagValue } from '@/commands/validate';
import type { TierRow, WordRow, WordTierRow } from '@/schema/types';

const INSERT_TIER = `
INSERT INTO content_tiers (
  id, name, description, is_free, sku, word_count, display_order, is_active
) VALUES (
  @id, @name, @description, @is_free, @sku, @word_count, @display_order, @is_active
)
`.trim();

const INSERT_WORD = `
INSERT INTO words (
  id, word, definition, pos, cefr_level, grade_level, word_type,
  difficulty, theme, example_sentence, image_path, audio_path, synonyms,
  antonyms, usage_notes, created_at, deleted_at
) VALUES (
  @id, @word, @definition, @pos, @cefr_level, @grade_level, @word_type,
  @difficulty, @theme, @example_sentence, @image_path, @audio_path, @synonyms,
  @antonyms, @usage_notes, @created_at, @deleted_at
)
`.trim();

const INSERT_WORD_TIER = `
INSERT INTO word_tiers (word_id, tier_id) VALUES (@word_id, @tier_id)
`.trim();

function activeWords(working: DB): WordRow[] {
  return working.prepare(`SELECT * FROM words WHERE deleted_at IS NULL`).all() as WordRow[];
}

/** Memberships for active words only (a soft-deleted word's tags are dropped). */
function activeMemberships(working: DB): WordTierRow[] {
  return working
    .prepare(
      `SELECT wt.word_id, wt.tier_id FROM word_tiers wt
       JOIN words w ON w.id = wt.word_id
       WHERE w.deleted_at IS NULL`,
    )
    .all() as WordTierRow[];
}

function tierConfigToRow(tier: TierConfig, wordCount: number): TierRow {
  return {
    id: tier.slug,
    name: tier.name,
    description: tier.description,
    is_free: tier.is_free ? 1 : 0,
    sku: tier.sku,
    word_count: wordCount,
    display_order: tier.display_order,
    is_active: 1,
  };
}

/** Per-tier enrichment coverage written into the manifest (SEED_DATA_SPEC quality bar #6). */
export interface TierCoverage {
  words: number;
  with_synonyms: number;
  with_audio: number;
  with_images: number;
}

export interface ExportResult {
  userVersion: number;
  tierCounts: Record<string, number>;
  coverage: Record<string, TierCoverage>;
  assets: { audio: number; images: number };
  totalWords: number;
  /** { word_id: content fingerprint } for the active rows, recorded for diffing. */
  wordIndex: Record<string, string>;
}

/**
 * A field counts as "covered" when it is non-null (offline noop synonyms emit
 * '[]', still covered). Per-tier coverage is computed over `word_tiers`
 * memberships (a word in two categories contributes to both); asset totals count
 * each word's file ONCE regardless of how many categories tag it.
 */
function computeCoverage(
  words: WordRow[],
  memberships: WordTierRow[],
  tiers: readonly TierConfig[],
): {
  coverage: Record<string, TierCoverage>;
  assets: { audio: number; images: number };
} {
  const coverage: Record<string, TierCoverage> = {};
  for (const tier of tiers) {
    coverage[tier.slug] = { words: 0, with_synonyms: 0, with_audio: 0, with_images: 0 };
  }
  const byId = new Map(words.map((w) => [w.id, w]));
  for (const m of memberships) {
    const w = byId.get(m.word_id);
    const c = coverage[m.tier_id];
    if (!w || !c) continue;
    c.words += 1;
    if (w.synonyms !== null) c.with_synonyms += 1;
    if (w.audio_path !== null) c.with_audio += 1;
    if (w.image_path !== null) c.with_images += 1;
  }
  let audio = 0;
  let images = 0;
  for (const w of words) {
    if (w.audio_path !== null) audio += 1;
    if (w.image_path !== null) images += 1;
  }
  return { coverage, assets: { audio, images } };
}

/**
 * Build the output DB from working-DB rows + config. Pure-ish: takes both DB
 * handles, returns the per-tier counts. Aborts (throws) if final validation
 * against the assembled rows finds any error.
 */
export function buildOutputDb(
  working: DB,
  output: DB,
  config: AppConfig,
  userVersion: number,
): ExportResult {
  const words = activeWords(working);
  const memberships = activeMemberships(working);

  // Final validation against the OUTPUT data; abort on any error.
  const issues = validateRows(words, memberships, config, { strict: false });
  const errors = issues.filter((i) => i.level === 'error');
  if (errors.length > 0) {
    const detail = errors
      .slice(0, 10)
      .map((e) => `${e.wordId} ${e.field}: ${e.message}`)
      .join('; ');
    throw new Error(`export aborted: ${errors.length} validation error(s): ${detail}`);
  }

  // Observed membership counts per tier (config tiers with zero members still
  // get a content_tiers row with count 0 so the app can show the tier).
  const tierCounts: Record<string, number> = {};
  for (const tier of config.tiers) tierCounts[tier.slug] = 0;
  for (const m of memberships) {
    tierCounts[m.tier_id] = (tierCounts[m.tier_id] ?? 0) + 1;
  }

  const insertTier = output.prepare(INSERT_TIER);
  const insertWord = output.prepare(INSERT_WORD);
  const insertWordTier = output.prepare(INSERT_WORD_TIER);

  const tx = output.transaction(() => {
    for (const tier of config.tiers) {
      insertTier.run(tierConfigToRow(tier, tierCounts[tier.slug] ?? 0));
    }
    for (const w of words) {
      insertWord.run(w);
    }
    for (const m of memberships) {
      insertWordTier.run(m);
    }
  });
  tx();

  output.pragma(`user_version = ${userVersion}`);

  const { coverage, assets } = computeCoverage(words, memberships, config.tiers);
  const wordIndex = buildWordIndex(words);
  return { userVersion, tierCounts, coverage, assets, totalWords: words.length, wordIndex };
}

/**
 * Export step 4: rebuild the output asset bundle. Clears `destAssetsDir` (drops
 * unreferenced files), then copies each referenced audio/image from the
 * enrichment scratch dir (`data/`). Offline builds only assign asset *paths*
 * without synthesizing files, so a missing source is warned-and-skipped rather
 * than fatal. Returns how many files were copied vs. referenced-but-absent.
 */
export function copyAssets(
  words: WordRow[],
  dataDir: string,
  destAssetsDir: string,
): { copied: number; missing: number } {
  if (existsSync(destAssetsDir)) rmSync(destAssetsDir, { recursive: true });

  let copied = 0;
  let missing = 0;
  for (const w of words) {
    for (const rel of [w.audio_path, w.image_path]) {
      if (!rel) continue;
      const src = resolve(dataDir, rel);
      if (!existsSync(src)) {
        missing += 1;
        continue;
      }
      const dest = resolve(destAssetsDir, '..', rel);
      mkdirSync(dirname(dest), { recursive: true });
      copyFileSync(src, dest);
      copied += 1;
    }
  }
  return { copied, missing };
}

/**
 * Map a semver-ish bump to the integer user_version (major*10000+minor*100+patch).
 * Each segment is two digits; a bump that overflows 99 carries into the next
 * segment (patch 99 -> minor+1, minor 99 -> major+1) so the encoding stays valid.
 */
export function computeUserVersion(current: number, bump: 'major' | 'minor' | 'patch'): number {
  let major = Math.floor(current / 10000);
  let minor = Math.floor((current % 10000) / 100);
  let patch = current % 100;
  if (bump === 'major') {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (bump === 'minor') {
    minor += 1;
    patch = 0;
  } else {
    patch += 1;
  }
  if (patch > 99) {
    minor += Math.floor(patch / 100);
    patch %= 100;
  }
  if (minor > 99) {
    major += Math.floor(minor / 100);
    minor %= 100;
  }
  return major * 10000 + minor * 100 + patch;
}

/**
 * If the working DB is empty, bootstrap it from the sample input dir so a clean
 * checkout can produce a real words.db via `npm run build:db`.
 */
async function bootstrapWorkingIfEmpty(working: DB, config: AppConfig): Promise<void> {
  const count = (working.prepare(`SELECT COUNT(*) AS n FROM words`).get() as { n: number }).n;
  if (count > 0) return;

  const inputDir = resolve(PROJECT_ROOT, 'data', 'input');
  if (!existsSync(inputDir)) return;

  logger.info('working DB empty — bootstrapping from data/input/ (import + offline enrich)');
  const providers = defaultProviders();
  for (const tier of config.tiers) {
    for (const ext of ['csv', 'json']) {
      const path = resolve(inputDir, `${tier.slug}.${ext}`);
      if (!existsSync(path)) continue;
      const text = readFileSync(path, 'utf8');
      const { rows } = parseByExtension(path, text);
      importRows(working, rows, {
        tier: tier.slug,
        onConflict: 'update',
        now: () => Date.now(),
      });
      // Offline enrichment: synonyms (no-op arrays) everywhere; audio for
      // tiers configured to ship audio (TOEFL).
      await runEnrich(working, providers, {
        tier: tier.slug,
        addSynonyms: true,
        addAudio: tier.audio,
        addImages: false,
        force: false,
      });
    }
  }
}

/** sha1 of each source file in data/input/, keyed by filename (manifest source_hashes). */
function hashSourceFiles(): Record<string, string> {
  const inputDir = resolve(PROJECT_ROOT, 'data', 'input');
  if (!existsSync(inputDir)) return {};
  const files = readdirSync(inputDir).filter((f) => f.endsWith('.csv') || f.endsWith('.json'));
  const hashes: Record<string, string> = {};
  for (const file of files) {
    const content = readFileSync(resolve(inputDir, file));
    hashes[file] = `sha1:${createHash('sha1').update(content).digest('hex')}`;
  }
  return hashes;
}

function writeManifest(config: AppConfig, result: ExportResult, contentVersion: string): void {
  const manifest = {
    app_id: config.app_id,
    content_version: contentVersion,
    user_version: result.userVersion,
    built_at: new Date().toISOString(),
    tiers: result.coverage,
    total_words: result.totalWords,
    assets: result.assets,
    source_hashes: hashSourceFiles(),
  };
  const manifestPath = resolve(PROJECT_ROOT, 'data', 'output', 'build-manifest.json');
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

function versionToSemver(userVersion: number): string {
  const major = Math.floor(userVersion / 10000);
  const minor = Math.floor((userVersion % 10000) / 100);
  const patch = userVersion % 100;
  return `${major}.${minor}.${patch}`;
}

/** CLI entry for `export` (also the `build:db` script target). */
export async function exportCommand(args: string[]): Promise<void> {
  const outputPath = flagValue(args, '--output') ?? OUTPUT_DB_PATH;
  const bump = (flagValue(args, '--bump') ?? 'patch') as 'major' | 'minor' | 'patch';

  const config = loadConfig();
  const working = openWorkingDb(WORKING_DB_PATH);
  try {
    await bootstrapWorkingIfEmpty(working, config);

    // Read prior version from an existing output DB (if any) to bump from it.
    let priorVersion = 0;
    if (existsSync(outputPath)) {
      const Database = (await import('better-sqlite3')).default;
      const prior = new Database(outputPath, { readonly: true });
      priorVersion = Number(prior.pragma('user_version', { simple: true }));
      prior.close();
    }
    const userVersion = computeUserVersion(priorVersion, bump);

    const output = createFreshOutputDb(outputPath);
    try {
      const result = buildOutputDb(working, output, config, userVersion);
      writeManifest(config, result, versionToSemver(userVersion));
      logger.print(
        `export complete: ${result.totalWords} words, user_version=${userVersion}, ${outputPath}`,
      );
      for (const [tier, n] of Object.entries(result.tierCounts)) {
        logger.print(`  ${tier}: ${n} words`);
      }
    } finally {
      output.close();
    }
  } finally {
    working.close();
  }
}
