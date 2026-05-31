import { describe, it, expect } from 'vitest';

/**
 * Tests for QA sampling logic.
 * Validates definition/example checkers and sampling logic.
 */

// Extracted validation functions for testing
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
  const complexWords = def
    .split(/\s+/)
    .filter((w) => w.length > 12 && !['characterization', 'unfortunately'].includes(w));
  if (complexWords.length > 1) {
    failures.push(`D2: Complex vocabulary detected: ${complexWords.slice(0, 2).join(', ')}`);
  }

  return { pass: failures.length === 0, failures };
}

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

  // E3: Length check
  const wordCount = example.replace(/_/, 'word').split(/\s+/).length;
  if (wordCount < 5 || wordCount > 25) {
    failures.push(`E3: Unusual length (${wordCount} words; typical: 8–20)`);
  }

  return { pass: failures.length === 0, failures };
}

describe('QA Validation', () => {
  describe('Definition validation', () => {
    it('passes good A2-level definitions', () => {
      const def = 'A feeling of pleasure or contentment.';
      const result = validateDefinition(def);
      expect(result.pass).toBe(true);
      expect(result.failures).toHaveLength(0);
    });

    it('fails definitions with >2 sentences', () => {
      const def = 'A feeling. Of pleasure. Or contentment.';
      const result = validateDefinition(def);
      expect(result.pass).toBe(false);
      expect(result.failures).toContain('D1: More than 2 sentences');
    });

    it('fails definitions with >60 words', () => {
      const longDef =
        'A very complex state of mind characterized by multiple feelings of joy, satisfaction, and contentment ' +
        'that arise from numerous positive experiences, achievements, accomplishments, or social connections and relationships. ' +
        'This emotional state is often accompanied by smiling, laughter, and a general sense of well-being and happiness ' +
        'that results from joy and the experience of life with others and family and friends around us.';
      const result = validateDefinition(longDef);
      expect(result.pass).toBe(false);
      expect(result.failures.some((f) => f.startsWith('D1'))).toBe(true);
    });

    it('detects overly complex vocabulary (D2)', () => {
      const def =
        'The characteristic phenomenon of demonstrating psychological manifestations of contentment.';
      const result = validateDefinition(def);
      expect(result.pass).toBe(false);
      expect(result.failures.some((f) => f.startsWith('D2'))).toBe(true);
    });
  });

  describe('Example validation', () => {
    it('passes good examples with 1 blank', () => {
      const ex = 'She was _ about the good news.';
      const result = validateExample(ex);
      expect(result.pass).toBe(true);
      expect(result.failures).toHaveLength(0);
    });

    it('fails examples with 0 blanks', () => {
      const ex = 'She was very happy about the good news.';
      const result = validateExample(ex);
      expect(result.pass).toBe(false);
      expect(result.failures.some((f) => f.startsWith('E1'))).toBe(true);
    });

    it('fails examples with >1 blank', () => {
      const ex = 'She was _ about the _ news.';
      const result = validateExample(ex);
      expect(result.pass).toBe(false);
      expect(result.failures.some((f) => f.startsWith('E1'))).toBe(true);
    });

    it('fails examples with blank at start', () => {
      const ex = '_ was happy about the news.';
      const result = validateExample(ex);
      expect(result.pass).toBe(false);
      expect(result.failures.some((f) => f.startsWith('E2'))).toBe(true);
    });

    it('fails examples with blank at end', () => {
      const ex = 'She was happy about _';
      const result = validateExample(ex);
      expect(result.pass).toBe(false);
      expect(result.failures.some((f) => f.startsWith('E2'))).toBe(true);
    });

    it('fails examples that are too short', () => {
      const ex = 'She _ today.';
      const result = validateExample(ex);
      expect(result.pass).toBe(false);
      expect(result.failures.some((f) => f.startsWith('E3'))).toBe(true);
    });

    it('fails examples that are too long', () => {
      const words = Array(30)
        .fill('word')
        .join(' ');
      const ex = `${words} _ ${words}`;
      const result = validateExample(ex);
      expect(result.pass).toBe(false);
      expect(result.failures.some((f) => f.startsWith('E3'))).toBe(true);
    });
  });

  describe('Sampling', () => {
    it('creates a seeded RNG for reproducibility', () => {
      // Create two samples with the same seed
      const seed = 42;
      const items = Array.from({ length: 100 }, (_, i) => i);

      // Simple Fisher-Yates with seeded RNG
      const createSeededRng = (s: number) => {
        let state = s;
        return () => {
          state = (state * 1103515245 + 12345) & 0x7fffffff;
          return state / 0x7fffffff;
        };
      };

      const rng1 = createSeededRng(seed);
      const sample1 = [...items].sort(() => rng1() - 0.5).slice(0, 10);

      const rng2 = createSeededRng(seed);
      const sample2 = [...items].sort(() => rng2() - 0.5).slice(0, 10);

      expect(sample1).toEqual(sample2);
    });
  });
});
