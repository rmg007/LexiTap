import { openDatabase, type DatabaseHandle } from '@/infrastructure/db';
import {
  SQLiteWordRepository,
  SQLiteContentTierRepository,
  SQLiteUserProgressRepository,
  SQLiteQuizSessionRepository,
  SQLiteEntitlementRepository,
  SQLiteUserStatsRepository,
  SQLiteAnswerWriter,
} from '@/infrastructure/db';
import { AsyncStorageAdapter } from '@/infrastructure/storage';
import { createSupabaseClient } from '@/infrastructure/sync/supabaseClient';
import { SupabaseSyncService } from '@/infrastructure/sync/SupabaseSyncService';
import { StubIapService } from '@/infrastructure/iap/StubIapService';

import { v1FixedScheduler } from '@/domain/srs/v1-fixed';
import type { TierId } from '@/domain/vocabulary/ids';

import { StartQuizUseCase } from '@/application/quiz/StartQuizUseCase';
import { AnswerQuestionUseCase } from '@/application/quiz/AnswerQuestionUseCase';
import { CheckAccessUseCase } from '@/application/tier/CheckAccessUseCase';
import { UnlockTierUseCase } from '@/application/tier/UnlockTierUseCase';
import { SyncProgressUseCase } from '@/application/user/SyncProgressUseCase';
import type { SyncService } from '@/application/user/SyncService';
import { RunDiagnosticUseCase } from '@/application/onboarding/RunDiagnosticUseCase';

import { tierConfigProvider } from '@/config/tierConfigProvider';
import type { Services, ReadQueries } from '@/presentation/services';
import { logger } from '@/lib/logger';

// Composition root. The single place the layers are wired together: open the
// database, construct the SQLite repositories, bind them to the application use
// cases, and expose the result as the presentation-facing `Services` object.
// This file sits outside every hexagonal layer on purpose so it may import all
// of them (the layer-boundary ESLint rules only constrain src/{domain,
// application,infrastructure,presentation}).

// Sync is optional: with no Supabase credentials (dev, offline-first) we bind a
// no-op so the quiz path still works. Real failures during sync are already
// swallowed by SyncProgressUseCase.
const noopSync: SyncService = {
  async pull(): Promise<void> {},
  async push(): Promise<void> {},
};

function buildSyncService(db: DatabaseHandle, storage: AsyncStorageAdapter): SyncService {
  try {
    const client = createSupabaseClient();
    return new SupabaseSyncService(client, db, storage);
  } catch (error) {
    logger.warn('Supabase sync disabled (no credentials); running offline-only', {
      error: String(error),
    });
    return noopSync;
  }
}

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
  const entitlements = new SQLiteEntitlementRepository(db);
  const stats = new SQLiteUserStatsRepository(db);

  // Bound but not yet surfaced through Services; the paywall consumes it once
  // a real store SDK replaces the stub.
  void new StubIapService();
  void tiers;

  const sync = buildSyncService(db, storage);

  const services: Services = {
    startQuiz: new StartQuizUseCase(words, progress, sessions),
    answerQuestion: new AnswerQuestionUseCase(answerWriter, progress, v1FixedScheduler),
    checkAccess: new CheckAccessUseCase(entitlements, tierConfigProvider),
    unlockTier: new UnlockTierUseCase(entitlements, tierConfigProvider),
    syncProgress: new SyncProgressUseCase(sync),
    runDiagnostic: new RunDiagnosticUseCase(words, progress, v1FixedScheduler),
    onboarding: {
      isComplete: () => storage.isOnboardingComplete(),
      markComplete: () => storage.setOnboardingComplete(),
    },
    queries: buildReadQueries(words, progress, stats),
  };

  return { services, db, storage };
}
