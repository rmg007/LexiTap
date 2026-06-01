import type { AnalyticsPort } from '@/domain/analytics/AnalyticsPort';

// Emits unified streak_event (event_type: 'incremented' | 'broken') when streak
// state changes. Single event name lets PostHog retention queries use one filter.

export interface StreakEventInput {
  event: 'incremented' | 'broken';
  newStreak: number;
  longestStreak: number;
}

export class StreakEventUseCase {
  constructor(private readonly analytics: AnalyticsPort) {}

  async execute(input: StreakEventInput): Promise<void> {
    this.analytics.track('streak_event', {
      event_type: input.event,
      current_streak: input.newStreak,
      longest_streak: input.longestStreak,
    });
  }
}
