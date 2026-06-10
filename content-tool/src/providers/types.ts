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
import type { SenseIngestItem } from '@/commands/ingest-senses';

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

/** A word the sense provider declined to enrich (seed-list junk, API failure). */
export interface SenseSkip {
  word_id: string;
  word: string;
  /** One-line reason, e.g. "proper noun (surname)" or "provider_error". */
  reason: string;
}

export interface SenseGenerationResult {
  /** Valid `SenseIngestItem`s keyed by `word_id`. */
  items: Map<string, SenseIngestItem>;
  /** Words deliberately not enriched, with a one-line reason each. */
  skipped: SenseSkip[];
}

/**
 * Generates rich multi-sense teaching content (CONTENT-2): per word, decides
 * genuinely-distinct senses (conservative — default 1), writes a felt
 * explanation + 2–3 full-sentence teaching examples per sense, and SKIPS
 * seed-list junk (proper nouns, demonyms, mislabeled function words,
 * inflections) instead of dressing it up.
 */
export interface SenseProvider {
  readonly name: string;
  generate(words: WordRow[]): Promise<SenseGenerationResult>;
}

export interface ProviderRegistry {
  synonyms: SynonymProvider;
  audio: AudioProvider;
  image: ImageProvider;
  definitions: DefinitionProvider;
}
