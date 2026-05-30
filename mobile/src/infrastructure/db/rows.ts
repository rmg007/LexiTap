// Raw SQLite row shapes. These mirror the column types returned by expo-sqlite
// (INTEGER -> number, TEXT -> string, NULL -> null) BEFORE mapping to domain
// types. SQLite has no boolean: is_* columns are 0/1 integers. Keeping these
// explicit lets the mappers (mappers.ts) be pure, typed, and unit-testable
// without a native connection.

export interface WordRow {
  id: string;
  word: string;
  definition: string;
  tier_id: string;
  pos: string | null;
  cefr_level: string | null;
  grade_level: number | null;
  word_type: string | null;
  difficulty: number | null;
  theme: string | null;
  example_sentence: string;
  image_path: string | null;
  audio_path: string | null;
  synonyms: string | null; // JSON array string
  antonyms: string | null; // JSON array string
  usage_notes: string | null;
  created_at: number;
  deleted_at: number | null;
}

export interface ContentTierRow {
  id: string;
  name: string;
  description: string | null;
  is_free: number; // 0/1
  sku: string | null;
  word_count: number;
  display_order: number;
  is_active: number; // 0/1
}

export interface UserProgressRow {
  word_id: string;
  mastery_level: number;
  next_review_date: number;
  last_reviewed_at: number | null;
  consecutive_correct: number | null;
  total_attempts: number | null;
  total_correct: number | null;
  first_seen_at: number | null;
  scheduler_version: string;
}

export interface QuizAttemptRow {
  id: number;
  session_id: number;
  word_id: string;
  assessment_type: string;
  user_answer: string;
  correct_answer: string;
  is_correct: number; // 0/1
  answered_at: number;
  time_to_answer_ms: number | null;
  pre_mastery_level: number | null;
  scheduled_review_date: number | null;
  scheduler_version: string | null;
}

export interface UserStatsRow {
  id: number;
  current_streak: number;
  longest_streak: number;
  last_activity_local_date: number | null;
  total_sessions: number;
  total_words_mastered: number;
  freeze_count: number;
  freezes_granted_total: number;
  last_catchup_anchor_date: number | null;
  onboarding_state: string | null; // JSON blob
}

export interface NotificationScheduleRow {
  id: number;
  next_notify_at: number;
  type: string;
  delivered_at: number | null;
  quiet_hours_start: number | null;
  quiet_hours_end: number | null;
}

export interface SchemaVersionRow {
  version: number;
  applied_at: number;
}
