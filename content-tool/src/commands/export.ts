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

import { writeFileSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type { DB } from '@/lib/db';
import {
  openWorkingDb,
  createFreshOutputDb,
  OUTPUT_DB_PATH,
  WORKING_DB_PATH,
} from '@/lib/db';
import { loadConfig, type AppConfig, type TierConfig, PROJECT_ROOT } from '@/lib/config';
import { validateRows } from '@/commands/validate';
import { importRows } from '@/commands/import';
import { runEnrich } from '@/commands/enrich';
import { parseByExtension } from '@/lib/csv';
import { defaultProviders } from '@/providers/defaultProviders';
import { logger } from '@/lib/logger';
import { flagValue } from '@/commands/validate';
import type { TierRow, WordRow } from '@/schema/types';

const INSERT_TIER = `
INSERT INTO content_tiers (
  id, name, description, is_free, price_usd, sku, word_count, display_order, is_active
) VALUES (
  @id, @name, @description, @is_free, @price_usd, @sku, @word_count, @display_order, @is_active
)
`.trim();

const INSERT_WORD = `
INSERT INTO words (
  id, word, definition, tier_id, pos, cefr_level, grade_level, word_type,
  difficulty, theme, example_sentence, image_path, audio_path, synonyms,
  antonyms, usage_notes, created_at, deleted_at
) VALUES (
  @id, @word, @definition, @tier_id, @pos, @cefr_level, @grade_level, @word_type,
  @difficulty, @theme, @example_sentence, @image_path, @audio_path, @synonyms,
  @antonyms, @usage_notes, @created_at, @deleted_at
)
`.trim();

function activeWords(working: DB): WordRow[] {
  return working.prepare(`SELECT * FROM words WHERE deleted_at IS NULL`).all() as WordRow[];
}

function tierConfigToRow(tier: TierConfig, wordCount: number): TierRow {
  return {
    id: tier.slug,
    name: tier.name,
    description: tier.description,
    is_free: tier.is_free ? 1 : 0,
    price_usd: tier.price_usd,
    sku: tier.sku,
    word_count: wordCount,
    display_order: tier.display_order,
    is_active: 1,
  };
}

export interface ExportResult {
  userVersion: number;
  tierCounts: Record<string, number>;
  totalWords: number;
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

  // Final validation against the OUTPUT data; abort on any error.
  const issues = validateRows(words, config, { strict: false });
  const errors = issues.filter((i) => i.level === 'error');
  if (errors.length > 0) {
    const detail = errors
      .slice(0, 10)
      .map((e) => `${e.wordId} ${e.field}: ${e.message}`)
      .join('; ');
    throw new Error(`export aborted: ${errors.length} validation error(s): ${detail}`);
  }

  // Observed counts per tier (only tiers that actually have rows are emitted,
  // but config tiers with zero rows still get a content_tiers row with count 0
  // so the app can show the tier as available).
  const tierCounts: Record<string, number> = {};
  for (const tier of config.tiers) tierCounts[tier.slug] = 0;
  for (const w of words) {
    tierCounts[w.tier_id] = (tierCounts[w.tier_id] ?? 0) + 1;
  }

  const insertTier = output.prepare(INSERT_TIER);
  const insertWord = output.prepare(INSERT_WORD);

  const tx = output.transaction(() => {
    for (const tier of config.tiers) {
      insertTier.run(tierConfigToRow(tier, tierCounts[tier.slug] ?? 0));
    }
    for (const w of words) {
      insertWord.run(w);
    }
  });
  tx();

  output.pragma(`user_version = ${userVersion}`);

  return { userVersion, tierCounts, totalWords: words.length };
}

/** Map a semver-ish bump to the integer user_version (major*10000+minor*100+patch). */
export function computeUserVersion(current: number, bump: 'major' | 'minor' | 'patch'): number {
  const major = Math.floor(current / 10000);
  const minor = Math.floor((current % 10000) / 100);
  const patch = current % 100;
  if (bump === 'major') return (major + 1) * 10000;
  if (bump === 'minor') return major * 10000 + (minor + 1) * 100;
  return major * 10000 + minor * 100 + (patch + 1);
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
        defaultType: 'vocabulary',
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

function writeManifest(config: AppConfig, result: ExportResult, contentVersion: string): void {
  const inputDir = resolve(PROJECT_ROOT, 'data', 'input');
  const sourceFiles = existsSync(inputDir)
    ? readdirSync(inputDir).filter((f) => f.endsWith('.csv') || f.endsWith('.json'))
    : [];
  const manifest = {
    app_id: config.app_id,
    content_version: contentVersion,
    user_version: result.userVersion,
    built_at: new Date().toISOString(),
    tiers: result.tierCounts,
    total_words: result.totalWords,
    source_files: sourceFiles,
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
