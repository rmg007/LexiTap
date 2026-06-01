import type { AnalyticsPort } from '@/domain/analytics/AnalyticsPort';
import type { UserStatsRepository } from '@/domain/user/UserStats';

// Emits session_started on every app foreground. Includes retention segmentation
// properties (onboarding_goal, frontier_rank) for D7 cohort slicing per P2_BETA_PLAN.

export interface SessionStartedInput {
  appVersion: string;
  daysSinceInstall: number;
  platform: string;
}

export class SessionStartedUseCase {
  constructor(
    private readonly analytics: AnalyticsPort,
    private readonly stats: UserStatsRepository,
  ) {}

  async execute(input: SessionStartedInput): Promise<void> {
    const stats = await this.stats.get();
    const totalSessions = stats?.totalSessions ?? 0;
    const onboarding = stats?.onboardingState;

    this.analytics.track('session_started', {
      app_version: input.appVersion,
      platform: input.platform,
      days_since_install: input.daysSinceInstall,
      total_sessions: totalSessions,
      is_first_open: totalSessions === 0,
      ...(onboarding?.goal !== undefined && { onboarding_goal: onboarding.goal }),
      ...(onboarding?.frontierRank !== undefined && { frontier_rank: onboarding.frontierRank }),
    });
  }
}
