import type { TierId, WordId } from '@/domain/vocabulary/ids';

// Vocabulary value objects. Shapes mirror DATA_MODELS.md; the infrastructure
// layer maps DB rows to these so the domain never sees raw JSON or DB
// nullability quirks.

export type WordType = 'vocabulary' | 'expression' | 'idiom' | 'phrasal_verb';
export type CefrLevel = 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export interface Word {
  id: WordId;
  word: string; // multi-word for idioms, e.g. "look up to"
  definition: string;
  tierId: TierId;
  pos?: string;
  cefrLevel?: CefrLevel;
  wordType: WordType;
  difficulty?: number; // 1-5
  frequencyRank?: number; // DIAG-A band-walk target; absent for words imported before PA-1
  theme?: string;
  exampleSentence: string; // contains exactly one "_" blank
  imagePath?: string;
  audioPath?: string;
  synonyms: string[];
  antonyms: string[];
  usageNotes?: string;
  isDeleted: boolean; // derived from deleted_at !== null
  // Rich detail layer (additive). Loaded lazily for the detail screen only —
  // absent on list/quiz reads and on un-backfilled words. Absence (or []) means
  // the detail screen falls back to the flat definition/exampleSentence above,
  // so old data and the quiz keep working untouched.
  senses?: WordSense[];
}

// One distinct meaning of a word. The FELT teaching layer the detail screen
// renders (numbered when a word has >1). `examples` are full natural sentences
// with NO "_" blank — the cloze lives only in Word.exampleSentence.
export interface WordSense {
  senseIndex: number; // 0-based; 0 = primary/most-common meaning
  pos?: string; // per-sense PoS (a word's senses can differ)
  shortGloss: string; // dictionary one-liner
  explanation: string; // the felt teaching text
  imagePath?: string; // optional, per sense
  examples: SenseExample[];
}

export interface SenseExample {
  exampleIndex: number; // 0-based ordering
  text: string; // natural full sentence, no blank
}

export interface ContentTier {
  id: TierId;
  name: string;
  description?: string;
  isFree: boolean;
  sku: string | null; // IAP product id
  wordCount: number;
  displayOrder: number;
  isActive: boolean;
}
