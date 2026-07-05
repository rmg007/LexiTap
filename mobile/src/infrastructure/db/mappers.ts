import type {
  Word,
  ContentTier,
  WordType,
  CefrLevel,
  WordSense,
} from '@/domain/vocabulary/Word';
import type { PseudoWord } from '@/domain/onboarding/PseudoWord';
import { asWordId, asTierId } from '@/domain/vocabulary/ids';
import type { UserProgress, MasteryLevel } from '@/domain/user/UserProgress';
import type { QuizAttempt, AssessmentType } from '@/domain/quiz/types';
import { asSessionId } from '@/domain/vocabulary/ids';
import type { UserStats } from '@/domain/user/UserStats';
import type { SavedWord, SavedWordListItem, SavedWordSource } from '@/domain/user/SavedWord';
import type { ActiveSession, ActiveSessionStage } from '@/domain/user/ActiveSession';
import type { OnboardingState, LearningGoal, ProficiencyBand } from '@/domain/onboarding/OnboardingState';
import type { StreakState } from '@/domain/gamification/streak';
import type {
  WordRow,
  ContentTierRow,
  UserProgressRow,
  QuizAttemptRow,
  UserStatsRow,
  SavedWordRow,
  SavedWordListRow,
  ActiveSessionRow,
  PseudoWordRow,
  SenseWithExampleRow,
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
    // The category the word was loaded under (word↔category is many-to-many;
    // the query projects the browsed membership as row.tier_id).
    tierId: asTierId(row.tier_id),
    pos: row.pos ?? undefined,
    cefrLevel: toCefrLevel(row.cefr_level),
    wordType: toWordType(row.word_type),
    difficulty: row.difficulty ?? undefined,
    frequencyRank: row.frequency_rank ?? undefined,
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

// Group the flat sense⋈example join (one row per example, or one null-example
// row for an exampleless sense) into WordSense[]. Relies on the query's
// ORDER BY sense_index, example_index — rows of one sense arrive contiguously.
// Pure: no I/O, fully testable. Empty input → [] (the detail screen then falls
// back to the flat definition).
export function mapSenseRows(rows: SenseWithExampleRow[]): WordSense[] {
  const senses: WordSense[] = [];
  const bySenseId = new Map<string, WordSense>();
  for (const row of rows) {
    let sense = bySenseId.get(row.id);
    if (sense === undefined) {
      sense = {
        senseIndex: row.sense_index,
        pos: row.pos ?? undefined,
        shortGloss: row.short_gloss,
        explanation: row.explanation,
        imagePath: row.image_path ?? undefined,
        examples: [],
      };
      bySenseId.set(row.id, sense);
      senses.push(sense);
    }
    // LEFT JOIN: a sense with no examples yields a single null-example row.
    if (row.example_text !== null && row.example_index !== null) {
      sense.examples.push({ exampleIndex: row.example_index, text: row.example_text });
    }
  }
  return senses;
}

export function mapPseudoWordRow(row: PseudoWordRow): PseudoWord {
  return {
    id: row.id,
    word: row.word,
    phonemeSimilarityScore: row.phoneme_similarity_score ?? undefined,
  };
}

export function mapContentTierRow(row: ContentTierRow): ContentTier {
  return {
    id: asTierId(row.id),
    name: row.name,
    description: row.description ?? undefined,
    isFree: row.is_free === 1,
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
    // Narrow the TEXT column back to the literal type; any non-'easy'/null value
    // (corrupt row) maps to undefined — defensive, mirrors toAssessmentType.
    userEase: row.user_ease === 'easy' ? 'easy' : undefined,
  };
}

const SAVED_WORD_SOURCES: ReadonlySet<string> = new Set([
  'manual',
  'learn',
  'quiz',
  'browser',
]);

function toSavedWordSource(raw: string): SavedWordSource {
  // Descriptive only; an unknown stored value defaults to 'manual' rather than
  // throwing while rendering the saved list.
  return SAVED_WORD_SOURCES.has(raw) ? (raw as SavedWordSource) : 'manual';
}

export function mapSavedWordRow(row: SavedWordRow): SavedWord {
  return {
    wordId: asWordId(row.word_id),
    savedAt: row.saved_at,
    source: toSavedWordSource(row.source),
  };
}

export function mapSavedWordListRow(row: SavedWordListRow): SavedWordListItem {
  return {
    word: mapWordRow(row),
    savedAt: row.saved_at,
    masteryLevel: toMasteryLevel(row.mastery_level),
  };
}

const ACTIVE_SESSION_STAGES: ReadonlySet<string> = new Set(['card', 'check']);

// Map the active_session row → domain snapshot. The batch + stage + index live
// in the JSON `payload`; parse defensively (corrupt blob → null so Home simply
// shows no resume card rather than crashing). Mirrors parseOnboardingState.
export function mapActiveSessionRow(row: ActiveSessionRow): ActiveSession | null {
  if (row.kind !== 'learn') return null;
  try {
    const parsed: unknown = JSON.parse(row.payload);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const obj = parsed as Record<string, unknown>;
    const batch = obj['batch'];
    const stageRaw = obj['stage'];
    const index = obj['index'];
    if (!Array.isArray(batch)) return null;
    if (typeof stageRaw !== 'string' || !ACTIVE_SESSION_STAGES.has(stageRaw)) return null;
    if (typeof index !== 'number' || !Number.isFinite(index)) return null;
    return {
      kind: 'learn',
      tierId: row.tier_id,
      batch: batch as ActiveSession['batch'],
      stage: stageRaw as ActiveSessionStage,
      index,
    };
  } catch {
    return null;
  }
}


const LEARNING_GOALS: ReadonlySet<string> = new Set(['exam', 'general', 'professional', 'academic']);
const PROFICIENCY_BANDS: ReadonlySet<string> = new Set(['A2', 'B1', 'B2', 'C1', 'C2']);

// Parse the onboarding_state JSON blob defensively. Corrupt or missing data →
// undefined; never throws. A bad blob must not crash Home or any other consumer.
function parseOnboardingState(raw: string | null): OnboardingState | undefined {
  if (raw === null || raw.trim() === '') return undefined;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return undefined;
    const obj = parsed as Record<string, unknown>;
    const completedAt = typeof obj['completedAt'] === 'number' ? obj['completedAt'] : undefined;
    if (completedAt === undefined) return undefined; // required field missing
    const goal =
      typeof obj['goal'] === 'string' && LEARNING_GOALS.has(obj['goal'])
        ? (obj['goal'] as LearningGoal)
        : undefined;
    const band =
      typeof obj['band'] === 'string' && PROFICIENCY_BANDS.has(obj['band'])
        ? (obj['band'] as ProficiencyBand)
        : undefined;
    const frontierRank =
      typeof obj['frontierRank'] === 'number' ? obj['frontierRank'] : undefined;
    return { completedAt, goal, band, frontierRank };
  } catch {
    return undefined;
  }
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
    onboardingState: parseOnboardingState(row.onboarding_state),
  };
}
