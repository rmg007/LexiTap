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
  theme?: string;
  exampleSentence: string; // contains exactly one "_" blank
  imagePath?: string;
  audioPath?: string;
  synonyms: string[];
  antonyms: string[];
  usageNotes?: string;
  isDeleted: boolean; // derived from deleted_at !== null
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
