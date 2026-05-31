/**
 * C6: env-gated synonym/antonym provider. Reuses the C4 enrich seam
 * (SynonymProvider PORT) so `enrich --tier foundation --add-synonyms` can fill
 * `synonyms`/`antonyms` (validated as JSON arrays by validate rule #6).
 *
 * Fail-closed, like the rest of the pipeline's paid-API surfaces: the real
 * OpenAI call only runs when `OPENAI_API_KEY` is present AND a `fetchSynonyms`
 * caller is injected. With no key the provider is a Noop emitting empty arrays,
 * so CI / a clean checkout runs unchanged with ZERO network calls (mirrors
 * defaultProviders' NoopSynonymProvider). Tests inject a fake `fetchSynonyms` to
 * exercise the populated path without touching OpenAI.
 */

import type { WordRow } from '@/schema/types';
import type { SynonymProvider, SynonymSet } from '@/providers/types';
import { logger } from '@/lib/logger';

/**
 * The network seam: given a word + its definition, return the model's
 * synonyms/antonyms. Kept as an injected function so the provider stays
 * unit-testable with no real OpenAI dependency. A real implementation would POST
 * to the OpenAI API; none is wired here (no paid call by default).
 */
export type FetchSynonyms = (word: WordRow, apiKey: string) => Promise<SynonymSet>;

export interface OpenAiSynonymOptions {
  /** API key; defaults to process.env.OPENAI_API_KEY. Absent -> Noop. */
  apiKey?: string;
  /** Injected network caller; only invoked when a key is present. */
  fetchSynonyms?: FetchSynonyms;
}

/** Validate + coerce model output to a clean string[] (drops non-strings/blanks). */
function cleanList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((x): x is string => typeof x === 'string')
    .map((x) => x.trim())
    .filter((x) => x.length > 0);
}

export function sanitizeSynonymSet(raw: { synonyms?: unknown; antonyms?: unknown }): SynonymSet {
  return {
    synonyms: cleanList(raw.synonyms),
    antonyms: cleanList(raw.antonyms),
  };
}

/**
 * Synonym provider that calls OpenAI when configured, else Noop. Selected via
 * `enrich --provider openai`. The default (unset key) behavior is identical to
 * NoopSynonymProvider — empty arrays — so the build never depends on a paid call.
 */
export class OpenAiSynonymProvider implements SynonymProvider {
  readonly name = 'openai';
  private readonly apiKey?: string;
  private readonly fetchSynonyms?: FetchSynonyms;

  constructor(options: OpenAiSynonymOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
    this.fetchSynonyms = options.fetchSynonyms;
  }

  /** True when a real call would be made (key present AND caller injected). */
  get enabled(): boolean {
    return Boolean(this.apiKey) && Boolean(this.fetchSynonyms);
  }

  async generate(word: WordRow): Promise<SynonymSet> {
    if (!this.apiKey || !this.fetchSynonyms) {
      // Fail-closed: no key/caller -> behave exactly like the offline Noop.
      return { synonyms: [], antonyms: [] };
    }
    try {
      const raw = await this.fetchSynonyms(word, this.apiKey);
      return sanitizeSynonymSet(raw);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn(`openai synonyms failed for '${word.word}': ${msg} (emitting empty arrays)`);
      return { synonyms: [], antonyms: [] };
    }
  }
}
