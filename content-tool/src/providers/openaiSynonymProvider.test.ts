import { describe, it, expect } from 'vitest';
import {
  OpenAiSynonymProvider,
  sanitizeSynonymSet,
} from '@/providers/openaiSynonymProvider';
import { selectProviders } from '@/providers/defaultProviders';
import type { WordRow } from '@/schema/types';

function row(overrides: Partial<WordRow> = {}): WordRow {
  return {
    id: 'word_borrow0001',
    word: 'borrow',
    definition: 'To take and return later',
    pos: 'verb',
    cefr_level: 'A2',
    grade_level: null,
    word_type: 'vocabulary',
    difficulty: 2,
    theme: 'Daily Life',
    example_sentence: 'Can I _ your pen?',
    image_path: null,
    audio_path: null,
    synonyms: null,
    antonyms: null,
    usage_notes: null,
    definition_license: 'original',
    created_at: 1,
    deleted_at: null,
    ...overrides,
  };
}

describe('OpenAiSynonymProvider (C6, env-gated, fail-closed)', () => {
  it('is a Noop (empty arrays, no network) when no key is present', async () => {
    const provider = new OpenAiSynonymProvider({ apiKey: undefined });
    expect(provider.enabled).toBe(false);
    expect(await provider.generate(row())).toEqual({ synonyms: [], antonyms: [] });
  });

  it('does not call the network seam when no key is present', async () => {
    let called = false;
    const provider = new OpenAiSynonymProvider({
      apiKey: undefined,
      fetchSynonyms: async () => {
        called = true;
        return { synonyms: ['x'], antonyms: [] };
      },
    });
    await provider.generate(row());
    expect(called).toBe(false);
  });

  it('calls the injected fetcher and populates arrays when a key is present', async () => {
    const provider = new OpenAiSynonymProvider({
      apiKey: 'sk-test',
      fetchSynonyms: async (w) => ({
        synonyms: [`syn-${w.word}`, 'lend'],
        antonyms: ['return'],
      }),
    });
    expect(provider.enabled).toBe(true);
    expect(await provider.generate(row())).toEqual({
      synonyms: ['syn-borrow', 'lend'],
      antonyms: ['return'],
    });
  });

  it('fails closed (empty arrays) when the fetcher throws', async () => {
    const provider = new OpenAiSynonymProvider({
      apiKey: 'sk-test',
      fetchSynonyms: async () => {
        throw new Error('boom');
      },
    });
    expect(await provider.generate(row())).toEqual({ synonyms: [], antonyms: [] });
  });

  it('sanitizes model output: drops non-strings and blanks, trims', () => {
    expect(
      sanitizeSynonymSet({
        synonyms: ['  lend ', '', 3, null, 'loan'],
        antonyms: 'not-an-array',
      }),
    ).toEqual({ synonyms: ['lend', 'loan'], antonyms: [] });
  });

  it('selectProviders("openai") swaps in the OpenAI synonym provider', () => {
    const registry = selectProviders('openai');
    expect(registry.synonyms.name).toBe('openai');
  });

  it('selectProviders() default keeps the offline Noop synonym provider', () => {
    const registry = selectProviders();
    expect(registry.synonyms.name).toBe('noop');
  });
});
