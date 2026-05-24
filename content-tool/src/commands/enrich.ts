/**
 * `enrich` — add generated/curated fields to existing working-DB rows via the
 * injected provider registry. Opt-in per enrichment flag; caches by word_id so
 * re-runs skip already-enriched rows unless `--force`. Never invents the `word`.
 *
 * Default providers are offline/deterministic (no API keys, no network), so this
 * runs unchanged in CI. A real OpenAI/TTS/Unsplash adapter is injected here later.
 */

import type { DB } from '@/lib/db';
import { openWorkingDb } from '@/lib/db';
import { loadConfig, findTier } from '@/lib/config';
import { defaultProviders } from '@/providers/defaultProviders';
import type { ProviderRegistry } from '@/providers/types';
import { logger } from '@/lib/logger';
import { flagValue } from '@/commands/validate';
import type { WordRow } from '@/schema/types';

export interface EnrichOptions {
  tier: string;
  addSynonyms: boolean;
  addAudio: boolean;
  addImages: boolean;
  force: boolean;
  limit?: number;
}

export interface EnrichSummary {
  synonyms: number;
  audio: number;
  images: number;
}

function loadTierRows(db: DB, tier: string): WordRow[] {
  return db
    .prepare(`SELECT * FROM words WHERE tier_id = ? AND deleted_at IS NULL`)
    .all(tier) as WordRow[];
}

/** Apply enrichments to the rows of one tier using the given providers. */
export async function runEnrich(
  db: DB,
  providers: ProviderRegistry,
  options: EnrichOptions,
): Promise<EnrichSummary> {
  const summary: EnrichSummary = { synonyms: 0, audio: 0, images: 0 };
  let rows = loadTierRows(db, options.tier);
  if (options.limit !== undefined) rows = rows.slice(0, options.limit);

  const setSynonyms = db.prepare(`UPDATE words SET synonyms = ?, antonyms = ? WHERE id = ?`);
  const setAudio = db.prepare(`UPDATE words SET audio_path = ? WHERE id = ?`);
  const setImage = db.prepare(`UPDATE words SET image_path = ? WHERE id = ?`);

  for (const row of rows) {
    if (options.addSynonyms && (options.force || row.synonyms === null)) {
      const { synonyms, antonyms } = await providers.synonyms.generate(row);
      setSynonyms.run(JSON.stringify(synonyms), JSON.stringify(antonyms), row.id);
      summary.synonyms += 1;
    }
    if (options.addAudio && (options.force || row.audio_path === null)) {
      const path = await providers.audio.assignAudio(row);
      if (path !== null) {
        setAudio.run(path, row.id);
        summary.audio += 1;
      }
    }
    if (options.addImages && (options.force || row.image_path === null)) {
      const path = await providers.image.assignImage(row);
      if (path !== null) {
        setImage.run(path, row.id);
        summary.images += 1;
      }
    }
  }
  return summary;
}

/** CLI entry for `enrich`. */
export async function enrichCommand(args: string[]): Promise<void> {
  const tier = flagValue(args, '--tier');
  if (!tier) throw new Error('enrich requires --tier <slug> (bounds cost)');

  const config = loadConfig();
  if (!findTier(config, tier)) throw new Error(`unknown tier '${tier}'`);

  const limitRaw = flagValue(args, '--limit');
  const options: EnrichOptions = {
    tier,
    addSynonyms: args.includes('--add-synonyms'),
    addAudio: args.includes('--add-audio'),
    addImages: args.includes('--add-images'),
    force: args.includes('--force'),
    limit: limitRaw ? Number.parseInt(limitRaw, 10) : undefined,
  };

  if (args.includes('--dry-run')) {
    logger.print(`dry-run: would enrich tier '${tier}' (no provider calls, $0)`);
    return;
  }

  // Default providers are offline; a real provider is swapped in here later.
  const providers = defaultProviders();
  const db = openWorkingDb();
  try {
    const summary = await runEnrich(db, providers, options);
    logger.print(
      `enriched synonyms ${summary.synonyms} / audio ${summary.audio} / images ${summary.images}`,
    );
  } finally {
    db.close();
  }
}
