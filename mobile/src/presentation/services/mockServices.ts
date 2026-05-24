import type { Services } from '@/presentation/services/ServicesContext';
import type { AnswerQuestionOutput } from '@/application/quiz/AnswerQuestionUseCase';
import type { QuizSession, TierAccess, UserStats } from '@/domain/index';

// Typed mock factory for tests / Storybook. The real use-case classes hold
// private repository fields, so we build structurally-shaped stubs and assert
// them to the Services type via `unknown`. Override any slice via `overrides`.
//
// This is presentation-test scaffolding only; the production Services value is
// built at the composition root.

export interface MockServiceHandlers {
  startQuiz?: (...args: never[]) => Promise<QuizSession>;
  answerQuestion?: (...args: never[]) => Promise<AnswerQuestionOutput>;
  checkAccess?: (...args: never[]) => Promise<TierAccess>;
  unlockTier?: (...args: never[]) => Promise<TierAccess>;
  getUserStats?: () => Promise<UserStats | null>;
  getMasteryLevels?: () => Promise<readonly number[]>;
}

const notImplemented =
  (name: string) =>
  (): never => {
    throw new Error(`mockServices: ${name} was called but not provided`);
  };

export function createMockServices(handlers: MockServiceHandlers = {}): Services {
  const services = {
    startQuiz: { execute: handlers.startQuiz ?? notImplemented('startQuiz') },
    answerQuestion: { execute: handlers.answerQuestion ?? notImplemented('answerQuestion') },
    checkAccess: { execute: handlers.checkAccess ?? notImplemented('checkAccess') },
    unlockTier: { execute: handlers.unlockTier ?? notImplemented('unlockTier') },
    syncProgress: {
      execute: async () => ({ pulled: true, pushed: true, errors: [] }),
    },
    queries: {
      getUserStats: handlers.getUserStats ?? (async () => null),
      getMasteryLevels: handlers.getMasteryLevels ?? (async () => []),
    },
  };
  return services as unknown as Services;
}
