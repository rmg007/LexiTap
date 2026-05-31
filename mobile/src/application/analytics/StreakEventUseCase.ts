import type { AnalyticsPort } from '@/domain/analytics/AnalyticsPort';

// Emits streak_incremented or streak_broken events when streak state changes.
// Used for gamification funnel analysis and engagement tracking.

export interface StreakEventInput {
  event: 'incremented' | 'broken';
  newStreak: number;
  longestStreak: number;
}

export class StreakEventUseCase {
  constructor(private readonly analytics: AnalyticsPort) {}

  async execute(input: StreakEventInput): Promise<void> {
    const eventName = input.event === 'incremented' ? 'streak_incremented' : 'streak_broken';
    this.analytics.track(eventName, {
      current_streak: input.newStreak,
      longest_streak: input.longestStreak,
    });
  }
}
