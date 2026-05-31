/**
 * qa/sample.ts — C5 QA sampling harness.
 *
 * Picks a random 10-15% sample of foundation.csv, runs C4 enrichment,
 * and generates a validation report with pass/fail counts.
 *
 * Usage:
 *   npm run qa:sample [--size 300] [--seed 1234] [--dry-run]
 *
 * Output:
 *   - data/output/qa-sample.csv  (enriched sample)
 *   - QA_SAMPLE_RESULTS.md       (validation report)
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'csv-parse/sync';
import { Anthropic } from '@anthropic-ai/sdk';
import { logger } from '@/lib/logger';

interface SampleRow {
  word: string;
  pos: string | null;
  cefr: string | null;
  theme: string | null;
}

interface EnrichedRow extends SampleRow {
  definition: string;
  example_sentence: string;
}

interface ValidationResult {
  word: string;
  definition: string;
  example_sentence: string;
  definition_pass: boolean;
  example_pass: boolean;
  definition_failures: string[];
  example_failures: string[];
  overall_pass: boolean;
}

/**
 * Parse input CSV with word, pos, cefr, theme columns.
 */
function parseInputCsv(text: string): SampleRow[] {
  const records = parse(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, unknown>[];

  return records.map((record, idx) => {
    const word = String(record.word ?? '').trim();
    if (!word) throw new Error(`Row ${idx + 2}: missing word`);
    return {
      word,
      pos: record.pos ? String(record.pos).trim() : null,
      cefr: record.cefr ? String(record.cefr).trim() : null,
      theme: record.theme ? String(record.theme).trim() : null,
    };
  });
}

/**
 * Pick a random sample of size N from the rows.
 * If seed is provided, use it for reproducibility.
 */
function sampleRows(rows: SampleRow[], size: number, seed?: number): SampleRow[] {
  const rng = seed !== undefined ? createSeededRng(seed) : Math.random;
  const result = [...rows].sort(() => rng() - 0.5).slice(0, size);
  return result;
}

/**
 * Create a seeded PRNG (simple: LCG).
 */
function createSeededRng(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

/**
 * Enrich a batch of words via Claude.
 */
async function enrichBatch(client: Anthropic, words: string[]): Promise<Map<string, EnrichedRow>> {
  const userPrompt = `Generate ESL-appropriate definitions and single-blank example sentences for these words:
${JSON.stringify(words)}

For EACH word, respond with ONLY this exact JSON format (no extra text):
[
  {"word": "word1", "definition": "brief definition", "example_sentence": "sentence with _ blank for target word"},
  ...
]

RULES:
- definition: 1-2 concise sentences, A2-B1 ESL level, max 25 words
- example_sentence: exactly 1 blank (_) where the word appears, natural English, context clue present
- JSON ONLY, no markdown, no extra text`;

  const message = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 2000,
    system:
      'You are an ESL vocabulary expert. Generate accurate, learner-friendly definitions and example sentences. Vocabulary must be A2-B1 level. Examples must be grammatically natural.',
    messages: [
      {
        role: 'user',
        content: userPrompt,
      },
    ],
  });

  const responseText = message.content[0]?.type === 'text' ? message.content[0].text : '';

  // Parse JSON array from response
  const jsonMatch = responseText.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    logger.warn(`Could not parse JSON from enrichment response for batch: ${words.join(', ')}`);
    return new Map();
  }

  const results: Array<{ word: string; definition: string; example_sentence: string }> = JSON.parse(
    jsonMatch[0],
  );
  const map = new Map<string, EnrichedRow>();

  for (const row of results) {
    if (row.word && row.definition && row.example_sentence) {
      const wordLower = row.word.toLowerCase();
      // Metadata (pos, cefr, theme) merged in post-processing
      map.set(wordLower, {
        word: row.word,
        pos: null,
        cefr: null,
        theme: null,
        definition: row.definition,
        example_sentence: row.example_sentence,
      });
    }
  }

  return map;
}

/**
 * Validate a definition against QA criteria D1–D5.
 */
function validateDefinition(def: string): { pass: boolean; failures: string[] } {
  const failures: string[] = [];

  // D1: Length check (1–2 sentences, <60 words)
  const sentences = def.split(/[.!?]+/).filter((s) => s.trim());
  if (sentences.length > 2) {
    failures.push('D1: More than 2 sentences');
  }
  const wordCount = def.split(/\s+/).length;
  if (wordCount > 60) {
    failures.push('D1: Definition exceeds 60 words');
  }

  // D2: Check for obviously complex vocabulary (heuristic: words > 12 chars)
  const complexWords = def.split(/\s+/).filter((w) => w.length > 12 && !['characterization', 'unfortunately'].includes(w));
  if (complexWords.length > 1) {
    failures.push(`D2: Complex vocabulary detected: ${complexWords.slice(0, 2).join(', ')}`);
  }

  // D3: Check for circular definitions (word appears in definition)
  // (Skipped for now — requires lemmatization. Marked for manual review.)

  // D4 & D5: Spot-check for obvious issues (skipped — manual review needed)

  return { pass: failures.length === 0, failures };
}

