import type { Word, ContentTier, WordType, CefrLevel } from '@/domain/vocabulary/Word';
import { asWordId, asTierId } from '@/domain/vocabulary/ids';
import type { UserProgress, MasteryLevel } from '@/domain/user/UserProgress';
import type { QuizAttempt, AssessmentType } from '@/domain/quiz/types';
import { asSessionId } from '@/domain/vocabulary/ids';
import type { Entitlement } from '@/domain/user/Entitlement';
import type { UserStats } from '@/domain/user/UserStats';
import type { StreakState } from '@/domain/gamification/streak';
import type {
  WordRow,
  ContentTierRow,
  UserProgressRow,
  QuizAttemptRow,
  EntitlementRow,
  UserStatsRow,
} from '@/infrastructure/db/rows';

// Pure row -> domain mappers. The ONLY place DB nullability quirks, 0/1
// integers, and JSON-string columns are normalized into clean domain types
// (DATA_MODELS.md: "the infrastructure layer maps DB rows to these so the
// domain never sees raw JSON or DB nullability quirks"). No I/O, fully testable.

const WORD_TYPES: ReadonlySet<string> = new Set([
  'vocabulary',
  'expression',
  'idiom',
  'phrasal_verb',
]);
const CEFR_LEVELS: ReadonlySet<string> = new Set(['A2', 'B1', 'B2', 'C1', 'C2']);

// Parse a JSON-array TEXT column into string[]. Tolerates NULL/empty/malformed
// by returning [] — a corrupt content row must not crash the learn flow.
function parseStringArray(raw: string | null): string[] {
  if (raw === null || raw.trim() === '') return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === 'string');
  } catch {
    return [];
  }
}

function toWordType(raw: string | null): WordType {
  return raw !== null && WORD_TYPES.has(raw) ? (raw as WordType) : 'vocabulary';
}

function toCefrLevel(raw: string | null): CefrLevel | undefined {
  return raw !== null && CEFR_LEVELS.has(raw) ? (raw as CefrLevel) : undefined;
}

// Clamp an arbitrary integer into the 0-5 MasteryLevel union. Defensive: a
// future scheduler or corrupt row must not produce an out-of-range level.
function toMasteryLevel(raw: number): MasteryLevel {
  const clamped = Math.max(0, Math.min(5, Math.trunc(raw)));
  return clamped as MasteryLevel;
}

export function mapWordRow(row: WordRow): Word {
  return {
    id: asWordId(row.id),
    word: row.word,
    definition: row.definition,
    tierId: asTierId(row.tier_id),
    pos: row.pos ?? undefined,
    cefrLevel: toCefrLevel(row.cefr_level),
    wordType: toWordType(row.word_type),
    difficulty: row.difficulty ?? undefined,
    theme: row.theme ?? undefined,
    exampleSentence: row.example_sentence,
    imagePath: row.image_path ?? undefined,
    audioPath: row.audio_path ?? undefined,
    synonyms: parseStringArray(row.synonyms),
    antonyms: parseStringArray(row.antonyms),
    usageNotes: row.usage_notes ?? undefined,
    isDeleted: row.deleted_at !== null,
  };
}

export function mapContentTierRow(row: ContentTierRow): ContentTier {
  return {
    id: asTierId(row.id),
    name: row.name,
    description: row.description ?? undefined,
    isFree: row.is_free === 1,
    priceUsd: row.price_usd,
    sku: row.sku,
    wordCount: row.word_count,
    displayOrder: row.display_order,
    isActive: row.is_active === 1,
  };
}

export function mapUserProgressRow(row: UserProgressRow): UserProgress {
  return {
    wordId: asWordId(row.word_id),
    masteryLevel: toMasteryLevel(row.mastery_level),
    nextReviewDate: row.next_review_date,
    lastReviewedAt: row.last_reviewed_at ?? undefined,
    consecutiveCorrect: row.consecutive_correct ?? 0,
    totalAttempts: row.total_attempts ?? 0,
    totalCorrect: row.total_correct ?? 0,
    firstSeenAt: row.first_seen_at ?? undefined,
    schedulerVersion: row.scheduler_version,
  };
}

const ASSESSMENT_TYPES: ReadonlySet<string> = new Set([
  'multiple_choice',
  'drag_drop',
  'image_match',
  'classification',
]);

function toAssessmentType(raw: string): AssessmentType {
  // Default to multiple_choice for an unknown stored value rather than throwing
  // while rendering history; the value is descriptive, not load-bearing.
  return ASSESSMENT_TYPES.has(raw) ? (raw as AssessmentType) : 'multiple_choice';
}

export function mapQuizAttemptRow(row: QuizAttemptRow): QuizAttempt {
  return {
    id: row.id,
    sessionId: asSessionId(row.session_id),
    wordId: asWordId(row.word_id),
    assessmentType: toAssessmentType(row.assessment_type),
    userAnswer: row.user_answer,
    correctAnswer: row.correct_answer,
    isCorrect: row.is_correct === 1,
    answeredAt: row.answered_at,
    timeToAnswerMs: row.time_to_answer_ms ?? undefined,
    preMasteryLevel:
      row.pre_mastery_level === null ? undefined : toMasteryLevel(row.pre_mastery_level),
    scheduledReviewDate: row.scheduled_review_date ?? undefined,
    schedulerVersion: row.scheduler_version ?? undefined,
  };
}

export function mapEntitlementRow(row: EntitlementRow): Entitlement {
  return {
    tierId: asTierId(row.tier_id),
    purchasedAt: row.purchased_at,
    expiresAt: row.expires_at,
    receiptToken: row.receipt_token ?? undefined,
  };
}

export function mapUserStatsRow(row: UserStatsRow): UserStats {
  const streak: StreakState = {
    currentStreak: row.current_streak,
    longestStreak: row.longest_streak,
    lastActivityLocalDate: row.last_activity_local_date,
    freezeCount: row.freeze_count,
    freezesGrantedTotal: row.freezes_granted_total,
  };
  return {
    streak,
    totalSessions: row.total_sessions,
    totalWordsMastered: row.total_words_mastered,
  };
}
