/**
 * Enrichment provider PORTs (hexagonal seams). `enrich` depends only on these
 * interfaces; concrete adapters (OpenAI text, ElevenLabs/Google audio) are
 * injected. This keeps the pipeline runnable offline in CI — the default
 * providers ship in `defaultProviders.ts` and require no API keys or network.
 *
 * A real adapter is added later by implementing one of these interfaces and
 * wiring it in `enrich`'s provider registry; no other code changes.
 */

import type { WordRow } from '@/schema/types';

export interface SynonymSet {
  synonyms: string[];
  antonyms: string[];
}

/** Generates synonyms/antonyms for a word (future: OpenAI). */
export interface SynonymProvider {
  readonly name: string;
  generate(word: WordRow): Promise<SynonymSet>;
}

/** Assigns/produces a pronunciation audio file, returning its stored path. */
export interface AudioProvider {
  readonly name: string;
  /** Returns the `audio_path` to store (relative to data/assets/), or null. */
  assignAudio(word: WordRow): Promise<string | null>;
}

/** Curates one image per word, returning its stored path. */
export interface ImageProvider {
  readonly name: string;
  assignImage(word: WordRow): Promise<string | null>;
}

export interface DefinitionResult {
  definition: string;
  exampleSentence: string;
}

/** Generates an ESL-register definition + single-blank example sentence. */
export interface DefinitionProvider {
  readonly name: string;
  /** Returns null if the word should be skipped (e.g. API failure for a batch). */
  generate(words: WordRow[]): Promise<Map<string, DefinitionResult>>;
}

export interface ProviderRegistry {
  synonyms: SynonymProvider;
  audio: AudioProvider;
  image: ImageProvider;
  definitions: DefinitionProvider;
}
