import type {
  Services,
  DailyProgressMetrics,
  WordDetail,
} from '@/presentation/services/ServicesContext';
import type { AnswerQuestionOutput } from '@/application/quiz/AnswerQuestionUseCase';
import type {
  QuizSession,
  UserStats,
  OnboardingState,
  SavedWordListItem,
  ActiveSession,
  KnowledgeMapSegments,
} from '@/domain/index';
import type {
  AdaptiveDiagnosticPool,
  SeedAdaptiveDiagnosticInput,
} from '@/application/onboarding/RunAdaptiveDiagnosticUseCase';
import { NoopAnalyticsService } from '@/infrastructure/analytics/NoopAnalyticsService';
import { StubAuthService } from '@/infrastructure/auth/StubAuthService';
import { CheckTierAccessUseCase } from '@/application/tier/CheckTierAccessUseCase';
import type { IapPort } from '@/domain/iap/IapPort';

// Typed mock factory for tests / Storybook. The real use-case classes hold
// private repository fields, so we build structurally-shaped stubs and assert
// them to the Services type via `unknown`. Override any slice via `overrides`.
//
// This is presentation-test scaffolding only; the production Services value is
// built at the composition root.

export interface MockServiceHandlers {
  startQuiz?: (...args: never[]) => Promise<QuizSession>;
  answerQuestion?: (...args: never[]) => Promise<AnswerQuestionOutput>;
  saveOnboardingProfile?: (state: OnboardingState) => Promise<void>;
  adaptiveLoadPool?: () => Promise<AdaptiveDiagnosticPool>;
  adaptiveSeed?: (input: SeedAdaptiveDiagnosticInput) => Promise<void>;
  getUserStats?: () => Promise<UserStats | null>;
  getTierKnowledgeMap?: () => Promise<KnowledgeMapSegments>;
  getDailyProgress?: () => Promise<DailyProgressMetrics>;
  getContentDbHealth?: () => Promise<{ wordCount: number; dbVersion: number }>;
  getWordDetail?: (...args: never[]) => Promise<WordDetail | null>;
  isWordSaved?: (...args: never[]) => Promise<boolean>;
  getSavedWordCount?: () => Promise<number>;
  listSavedWordsPage?: (...args: never[]) => Promise<readonly SavedWordListItem[]>;
  saveWord?: (...args: never[]) => Promise<void>;
  unsaveWord?: (...args: never[]) => Promise<void>;
  getActiveSession?: () => Promise<ActiveSession | null>;
  saveActiveSession?: (...args: never[]) => Promise<void>;
  clearActiveSession?: () => Promise<void>;
  backupTriggerIfNeeded?: (nowMs: number) => Promise<void>;
  backupForceRestore?: () => Promise<'ok' | 'no_backup' | 'error'>;
  exportUserData?: () => Promise<string>;
}

const notImplemented =
  (name: string) =>
  (): never => {
    throw new Error(`mockServices: ${name} was called but not provided`);
  };

const noopIap: IapPort = {
  getProducts: async () => [],
  purchase: async () => ({ sku: '', status: 'cancelled' }),
  restorePurchases: async () => [],
  validateReceipt: async () => ({ isValid: false, entitledSkus: [] }),
  getActiveEntitlements: async () => [],
  logIn: async () => true,
  logOut: async () => true,
};

export function createMockServices(handlers: MockServiceHandlers = {}): Services {
  const services = {
    startQuiz: { execute: handlers.startQuiz ?? notImplemented('startQuiz') },
    answerQuestion: { execute: handlers.answerQuestion ?? notImplemented('answerQuestion') },
    saveOnboardingProfile: {
      execute: handlers.saveOnboardingProfile ?? (async () => undefined),
    },
    runAdaptiveDiagnostic: {
      loadPool:
        handlers.adaptiveLoadPool ??
        (async () => ({ pool: [], pseudoWords: [], freePoolSize: 0 })),
      seed: handlers.adaptiveSeed ?? (async () => undefined),
    },
    analytics: new NoopAnalyticsService(),
    auth: new StubAuthService(),
    session: {
      start: async () => undefined,
      end: async () => undefined,
    },
    backup: {
      triggerIfNeeded: handlers.backupTriggerIfNeeded ?? (async () => undefined),
      forceRestore: handlers.backupForceRestore ?? (async () => 'ok' as const),
    },
    iap: noopIap,
    checkTierAccess: new CheckTierAccessUseCase(noopIap),
    exportUserData: {
      execute: handlers.exportUserData ?? (async () => JSON.stringify({ version: 1, stats: null, progress: [], exportedAt: new Date().toISOString() })),
    },
    clearUserData: async () => undefined,
    queries: {
      getUserStats: handlers.getUserStats ?? (async () => null),
      getTierKnowledgeMap:
        handlers.getTierKnowledgeMap ?? (async () => ({ known: 0, learning: 0, new: 0, total: 0 })),
      getDailyProgress: handlers.getDailyProgress ?? (async () => ({
        reviewsCompletedToday: 0,
        effectiveDailyCap: 40,
        newWordsCompletedToday: 0,
        newWordsBudget: 10,
      })),
      getContentDbHealth: handlers.getContentDbHealth ?? (async () => ({ wordCount: 0, dbVersion: 0 })),
      getWordDetail: handlers.getWordDetail ?? (async () => null),
      isWordSaved: handlers.isWordSaved ?? (async () => false),
      getSavedWordCount: handlers.getSavedWordCount ?? (async () => 0),
      listSavedWordsPage: handlers.listSavedWordsPage ?? (async () => []),
      saveWord: handlers.saveWord ?? (async () => undefined),
      unsaveWord: handlers.unsaveWord ?? (async () => undefined),
      getActiveSession: handlers.getActiveSession ?? (async () => null),
      saveActiveSession: handlers.saveActiveSession ?? (async () => undefined),
      clearActiveSession: handlers.clearActiveSession ?? (async () => undefined),
    },
  };
  return services as unknown as Services;
}