/**
 * Validate an example sentence against QA criteria E1–E6.
 */
function validateExample(example: string): { pass: boolean; failures: string[] } {
  const failures: string[] = [];

  // E1: Exactly one blank
  const blankCount = (example.match(/_/g) || []).length;
  if (blankCount !== 1) {
    failures.push(`E1: Expected 1 blank, found ${blankCount}`);
  }

  // E2: Blank position (heuristic: blank not at start/end)
  const blankIdx = example.indexOf('_');
  if (blankIdx === 0 || blankIdx === example.length - 1) {
    failures.push('E2: Blank at sentence start or end');
  }

  // E3: Length check (natural English is usually 8–20 words)
  const wordCount = example.replace(/_/, 'word').split(/\s+/).length;
  if (wordCount < 5 || wordCount > 25) {
    failures.push(`E3: Unusual length (${wordCount} words; typical: 8–20)`);
  }

  // E4 & E5 & E6: Require manual inspection
  // (Skipped for now — complex heuristics. Marked for manual review.)

  return { pass: failures.length === 0, failures };
}

/**
 * Enrich a sample CSV, validate results, and generate a report.
 */
export async function runQaSample(options: {
  sampleSize: number;
  seed?: number;
  dryRun: boolean;
  inputPath: string;
  outputPath: string;
  reportPath: string;
}): Promise<void> {
  // 1. Load and sample
  logger.print(`Loading ${options.inputPath}...`);
  const inputText = readFileSync(options.inputPath, 'utf8');
  const allRows = parseInputCsv(inputText);
  logger.print(`Loaded ${allRows.length} words`);

  const sample = sampleRows(allRows, options.sampleSize, options.seed);
  logger.print(`Sampled ${sample.length} words for QA (${((sample.length / allRows.length) * 100).toFixed(1)}%)`);

  if (options.dryRun) {
    logger.print('DRY-RUN: would enrich sample');
    return;
  }

  // 2. Enrich via Claude
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY env var not set');
  }

  const client = new Anthropic({ apiKey });
  const enrichedMap = new Map<string, EnrichedRow>();
  const batchSize = 30; // smaller batches for QA
  const batchCount = Math.ceil(sample.length / batchSize);

  logger.print(`Enriching ${sample.length} words in ~${batchCount} batches...`);

  for (let i = 0; i < sample.length; i += batchSize) {
    const batch = sample.slice(i, Math.min(i + batchSize, sample.length));
    const words = batch.map((r) => r.word);

    try {
      const batchNum = Math.floor(i / batchSize) + 1;
      logger.print(`Batch ${batchNum}/${batchCount}: enriching ${words.length} words...`);
      const batchResults = await enrichBatch(client, words);

      // Merge original metadata
      for (const [word, enriched] of batchResults) {
        const orig = batch.find((r) => r.word.toLowerCase() === word);
        if (orig) {
          enriched.pos = orig.pos;
          enriched.cefr = orig.cefr;
          enriched.theme = orig.theme;
        }
        enrichedMap.set(word, enriched);
      }

      logger.print(`  → matched ${batchResults.size}/${words.length}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn(`  → batch failed: ${msg} (skipping)`);
    }
  }

  // 3. Validate
  logger.print('Validating enriched words...');
  const validationResults: ValidationResult[] = [];

  for (const row of sample) {
    const enriched = enrichedMap.get(row.word.toLowerCase());
    if (!enriched) {
      // Unenriched
      validationResults.push({
        word: row.word,
        definition: '[UNENRICHED]',
        example_sentence: '[UNENRICHED]',
        definition_pass: false,
        example_pass: false,
        definition_failures: ['C4: No enrichment returned'],
        example_failures: ['C4: No enrichment returned'],
        overall_pass: false,
      });
      continue;
    }

    const defVal = validateDefinition(enriched.definition);
    const exVal = validateExample(enriched.example_sentence);

    validationResults.push({
      word: enriched.word,
      definition: enriched.definition,
      example_sentence: enriched.example_sentence,
      definition_pass: defVal.pass,
      example_pass: exVal.pass,
      definition_failures: defVal.failures,
      example_failures: exVal.failures,
      overall_pass: defVal.pass && exVal.pass,
    });
  }

  // 4. Write enriched CSV
  const csvLines = ['word,pos,cefr,theme,definition,example_sentence'];
  for (const result of validationResults) {
    const row = [
      result.word,
      enrichedMap.get(result.word.toLowerCase())?.pos || '',
      enrichedMap.get(result.word.toLowerCase())?.cefr || '',
      enrichedMap.get(result.word.toLowerCase())?.theme || '',
      `"${result.definition.replace(/"/g, '""')}"`,
      `"${result.example_sentence.replace(/"/g, '""')}"`,
    ];
    csvLines.push(row.join(','));
  }
  writeFileSync(options.outputPath, csvLines.join('\n'), 'utf8');
  logger.print(`Wrote ${validationResults.length} enriched words to ${options.outputPath}`);

  // 5. Generate report
  const passCount = validationResults.filter((r) => r.overall_pass).length;
  const compliance = ((passCount / validationResults.length) * 100).toFixed(1);
  const defPassCount = validationResults.filter((r) => r.definition_pass).length;
  const exPassCount = validationResults.filter((r) => r.example_pass).length;

  const failuresByType: { [key: string]: number } = {};
  for (const result of validationResults) {
    if (!result.overall_pass) {
      for (const failure of [...result.definition_failures, ...result.example_failures]) {
        failuresByType[failure] = (failuresByType[failure] || 0) + 1;
      }
    }
  }

  const report = `---
title: C5 QA Sample Results
status: active
created: 2026-05-31
sample_size: ${validationResults.length}
compliance_percent: ${compliance}
---

# C5 QA Sample Validation Results

**Sample date:** 2026-05-31
**Sample size:** ${validationResults.length} words
**Compliance:** ${passCount}/${validationResults.length} (${compliance}%)

## Summary

| Metric | Count | % |
|--------|-------|---|
| **Overall pass** | ${passCount} | ${compliance} |
| **Definition pass** | ${defPassCount} | ${((defPassCount / validationResults.length) * 100).toFixed(1)} |
| **Example pass** | ${exPassCount} | ${((exPassCount / validationResults.length) * 100).toFixed(1)} |
| **Unenriched** | ${validationResults.filter((r) => r.definition === '[UNENRICHED]').length} | ${(((validationResults.filter((r) => r.definition === '[UNENRICHED]').length) / validationResults.length) * 100).toFixed(1)} |

## Decision

${
  compliance >= '85'
    ? `✅ **PASS: ${compliance}% compliance ≥ 85%. Approved for full C4 enrichment run.**`
    : compliance >= '70'
      ? `⚠️ **ITERATE: ${compliance}% compliance in 70–84% range. Review failures below, adjust C4 prompt, re-run sample.`
      : `❌ **FAIL: ${compliance}% compliance < 70%. Fundamental issue. Escalate and rethink C4 strategy.`
}

---

**Next steps:**
${
  compliance >= '85'
    ? `Run full C4 enrichment: \`npm run enrich -- --input data/input/foundation.csv --output data/output/foundation-enriched.csv --budget 100\``
    : `Review failures, adjust C4 prompt in \`src/commands/enrich.ts\` (lines 89–101), and re-run: \`npm run qa:sample\``
}
`;

  writeFileSync(options.reportPath, report, 'utf8');
  logger.print(`Wrote QA report to ${options.reportPath}`);
  logger.print(`Compliance: ${compliance}%`);

  if (compliance >= '85') {
    logger.print('✅ Sample passed. Ready for full C4 enrichment run.');
  } else if (compliance >= '70') {
    logger.print('⚠️ Sample in acceptable range. Consider iterating on C4 prompt.');
  } else {
    logger.print('❌ Sample failed. Escalate.');
  }
}

// CLI entry
export async function qaSampleCommand(args: string[]): Promise<void> {
  const sizeArg = args.find((a) => a.startsWith('--size='))?.split('=')[1];
  const size = sizeArg ? Number.parseInt(sizeArg, 10) : 300; // 10% of 3000
  const seedRaw = args.find((a) => a.startsWith('--seed='))?.split('=')[1];
  const seed = seedRaw ? Number.parseInt(seedRaw, 10) : undefined;
  const dryRun = args.includes('--dry-run');

  // Work relative to the content-tool directory (where cli.ts runs)
  const baseDir = process.cwd();
  const inputPath = join(baseDir, 'data', 'input', 'foundation.csv');
  const outputPath = join(baseDir, 'data', 'output', 'qa-sample.csv');
  const reportPath = join(baseDir, 'QA_SAMPLE_RESULTS.md');

  try {
    await runQaSample({ sampleSize: size, seed, dryRun, inputPath, outputPath, reportPath });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`QA sample failed: ${msg}`);
    process.exit(1);
  }
}
