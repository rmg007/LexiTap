import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { openMemoryContentDb } from '@/lib/db';
import { computeSample, ensureReviewSchema, parseReviewResults } from '@/commands/review';
import type { DB } from '@/lib/db';
import type { WordRow } from '@/schema/types';

describe('review', () => {
  let db: DB;

  beforeEach(() => {
    db = openMemoryContentDb();
    ensureReviewSchema(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('computeSample', () => {
    it('returns ~% of non-flagged words + 100% flagged', () => {
      // 100 words, 15% sample, 5 flagged → expect ~15 random + 5 flagged = ~20.
      const words: WordRow[] = Array.from({ length: 100 }, (_, i) => ({
        id: `word_${i}`,
        word: `word${i}`,
        definition: 'def',
        pos: 'noun',
        cefr_level: 'A1',
        grade_level: 1,
        word_type: 'vocabulary',
        difficulty: 1,
        frequency_rank: null,
        theme: 'Daily Life',
        example_sentence: 'The _ is big.',
        image_path: null,
        audio_path: null,
        synonyms: null,
        antonyms: null,
        usage_notes: null,
        definition_license: 'original',
        reviewed: 0,
        created_at: Date.now(),
        deleted_at: null,
      }));

      const flagged = new Set(['word_0', 'word_1', 'word_2', 'word_3', 'word_4']);
      const sample = computeSample(words, 15, flagged);

      // Should include all flagged.
      for (const f of flagged) {
        expect(sample).toContain(f);
      }

      // Random sample should be ~15% ± some tolerance (seeded, deterministic).
      const randomCount = sample.length - flagged.size;
      const expectedRandom = Math.ceil((words.length * 15) / 100);
      expect(randomCount).toBeLessThanOrEqual(expectedRandom + 5);
      expect(randomCount).toBeGreaterThanOrEqual(expectedRandom - 5);
    });

    it('includes 100% flagged even with 0% sample percent', () => {
      const words: WordRow[] = Array.from({ length: 10 }, (_, i) => ({
        id: `word_${i}`,
        word: `word${i}`,
        definition: 'def',
        pos: null,
        cefr_level: null,
        grade_level: null,
        word_type: null,
        difficulty: null,
        frequency_rank: null,
        theme: null,
        example_sentence: 'The _ is big.',
        image_path: null,
        audio_path: null,
        synonyms: null,
        antonyms: null,
        usage_notes: null,
        definition_license: 'original',
        reviewed: 0,
        created_at: Date.now(),
        deleted_at: null,
      }));

      const flagged = new Set(['word_5', 'word_7']);
      const sample = computeSample(words, 0, flagged);

      expect(sample).toContain('word_5');
      expect(sample).toContain('word_7');
      expect(sample.length).toBeGreaterThanOrEqual(2);
    });

    it('respects 100% sample percent (all words included)', () => {
      const words: WordRow[] = Array.from({ length: 20 }, (_, i) => ({
        id: `word_${i}`,
        word: `word${i}`,
        definition: 'def',
        pos: null,
        cefr_level: null,
        grade_level: null,
        word_type: null,
        difficulty: null,
        frequency_rank: null,
        theme: null,
        example_sentence: 'The _ is big.',
        image_path: null,
        audio_path: null,
        synonyms: null,
        antonyms: null,
        usage_notes: null,
        definition_license: 'original',
        reviewed: 0,
        created_at: Date.now(),
        deleted_at: null,
      }));

      const sample = computeSample(words, 100, new Set());
      expect(sample.length).toBe(20);
    });
  });

  describe('ensureReviewSchema', () => {
    it('adds reviewed column if missing', () => {
      const hasReviewed = (
        db.prepare(`SELECT COUNT(*) as n FROM pragma_table_info('words') WHERE name = 'reviewed'`)
          .get() as { n: number }
      ).n > 0;
      expect(hasReviewed).toBe(true);
    });

    it('creates review_metadata table', () => {
      const hasMetadata = (
        db
          .prepare(
            `SELECT COUNT(*) as n FROM sqlite_master WHERE type='table' AND name='review_metadata'`,
          )
          .get() as { n: number }
      ).n > 0;
      expect(hasMetadata).toBe(true);
    });

    it('is idempotent (safe to call multiple times)', () => {
      ensureReviewSchema(db);
      ensureReviewSchema(db);
      ensureReviewSchema(db);
      // Should not throw.
      const hasMetadata = (
        db
          .prepare(
            `SELECT COUNT(*) as n FROM sqlite_master WHERE type='table' AND name='review_metadata'`,
          )
          .get() as { n: number }
      ).n > 0;
      expect(hasMetadata).toBe(true);
    });
  });

  describe('parseReviewResults', () => {
    let tempFile: string;

    afterEach(() => {
      if (existsSync(tempFile)) {
        unlinkSync(tempFile);
      }
    });

    it('parses pass/fail status correctly', () => {
      tempFile = resolve('/tmp', `review-${Date.now()}.csv`);
      const csv = `"word_id","word","definition","example_sentence","pos","cefr_level","flagged","status"
"word_1","apple","a fruit","The _ is red.","noun","A1","no","pass"
"word_2","banana","another fruit","I ate a _.","noun","A1","no","pass"
"word_3","cat","animal","The _ is sleeping.","noun","A1","no","fail"`;
      writeFileSync(tempFile, csv, 'utf8');

      const result = parseReviewResults(tempFile);
      expect(result.passed).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.passRate).toBeCloseTo(66.67, 1);
      expect(result.allowExport).toBe(false);
    });

    it('gates export at 95% pass rate', () => {
      tempFile = resolve('/tmp', `review-${Date.now()}.csv`);
      // 19 pass, 1 fail = 95% → should allow.
      const rows = [
        `"word_id","word","definition","example_sentence","pos","cefr_level","flagged","status"`,
      ];
      for (let i = 0; i < 19; i++) {
        rows.push(`"word_${i}","w${i}","def","example","noun","A1","no","pass"`);
      }
      rows.push(`"word_fail","wfail","def","example","noun","A1","no","fail"`);

      writeFileSync(tempFile, rows.join('\n'), 'utf8');

      const result = parseReviewResults(tempFile);
      expect(result.passRate ?? 0).toBe(95);
      expect(result.allowExport).toBe(true);
    });

    it('blocks export below 95% pass rate', () => {
      tempFile = resolve('/tmp', `review-${Date.now()}.csv`);
      // 18 pass, 2 fail = 90% → block.
      const rows = [
        `"word_id","word","definition","example_sentence","pos","cefr_level","flagged","status"`,
      ];
      for (let i = 0; i < 18; i++) {
        rows.push(`"word_${i}","w${i}","def","example","noun","A1","no","pass"`);
      }
      rows.push(`"word_fail1","wfail1","def","example","noun","A1","no","fail"`);
      rows.push(`"word_fail2","wfail2","def","example","noun","A1","no","fail"`);

      writeFileSync(tempFile, rows.join('\n'), 'utf8');

      const result = parseReviewResults(tempFile);
      expect(result.passRate ?? 0).toBe(90);
      expect(result.allowExport).toBe(false);
    });

    it('ignores empty status rows (not yet reviewed)', () => {
      tempFile = resolve('/tmp', `review-${Date.now()}.csv`);
      const csv = `"word_id","word","definition","example_sentence","pos","cefr_level","flagged","status"
"word_1","apple","a fruit","The _ is red.","noun","A1","no","pass"
"word_2","banana","another fruit","I ate a _.","noun","A1","no",""
"word_3","cat","animal","The _ is sleeping.","noun","A1","no","pass"`;
      writeFileSync(tempFile, csv, 'utf8');

      const result = parseReviewResults(tempFile);
      // Should only count 2 (pass, pass), ignore the empty row.
      expect(result.passed).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.passRate).toBe(100);
      expect(result.allowExport).toBe(true);
    });

    it('throws on missing header', () => {
      tempFile = resolve('/tmp', `review-${Date.now()}.csv`);
      writeFileSync(tempFile, '', 'utf8');
      expect(() => parseReviewResults(tempFile)).toThrow('empty or missing header');
    });

    it('throws on missing status column', () => {
      tempFile = resolve('/tmp', `review-${Date.now()}.csv`);
      const csv = `"word_id","word","definition"
"word_1","apple","a fruit"`;
      writeFileSync(tempFile, csv, 'utf8');
      expect(() => parseReviewResults(tempFile)).toThrow('missing status column');
    });

    it('tracks failed words in issues', () => {
      tempFile = resolve('/tmp', `review-${Date.now()}.csv`);
      const csv = `"word_id","word","definition","example_sentence","pos","cefr_level","flagged","status"
"word_1","apple","a fruit","The _ is red.","noun","A1","no","fail"
"word_2","banana","another fruit","I ate a _.","noun","A1","no","fail"`;
      writeFileSync(tempFile, csv, 'utf8');

      const result = parseReviewResults(tempFile);
      expect(result.issues.length).toBe(2);
      expect(result.issues[0]?.word_id).toBe('word_1');
      expect(result.issues[1]?.word_id).toBe('word_2');
    });
  });
});
