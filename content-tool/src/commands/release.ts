/**
 * `release` (C8) — one repeatable, fail-closed content-release pipeline:
 *
 *   import -> enrich -> validate --strict -> export (+ version bump)
 *     -> copy output words.db to mobile/assets/vocab/words.db
 *
 * Fail-closed is the whole point: if ANY step errors — especially
 * `validate --strict` — the chain aborts and the mobile bundle is NEVER
 * overwritten. A bad DB must not reach the app. The copy is the last step and
 * only runs after a clean strict export.
 *
 * The enrich step respects the no-paid-call rule: it uses the injected provider
 * registry, which is the offline Noop unless `--provider openai` + a key are
 * present (see selectProviders / OpenAiSynonymProvider). So `release` runs end-
 * to-end in CI with zero network and a deterministic words.db.
 *
 * `runReleasePipeline` is a pure-ish orchestrator: it takes the working/output
 * DB handles + a `copy` function, so the fail-closed guarantee (a failing
 * validate prevents the copy) is unit-testable without touching real files.
 */

import { existsSync, copyFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import type { DB } from '@/lib/db';
import { openWorkingDb, createFreshOutputDb, WORKING_DB_PATH, OUTPUT_DB_PATH } from '@/lib/db';
import { loadConfig, type AppConfig, PROJECT_ROOT } from '@/lib/config';
import { runValidate } from '@/commands/validate';
import { buildOutputDb, computeUserVersion, bootstrapWorkingForRelease } from '@/commands/export';
import { selectProviders } from '@/providers/defaultProviders';
import { logger } from '@/lib/logger';
import { flagValue } from '@/commands/validate';

/** Canonical destination for the shipped DB: the mobile app's bundled asset. */
export const MOBILE_WORDS_DB_PATH = resolve(
  PROJECT_ROOT,
  '..',
  'mobile',
  'assets',
  'vocab',
  'words.db',
);

export interface ReleaseOptions {
  bump: 'major' | 'minor' | 'patch';
  /** When false, skip the final copy (build + validate only). */
  copy: boolean;
  priorVersion: number;
}

export interface ReleaseResult {
  userVersion: number;
  totalWords: number;
  copied: boolean;
}

/** A copy seam so tests can assert the copy did/did not happen without real I/O. */
export type CopyFn = () => void;

/**
 * Orchestrate validate(strict) -> export -> copy against already-populated DB
 * handles. Fail-closed: a strict-validation error throws BEFORE export, and the
 * `copy` callback is only invoked after a clean export. Returns the version + a
 * `copied` flag.
 */
export function runReleasePipeline(
  working: DB,
  output: DB,
  config: AppConfig,
  options: ReleaseOptions,
  copy: CopyFn,
): ReleaseResult {
  // Step: validate --strict against the working DB. Abort the whole chain on
  // any error so a bad DB is never exported or copied.
  const validation = runValidate(working, config, { strict: true });
  if (validation.errorCount > 0) {
    const detail = validation.issues
      .filter((i) => i.level === 'error')
      .slice(0, 10)
      .map((i) => `${i.wordId} ${i.field}: ${i.message}`)
      .join('; ');
    throw new Error(
      `release aborted: validate --strict found ${validation.errorCount} error(s): ${detail}`,
    );
  }

  // Step: export (also strict, also fail-closed) + version bump.
  const userVersion = computeUserVersion(options.priorVersion, options.bump);
  const result = buildOutputDb(working, output, config, userVersion, { strict: true });

  // Step: copy to the mobile bundle — LAST, only after a clean build.
  let copied = false;
  if (options.copy) {
    copy();
    copied = true;
  }

  return { userVersion, totalWords: result.totalWords, copied };
}

/** Read the prior user_version from an existing output DB (0 if none). */
async function readPriorVersion(outputPath: string): Promise<number> {
  if (!existsSync(outputPath)) return 0;
  const Database = (await import('better-sqlite3')).default;
  const prior = new Database(outputPath, { readonly: true });
  const v = Number(prior.pragma('user_version', { simple: true }));
  prior.close();
  return v;
}

/** CLI entry for `release`. */
export async function releaseCommand(args: string[]): Promise<void> {
  const bump = (flagValue(args, '--bump') ?? 'patch') as 'major' | 'minor' | 'patch';
  const copy = !args.includes('--no-copy');
  const provider = flagValue(args, '--provider');

  // Validate the provider name up front (offline Noop unless openai + key).
  const providers = selectProviders(provider);

  const config = loadConfig();
  const working = openWorkingDb(WORKING_DB_PATH);
  try {
    // import + enrich (offline unless a paid provider is configured).
    await bootstrapWorkingForRelease(working, config, providers);

    const priorVersion = await readPriorVersion(OUTPUT_DB_PATH);
    const output = createFreshOutputDb(OUTPUT_DB_PATH);
    let result: ReleaseResult;
    try {
      result = runReleasePipeline(
        working,
        output,
        config,
        { bump, copy, priorVersion },
        () => {
          mkdirSync(dirname(MOBILE_WORDS_DB_PATH), { recursive: true });
          copyFileSync(OUTPUT_DB_PATH, MOBILE_WORDS_DB_PATH);
        },
      );
    } finally {
      output.close();
    }

    logger.print(
      `release complete: ${result.totalWords} words, user_version=${result.userVersion}` +
        (result.copied ? ` -> copied to ${MOBILE_WORDS_DB_PATH}` : ' (copy skipped)'),
    );
  } finally {
    working.close();
  }
}
