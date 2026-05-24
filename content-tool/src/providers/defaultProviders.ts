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
