import React, { createContext, useContext, type ReactNode } from 'react';
import type { StartQuizUseCase } from '@/application/quiz/StartQuizUseCase';
import type { AnswerQuestionUseCase } from '@/application/quiz/AnswerQuestionUseCase';
import type { RunDiagnosticUseCase } from '@/application/onboarding/RunDiagnosticUseCase';
import type { SaveOnboardingProfileUseCase } from '@/application/onboarding/SaveOnboardingProfileUseCase';
import type { TierId } from '@/domain/index';
import type { UserStats } from '@/domain/index';

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

export interface ReadQueries {
  // Aggregate stats for Home / Progress (streak, totals, mastered count).
  getUserStats(): Promise<UserStats | null>;
  // Per-tier mastery levels for the Progress dashboard rings/bars.
  getMasteryLevels(tierId: TierId): Promise<readonly number[]>;
  // Daily progress: reviews completed vs cap, new words learned vs budget.
  getDailyProgress(tierId: TierId): Promise<DailyProgressMetrics>;
}

export interface Services {
  // Quiz flow.
  readonly startQuiz: StartQuizUseCase;
  readonly answerQuestion: AnswerQuestionUseCase;
  // First-run onboarding diagnostic (samples words, seeds initial mastery).
  readonly runDiagnostic: RunDiagnosticUseCase;
  // Persists goal / band / frontier rank after the onboarding flow completes.
  readonly saveOnboardingProfile: SaveOnboardingProfileUseCase;
  // First-run gate flag, backed by device storage (not learning data).
  readonly onboarding: {
    isComplete(): Promise<boolean>;
    markComplete(): Promise<void>;
  };
  // Read queries for dashboards.
  readonly queries: ReadQueries;
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
