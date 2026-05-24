/**
 * App-scoped path resolution (CONTENT_PIPELINE_ARCHITECTURE.md App-Agnostic
 * Parameterization). Without `--app`, paths are the flat Phase-1 layout
 * (`data/output/words.db`). With `--app <id>`, output is namespaced under
 * `data/output/<app_id>/` and input is read from `data/input/<app_id>/` when
 * that directory exists, so sister apps reuse the identical pipeline with no
 * code changes.
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { PROJECT_ROOT } from '@/lib/config';

export interface AppPaths {
  /** Absolute path of the built read-only words.db. */
  outputDb: string;
  /** Absolute path of build-manifest.json (sits beside words.db). */
  manifest: string;
  /** Absolute path of the output asset bundle dir (assets/{audio,images}). */
  outputAssetsDir: string;
  /** Absolute path of the source corpora dir for import bootstrap. */
  inputDir: string;
}

const DATA_DIR = resolve(PROJECT_ROOT, 'data');

/**
 * Resolve the pipeline paths for an optional app id. `app` undefined keeps the
 * flat layout; a value namespaces output under `data/output/<app>/`.
 */
export function resolveAppPaths(app?: string): AppPaths {
  const outputBase = app ? resolve(DATA_DIR, 'output', app) : resolve(DATA_DIR, 'output');

  // Prefer a per-app input dir if one exists; otherwise fall back to the flat
  // `data/input/` corpora (LexiTap's Phase-1 layout).
  const appInputDir = app ? resolve(DATA_DIR, 'input', app) : undefined;
  const inputDir =
    appInputDir && existsSync(appInputDir) ? appInputDir : resolve(DATA_DIR, 'input');

  return {
    outputDb: resolve(outputBase, 'words.db'),
    manifest: resolve(outputBase, 'build-manifest.json'),
    outputAssetsDir: resolve(outputBase, 'assets'),
    inputDir,
  };
}
