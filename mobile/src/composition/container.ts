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
import { createRevenueCatIapService } from '@/infrastructure/iap/RevenueCatIapService';
import { CheckTierAccessUseCase } from '@/application/tier/CheckTierAccessUseCase';
import { createAnalyticsService } from '@/infrastructure/analytics/createAnalyticsService';
import { getOrCreateAnonId, getCurrentSessionId } from '@/infrastructure/analytics/AnonIdStore';
import { setSentryTags } from '@/infrastructure/crash';
import { getOrSetInstallDate, daysSince } from '@/infrastructure/analytics/InstallDateStore';
import { SessionTracker } from '@/infrastructure/analytics/SessionTracker';
import { SessionStartedUseCase } from '@/application/analytics/SessionStartedUseCase';
import { SessionCompletedUseCase } from '@/application/analytics/SessionCompletedUseCase';
import { createAuthService } from '@/infrastructure/auth/createAuthService';
import { createBackupService } from '@/infrastructure/backup/createBackupService';
import { PerformBackupUseCase } from '@/application/backup/PerformBackupUseCase';
import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

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
  'lexitap.install_date',
  'lexitap.backup.lastBackupAtMs',
] as const;

export async function createContainer(): Promise<Container> {
  // Phase 1: DB-free setup. Auth + backup are constructed first so the BK2
  // hydration gate can run BEFORE openDatabase(). Migrations must run on any
  // restored schema — never on an empty DB that then gets clobbered.
  const storage = new AsyncStorageAdapter();
  const auth = createAuthService();
  const backupService = createBackupService();

  // BK2 hydration gate: if the user has a persisted session but no local
  // user.db (fresh install / re-install after device wipe), attempt to restore
  // their backup so migrations run on the recovered schema, not an empty one.
  try {
    const authSession = await auth.getSession();
    if (authSession) {
      const docDir = FileSystem.documentDirectory ?? '';
      const userDbUri = `${docDir}SQLite/user.db`;
      const fileInfo = await FileSystem.getInfoAsync(userDbUri);
      // Only restore when the local file is missing or effectively empty (<= 512 B).
      // A present, non-trivial file means the device is authoritative — skip.
      const localExists = fileInfo.exists && fileInfo.size > 512;
      if (!localExists) {
        const result = await backupService.restore(authSession.user.id);
        if (result.ok) {
          logger.info('BK2: restored user.db from remote backup');
        } else if (result.reason !== 'no_backup' && result.reason !== 'not_configured') {
          logger.warn('BK2: restore failed', { reason: result.reason });
        }
      }
    }
  } catch (err) {
    // Never block app launch — fresh schema will initialise below.
    logger.warn('BK2: hydration gate error', { error: String(err) });
  }

  // Phase 2: open the database (after potential restore).
  const db = await openDatabase();

  const anonId = await getOrCreateAnonId();
  setSentryTags(anonId, getCurrentSessionId());
  const rawAnalytics = createAnalyticsService(anonId);
  const tracker = new SessionTracker();

  // Wrap analytics to auto-count lesson_completed events for session metrics.
  const analytics = {
    track(event: string, properties?: Record<string, unknown>) {
      if (event === 'lesson_completed') tracker.incrementLesson();
      return rawAnalytics.track(event, properties);
    },
  };

  const installDateMs = await getOrSetInstallDate();

  const words = new SQLiteWordRepository(db);
  const tiers = new SQLiteContentTierRepository(db);
  const progress = new SQLiteUserProgressRepository(db);
  const sessions = new SQLiteQuizSessionRepository(db);
  const answerWriter = new SQLiteAnswerWriter(db);
  const stats = new SQLiteUserStatsRepository(db);

  void tiers;

  // RevenueCat IAP (env-gated: no-op when EXPO_PUBLIC_REVENUECAT_API_KEY_* absent).
  const iap = createRevenueCatIapService();
  const checkTierAccess = new CheckTierAccessUseCase(iap);

  const sessionStartedUC = new SessionStartedUseCase(analytics, stats);
  const sessionCompletedUC = new SessionCompletedUseCase(analytics);
  const appVersion = Constants.expoConfig?.version ?? '0.0.0';

  // BK1.2: periodic backup use case. Throttle (6h) + upload + timestamp persist.
  const performBackup = new PerformBackupUseCase(
    backupService,
    auth,
    () => storage.getLastBackupAtMs(),
    (ms) => storage.setLastBackupAtMs(ms),
    analytics,
  );

  const services: Services = {
    startQuiz: new StartQuizUseCase(words, progress, sessions, analytics, checkTierAccess),
    answerQuestion: new AnswerQuestionUseCase(answerWriter, progress, v1FixedScheduler, analytics),
    runDiagnostic: new RunDiagnosticUseCase(words, progress, v1FixedScheduler),
    saveOnboardingProfile: new SaveOnboardingProfileUseCase(stats),
    analytics,
    auth,
    session: {
      async start() {
        tracker.start();
        await sessionStartedUC.execute({
          appVersion,
          platform: Platform.OS,
          daysSinceInstall: daysSince(installDateMs),
        });
        // Trigger backup check on every foreground (6h throttle; no-op if recent).
        void performBackup.triggerIfNeeded(Date.now());
      },
      async end() {
        const metrics = tracker.end();
        await sessionCompletedUC.execute(metrics);
      },
    },
    backup: {
      triggerIfNeeded: (nowMs: number) => performBackup.triggerIfNeeded(nowMs),
      async forceRestore() {
        try {
          const session = await auth.getSession();
          if (!session) return 'error';
          const result = await backupService.restore(session.user.id);
          if (result.ok) return 'ok';
          return result.reason === 'no_backup' ? 'no_backup' : 'error';
        } catch {
          return 'error';
        }
      },
    },
    iap,
    checkTierAccess,
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
