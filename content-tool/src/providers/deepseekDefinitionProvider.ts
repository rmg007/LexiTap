/**
 * C4 — DeepSeek definition + example enrichment provider.
 *
 * Uses the DeepSeek OpenAI-compatible API (https://api.deepseek.com/v1).
 * Batches up to BATCH_SIZE words per call, generates ESL-register definitions
 * and single-blank example sentences. Fail-closed: a failed batch returns no
 * results for those words (they keep their TBD stubs). Requires DEEPSEEK_API_KEY.
 */

import { logger } from '@/lib/logger';
import type { WordRow } from '@/schema/types';
import type { DefinitionProvider, DefinitionResult } from '@/providers/types';

const BATCH_SIZE = 60;
const MODEL = 'deepseek-chat';
const API_URL = 'https://api.deepseek.com/v1/chat/completions';

interface BatchItem {
  word: string;
  pos: string | null;
}

interface BatchOutput {
  word: string;
  definition: string;
  example_sentence: string;
}

export class DeepSeekDefinitionProvider implements DefinitionProvider {
  readonly name = 'deepseek';
  private readonly apiKey: string;

  constructor(apiKey?: string) {
    const key = apiKey ?? process.env.DEEPSEEK_API_KEY;
    if (!key) throw new Error('DeepSeekDefinitionProvider requires DEEPSEEK_API_KEY');
    this.apiKey = key;
  }

  async generate(words: WordRow[]): Promise<Map<string, DefinitionResult>> {
    const result = new Map<string, DefinitionResult>();
    for (let i = 0; i < words.length; i += BATCH_SIZE) {
      const batch = words.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(words.length / BATCH_SIZE);
      logger.print(`  definitions batch ${batchNum}/${totalBatches} (${batch.length} words)...`);
      const batchMap = await this._enrichBatch(batch);
      for (const [word, res] of batchMap) result.set(word, res);
      logger.print(`  → matched ${batchMap.size}/${batch.length}`);
    }
    return result;
  }

  private async _enrichBatch(words: WordRow[]): Promise<Map<string, DefinitionResult>> {
    const items: BatchItem[] = words.map((w) => ({ word: w.word, pos: w.pos }));

    const userPrompt = `Generate ESL-appropriate definitions and example sentences for these English words:
${JSON.stringify(items)}

For EACH word respond with ONLY this exact JSON array (no markdown, no extra text):
[
  {"word": "word1", "definition": "brief 1-2 sentence definition", "example_sentence": "sentence with _ blank"},
  ...
]

RULES:
- definition: 1-2 concise sentences, A2-B1 ESL level, no jargon
- example_sentence: EXACTLY one blank character _ where the word should go; the word itself must NOT appear anywhere else in the sentence
- Use the part of speech provided to write an appropriate sentence
- JSON only, no markdown fences`;

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 2500,
          messages: [
            {
              role: 'system',
              content:
                'You are an ESL vocabulary expert. Generate accurate, learner-friendly definitions and example sentences. Follow all rules exactly.',
            },
            { role: 'user', content: userPrompt },
          ],
        }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '(unreadable)');
        logger.warn(`batch HTTP ${response.status}: ${body} (skipping ${words.length} words)`);
        return new Map();
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const text = data.choices?.[0]?.message?.content ?? '';
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        logger.warn(`batch: could not parse JSON response (words: ${words.map((w) => w.word).join(', ')})`);
        return new Map();
      }

      const outputs: BatchOutput[] = JSON.parse(jsonMatch[0]);
      const map = new Map<string, DefinitionResult>();
      for (const out of outputs) {
        if (out.word && out.definition && out.example_sentence) {
          map.set(out.word.toLowerCase(), {
            definition: out.definition,
            exampleSentence: out.example_sentence,
          });
        }
      }
      return map;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn(`batch failed: ${msg} (skipping ${words.length} words)`);
      return new Map();
    }
  }
}
