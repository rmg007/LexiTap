import { openDatabase, type DatabaseHandle } from '@/infrastructure/db';
import {
  SQLiteWordRepository,
  SQLiteContentTierRepository,
  SQLiteUserProgressRepository,
  SQLiteQuizSessionRepository,
  SQLiteUserStatsRepository,
  SQLiteAnswerWriter,
} from '@/infrastructure/db';
import { AsyncStorageAdapter } from '@/infrastructure/storage';
import { StubIapService } from '@/infrastructure/iap/StubIapService';

import { v1FixedScheduler } from '@/domain/srs/v1-fixed';
import type { TierId } from '@/domain/vocabulary/ids';

import { StartQuizUseCase } from '@/application/quiz/StartQuizUseCase';
import { AnswerQuestionUseCase } from '@/application/quiz/AnswerQuestionUseCase';
import { RunDiagnosticUseCase } from '@/application/onboarding/RunDiagnosticUseCase';
import { SaveOnboardingProfileUseCase } from '@/application/onboarding/SaveOnboardingProfileUseCase';

import type { Services, ReadQueries } from '@/presentation/services';
import { logger } from '@/lib/logger';

// Composition root. The single place the layers are wired together: open the
// database, construct the SQLite repositories, bind them to the application use
// cases, and expose the result as the presentation-facing `Services` object.
// This file sits outside every hexagonal layer on purpose so it may import all
// of them (the layer-boundary ESLint rules only constrain src/{domain,
// application,infrastructure,presentation}).

function buildReadQueries(
  words: SQLiteWordRepository,
  progress: SQLiteUserProgressRepository,
  stats: SQLiteUserStatsRepository,
): ReadQueries {
  return {
    async getUserStats() {
      try {
        return await stats.get();
      } catch (error) {
        logger.warn('getUserStats failed; returning null', { error: String(error) });
        return null;
      }
    },
    async getMasteryLevels(tierId: TierId) {
      try {
        const tierWords = await words.getWordsByTier(tierId);
        const levels = await Promise.all(
          tierWords.map(async (w) => {
            const p = await progress.get(w.id);
            return p?.masteryLevel ?? 0;
          }),
        );
        return levels;
      } catch (error) {
        logger.warn('getMasteryLevels failed; returning empty', { error: String(error) });
        return [];
      }
    },
  };
}

export interface Container {
  services: Services;
  db: DatabaseHandle;
  storage: AsyncStorageAdapter;
}

export async function createContainer(): Promise<Container> {
  const db = await openDatabase();
  const storage = new AsyncStorageAdapter();

  const words = new SQLiteWordRepository(db);
  const tiers = new SQLiteContentTierRepository(db);
  const progress = new SQLiteUserProgressRepository(db);
  const sessions = new SQLiteQuizSessionRepository(db);
  const answerWriter = new SQLiteAnswerWriter(db);
  const stats = new SQLiteUserStatsRepository(db);

  // Stub IAP: no store SDK wired yet (Phase 3). Bound but not yet surfaced
  // through Services; the paywall consumes it once RevenueCat replaces the stub.
  void new StubIapService();
  void tiers;

  const services: Services = {
    startQuiz: new StartQuizUseCase(words, progress, sessions),
    answerQuestion: new AnswerQuestionUseCase(answerWriter, progress, v1FixedScheduler),
    runDiagnostic: new RunDiagnosticUseCase(words, progress, v1FixedScheduler),
    saveOnboardingProfile: new SaveOnboardingProfileUseCase(stats),
    onboarding: {
      isComplete: () => storage.isOnboardingComplete(),
      markComplete: () => storage.setOnboardingComplete(),
    },
    queries: buildReadQueries(words, progress, stats),
  };

  return { services, db, storage };
}
