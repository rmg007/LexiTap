import type { AnalyticsPort } from '@/domain/analytics/AnalyticsPort';

// Emits session_completed when the app goes to background or is closed.
// duration_sec and lesson_count are the key signals for P2 funnel analysis.

export interface SessionCompletedInput {
  durationMs: number;
  lessonCount: number;
}

export class SessionCompletedUseCase {
  constructor(private readonly analytics: AnalyticsPort) {}

  async execute(input: SessionCompletedInput): Promise<void> {
    this.analytics.track('session_completed', {
      duration_sec: Math.round(input.durationMs / 1000),
      lesson_count: input.lessonCount,
    });
  }
}
