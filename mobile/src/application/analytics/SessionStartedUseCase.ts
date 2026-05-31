import type { AnalyticsPort } from '@/domain/analytics/AnalyticsPort';
import type { UserStatsRepository } from '@/domain/user/UserStats';

// Emits session_started event when the app opens. Captures app version,
// days since install, and total sessions for funnel/retention analysis.
// Deferred: account/auth state (P3).

export interface SessionStartedInput {
  appVersion: string;
  daysSinceInstall: number;
}

export class SessionStartedUseCase {
  constructor(
    private readonly analytics: AnalyticsPort,
    private readonly stats: UserStatsRepository,
  ) {}

  async execute(input: SessionStartedInput): Promise<void> {
    const stats = await this.stats.get();
    const totalSessions = stats?.totalSessions ?? 0;

    this.analytics.track('session_started', {
      app_version: input.appVersion,
      days_since_install: input.daysSinceInstall,
      total_sessions: totalSessions,
      is_first_open: totalSessions === 0,
    });
  }
}
