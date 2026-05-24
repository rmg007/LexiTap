/**
 * Offline, deterministic default providers so the pipeline runs in CI with no
 * API keys or network (CONTENT_PIPELINE_ARCHITECTURE.md enrichment seam).
 *
 * - Synonyms: no-op (emits empty arrays). A real OpenAI adapter replaces this.
 * - Audio: deterministic path assignment for tiers that ship audio (TOEFL). It
 *   only computes the conventional `assets/audio/{word_id}.mp3` path; it does
 *   NOT synthesize a file (a real TTS adapter does that). The path is recorded
 *   so the schema seam and manifest coverage are exercised offline.
 * - Image: no-op (curation is manual / a future Unsplash adapter).
 */

import type { WordRow } from '@/schema/types';
import type {
  AudioProvider,
  ImageProvider,
  ProviderRegistry,
  SynonymProvider,
  SynonymSet,
} from '@/providers/types';

export class NoopSynonymProvider implements SynonymProvider {
  readonly name = 'noop';
  // word is intentionally unused: the offline default invents nothing.
  async generate(_word: WordRow): Promise<SynonymSet> {
    return { synonyms: [], antonyms: [] };
  }
}

export class DeterministicAudioProvider implements AudioProvider {
  readonly name = 'deterministic';
  async assignAudio(word: WordRow): Promise<string | null> {
    // Conventional path only; no file is synthesized offline.
    return `assets/audio/${word.id}.mp3`;
  }
}

export class NoopImageProvider implements ImageProvider {
  readonly name = 'noop';
  async assignImage(_word: WordRow): Promise<string | null> {
    return null;
  }
}

export function defaultProviders(): ProviderRegistry {
  return {
    synonyms: new NoopSynonymProvider(),
    audio: new DeterministicAudioProvider(),
    image: new NoopImageProvider(),
  };
}

/**
 * Provider names the pipeline recognizes per modality
 * (CONTENT_PIPELINE_ARCHITECTURE.md enrich `--provider`). Real adapters for
 * these are deferred (they need API keys/network); offline defaults stand in so
 * CI runs unchanged. Selecting a name validates it and is recorded for the
 * manifest/logs — an unknown name is a hard error rather than a silent no-op.
 */
export const KNOWN_PROVIDERS: ReadonlySet<string> = new Set([
  'openai', // synonyms/antonyms (text)
  'elevenlabs', // audio
  'google', // audio (alt)
  'unsplash', // images
]);

/**
 * Resolve the provider registry for an optional `--provider` name. Until real
 * adapters are wired the offline defaults are returned regardless, but an
 * unrecognized name throws so a typo never silently produces an empty build.
 */
export function selectProviders(provider?: string): ProviderRegistry {
  if (provider !== undefined && !KNOWN_PROVIDERS.has(provider)) {
    const known = [...KNOWN_PROVIDERS].join(', ');
    throw new Error(`unknown --provider '${provider}' (known: ${known})`);
  }
  return defaultProviders();
}
