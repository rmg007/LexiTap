import React, { createContext, useContext, type ReactNode } from 'react';
import type { StartQuizUseCase } from '@/application/quiz/StartQuizUseCase';
import type { AnswerQuestionUseCase } from '@/application/quiz/AnswerQuestionUseCase';
import type { RunDiagnosticUseCase } from '@/application/onboarding/RunDiagnosticUseCase';
import type { RunAdaptiveDiagnosticUseCase } from '@/application/onboarding/RunAdaptiveDiagnosticUseCase';
import type { SaveOnboardingProfileUseCase } from '@/application/onboarding/SaveOnboardingProfileUseCase';
import type { UserDataExportUseCase } from '@/domain/export/UserDataExportUseCase';
import type { AnalyticsPort } from '@/domain/analytics/AnalyticsPort';
import type { AuthPort } from '@/domain/auth/AuthPort';
import type { IapPort } from '@/domain/iap/IapPort';
import type { CheckTierAccessUseCase } from '@/application/tier/CheckTierAccessUseCase';
import type { TierId, WordId } from '@/domain/index';
import type { UserStats, SavedWordListItem, SavedWordSource, ActiveSession } from '@/domain/index';
import type { Word, WordSense } from '@/domain/vocabulary/Word';

// The Services context is the ONLY way the presentation layer reaches the
// application layer. It imports TYPES ONLY from @/application and @/domain; the
// concrete value (use-case instances bound to infrastructure adapters) is
// constructed at the composition root and injected at integration time. ESLint
// bans presentation from importing infrastructure concretes, so this seam keeps
// the boundary clean.

// Read accessors the screens need that are not themselves use cases. These are
// modelled as plain async method signatures so the integration owner can back
// them with whatever read repository / query they like (offline-first: a read
// failure should resolve, not block the quiz path).
export interface DailyProgressMetrics {
  reviewsCompletedToday: number;
  effectiveDailyCap: number;
  newWordsCompletedToday: number;
  newWordsBudget: number;
}

export interface ContentDbHealth {
  wordCount: number;
  dbVersion: number;
}

// Word + its rich-detail senses for the detail screen. `senses` is empty for
// un-backfilled words or a content DB predating the rich-detail schema — the
// screen then falls back to word.definition / word.exampleSentence.
export interface WordDetail {
  word: Word;
  senses: WordSense[];
}

export interface ReadQueries {
  // Aggregate stats for Home / Progress (streak, totals, mastered count).
  getUserStats(): Promise<UserStats | null>;
  // Per-tier mastery levels for the Progress dashboard rings/bars.
  getMasteryLevels(tierId: TierId): Promise<readonly number[]>;
  // Daily progress: reviews completed vs cap, new words learned vs budget.
  getDailyProgress(tierId: TierId): Promise<DailyProgressMetrics>;
  // Content DB health: word count + schema version (for device verification).
  getContentDbHealth(): Promise<ContentDbHealth>;
  // Word + rich-detail senses for the detail screen. Null if the word doesn't
  // resolve; senses [] if the word has no rich data (flat-definition fallback).
  getWordDetail(id: WordId): Promise<WordDetail | null>;
  // Saved words (WORD_FEEDBACK_PLAN §2). All fail-soft (resolve, never block).
  isWordSaved(id: WordId): Promise<boolean>;
  getSavedWordCount(): Promise<number>;
  listSavedWordsPage(
    afterSavedAt: number | null,
    afterWordId: string | null,
    limit: number,
  ): Promise<readonly SavedWordListItem[]>;
  saveWord(id: WordId, source: SavedWordSource): Promise<void>;
  unsaveWord(id: WordId): Promise<void>;
  // In-flight learn-session resume snapshot (SESSION_RESUME_PLAN Part B).
  getActiveSession(): Promise<ActiveSession | null>;
  saveActiveSession(session: ActiveSession): Promise<void>;
  clearActiveSession(): Promise<void>;
}

export interface Services {
  // Quiz flow.
  readonly startQuiz: StartQuizUseCase;
  readonly answerQuestion: AnswerQuestionUseCase;
  // First-run onboarding diagnostic — DIAG-B stride sampler (legacy; retained for
  // its tests and as a fallback). The onboarding route now uses DIAG-A below.
  readonly runDiagnostic: RunDiagnosticUseCase;
  // DIAG-A adaptive band-walk diagnostic (loads word + pseudo-word pools, seeds
  // frontier-based initial mastery). Replaces runDiagnostic in the onboarding UI.
  readonly runAdaptiveDiagnostic: RunAdaptiveDiagnosticUseCase;
  // Persists goal / band / frontier rank after the onboarding flow completes.
  readonly saveOnboardingProfile: SaveOnboardingProfileUseCase;
  // Analytics port for screen-level events (lesson_started, quiz_submitted, etc).
  readonly analytics: AnalyticsPort;
  // Auth port — sign-in, sign-out, delete account.
  readonly auth: AuthPort;
  // First-run gate flag, backed by device storage (not learning data).
  readonly onboarding: {
    isComplete(): Promise<boolean>;
    markComplete(): Promise<void>;
  };
  // Read queries for dashboards.
  readonly queries: ReadQueries;
  // Session lifecycle — fired by useSessionLifecycle on AppState changes.
  readonly session: {
    start(): Promise<void>;
    end(): Promise<void>;
  };
  // Backup: periodic upload (6h throttle) + manual restore from Settings.
  readonly backup: {
    // Fire-and-forget. Called on session.start() and after quiz completion.
    triggerIfNeeded(nowMs: number): Promise<void>;
    // Manual restore from Settings. Returns discriminated outcome, never throws.
    forceRestore(): Promise<'ok' | 'no_backup' | 'error'>;
  };
  // IAP port — purchase exam packs, restore purchases, check entitlements.
  readonly iap: IapPort;
  // Checks whether the current user has access to a content tier.
  readonly checkTierAccess: CheckTierAccessUseCase;
  // Data export — Apple Guideline 5.1.1(v). Serializes all local learning data
  // to a JSON string for the native Share Sheet.
  readonly exportUserData: UserDataExportUseCase;
  // Wipe all user data from SQLite + AsyncStorage — called on account deletion.
  clearUserData(): Promise<void>;
}

const ServicesContext = createContext<Services | null>(null);

interface ServicesProviderProps {
  value: Services;
  children: ReactNode;
}

export function ServicesProvider({
  value,
  children,
}: ServicesProviderProps): React.JSX.Element {
  return <ServicesContext.Provider value={value}>{children}</ServicesContext.Provider>;
}

/** Access the injected services. Throws if used outside a ServicesProvider. */
export function useServices(): Services {
  const ctx = useContext(ServicesContext);
  if (ctx === null) {
    throw new Error('useServices must be used within a ServicesProvider');
  }
  return ctx;
}
