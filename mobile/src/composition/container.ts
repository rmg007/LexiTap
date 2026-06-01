import { openDatabase, type DatabaseHandle } from '@/infrastructure/db';
import {
  SQLiteWordRepository,
  SQLiteContentTierRepository,
  SQLiteUserProgressRepository,
  SQLiteQuizSessionRepository,
  SQLiteUserStatsRepository,
  SQLiteAnswerWriter,
} from '@/infrastructure/db';
import { buildDailyProgressQueries } from '@/infrastructure/db/queries/dailyProgressQueries';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AsyncStorageAdapter } from '@/infrastructure/storage';
import { StubIapService } from '@/infrastructure/iap/StubIapService';
import { createAnalyticsService } from '@/infrastructure/analytics/createAnalyticsService';
import { getOrCreateAnonId } from '@/infrastructure/analytics/AnonIdStore';
import { createAuthService } from '@/infrastructure/auth/createAuthService';

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
  db: DatabaseHandle,
  words: SQLiteWordRepository,
  progress: SQLiteUserProgressRepository,
  stats: SQLiteUserStatsRepository,
): ReadQueries {
  const dailyProgressQueries = buildDailyProgressQueries(db);

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
    async getDailyProgress(tierId: TierId) {
      try {
        const nowMs = Date.now();
        const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        return await dailyProgressQueries.getDailyProgress(tierId, nowMs, userTz);
      } catch (error) {
        logger.warn('getDailyProgress failed; returning zero-state', { error: String(error) });
        // Return zero-state on any error (including timezone issues)
        return {
          reviewsCompletedToday: 0,
          effectiveDailyCap: 40,
          newWordsCompletedToday: 0,
          newWordsBudget: 10,
        };
      }
    },
    async getContentDbHealth() {
      try {
        const countRow = await db.first<{ word_count: number }>(
          'SELECT COUNT(*) as word_count FROM contentdb.words',
          [],
        );
        const verRow = await db.first<{ user_version: number }>(
          'PRAGMA contentdb.user_version',
          [],
        );
        return { wordCount: countRow?.word_count ?? 0, dbVersion: verRow?.user_version ?? 0 };
      } catch (error) {
        logger.warn('getContentDbHealth failed', { error: String(error) });
        return { wordCount: 0, dbVersion: 0 };
      }
    },
  };
}

export interface Container {
  services: Services;
  db: DatabaseHandle;
  storage: AsyncStorageAdapter;
}

// All AsyncStorage keys owned by this app — mirrored from AsyncStorageAdapter
// KEYS constant. Used by clearUserData to wipe everything on account deletion.
const ASYNC_STORAGE_KEYS = [
  'lexitap.timezone',
  'lexitap.sync.cursor',
  'lexitap.forgiveness.config.version',
  'lexitap.onboarding.completed',
] as const;

export async function createContainer(): Promise<Container> {
  const db = await openDatabase();
  const storage = new AsyncStorageAdapter();

  const anonId = await getOrCreateAnonId();
  const analytics = createAnalyticsService(anonId);
  const auth = createAuthService();

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
    startQuiz: new StartQuizUseCase(words, progress, sessions, analytics),
    answerQuestion: new AnswerQuestionUseCase(answerWriter, progress, v1FixedScheduler, analytics),
    runDiagnostic: new RunDiagnosticUseCase(words, progress, v1FixedScheduler),
    saveOnboardingProfile: new SaveOnboardingProfileUseCase(stats),
    analytics,
    auth,
    onboarding: {
      isComplete: () => storage.isOnboardingComplete(),
      markComplete: () => storage.setOnboardingComplete(),
    },
    queries: buildReadQueries(db, words, progress, stats),
    async clearUserData() {
      await db.transaction(async (tx) => {
        await tx.run('DELETE FROM user_progress', []);
        await tx.run('DELETE FROM quiz_sessions', []);
        await tx.run('DELETE FROM quiz_attempts', []);
        await tx.run('DELETE FROM event_log', []);
        await tx.run('DELETE FROM user_stats', []);
        await tx.run('DELETE FROM notification_schedule', []);
      });
      await AsyncStorage.multiRemove([...ASYNC_STORAGE_KEYS]);
    },
  };

  return { services, db, storage };
}
