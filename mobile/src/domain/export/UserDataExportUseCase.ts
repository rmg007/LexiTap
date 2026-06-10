// Serializes all local learning data to a JSON string suitable for the native
// Share Sheet. Apple App Store Guideline 5.1.1(v) requires that any app
// allowing account creation also allows data export. This use case satisfies
// that requirement — it reads data only through the ExportDataPort abstraction
// so the presentation layer can invoke it without touching infrastructure.

// Port: narrow data access interface used only by this use case.
// Kept inline to avoid naming a directory 'export' (reserved keyword / eslint
// expo* pattern collision).
export interface ExportDataPort {
  /** All SRS progress rows on this device. */
  getAllProgress(): Promise<Array<{
    wordId: string;
    masteryLevel: number;
    nextReviewDate: number;
    lastReviewedAt?: number;
    consecutiveCorrect: number;
    totalAttempts: number;
    totalCorrect: number;
    firstSeenAt?: number;
    schedulerVersion: string;
  }>>;
  /** User stats (streak, totals, onboarding state). */
  getUserStats(): Promise<{
    totalSessions: number;
    totalWordsMastered: number;
    streak: { currentStreak: number; longestStreak: number };
  } | null>;
}

export interface ExportPayload {
  exportedAt: string; // ISO-8601
  version: 1;
  stats: {
    totalSessions: number;
    totalWordsMastered: number;
    streak: {
      currentStreak: number;
      longestStreak: number;
    };
  } | null;
  progress: Array<{
    wordId: string;
    masteryLevel: number;
    nextReviewDate: number;
    lastReviewedAt?: number;
    consecutiveCorrect: number;
    totalAttempts: number;
    totalCorrect: number;
    firstSeenAt?: number;
    schedulerVersion: string;
  }>;
}

export class UserDataExportUseCase {
  constructor(private readonly port: ExportDataPort) {}

  async execute(nowMs: number = Date.now()): Promise<string> {
    const [stats, progress] = await Promise.all([
      this.port.getUserStats(),
      this.port.getAllProgress(),
    ]);

    const payload: ExportPayload = {
      exportedAt: new Date(nowMs).toISOString(),
      version: 1,
      stats: stats
        ? {
            totalSessions: stats.totalSessions,
            totalWordsMastered: stats.totalWordsMastered,
            streak: {
              currentStreak: stats.streak.currentStreak,
              longestStreak: stats.streak.longestStreak,
            },
          }
        : null,
      progress: progress.map((p) => ({
        wordId: p.wordId,
        masteryLevel: p.masteryLevel,
        nextReviewDate: p.nextReviewDate,
        ...(p.lastReviewedAt !== undefined && { lastReviewedAt: p.lastReviewedAt }),
        consecutiveCorrect: p.consecutiveCorrect,
        totalAttempts: p.totalAttempts,
        totalCorrect: p.totalCorrect,
        ...(p.firstSeenAt !== undefined && { firstSeenAt: p.firstSeenAt }),
        schedulerVersion: p.schedulerVersion,
      })),
    };

    return JSON.stringify(payload, null, 2);
  }
}
