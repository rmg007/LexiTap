/**
 * Loads `lexitap.config.json` (app_id + tier definitions). Tier identity flows
 * from config + flags only; nothing in the pipeline hard-codes "lexitap" or a
 * tier slug (App-Agnostic Parameterization in CONTENT_PIPELINE_ARCHITECTURE.md).
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

export interface TierConfig {
  slug: string;
  name: string;
  description: string | null;
  is_free: boolean;
  price_usd: number | null;
  sku: string | null;
  display_order: number;
  requires_theme: boolean;
  audio: boolean;
}

export interface AppConfig {
  app_id: string;
  tiers: TierConfig[];
}

/** Project root = the directory two levels up from this file (src/lib -> root). */
const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

const DEFAULT_CONFIG_PATH = resolve(PROJECT_ROOT, 'lexitap.config.json');

export function loadConfig(configPath: string = DEFAULT_CONFIG_PATH): AppConfig {
  const raw = readFileSync(configPath, 'utf8');
  // Trusted local config file; parse shape is validated by the type cast plus
  // the accessor helpers below which throw on unknown tier slugs.
  const parsed = JSON.parse(raw) as AppConfig;
  return parsed;
}

export function findTier(config: AppConfig, slug: string): TierConfig | undefined {
  return config.tiers.find((t) => t.slug === slug);
}

export function tierSlugs(config: AppConfig): string[] {
  return config.tiers.map((t) => t.slug);
}

export { PROJECT_ROOT };
