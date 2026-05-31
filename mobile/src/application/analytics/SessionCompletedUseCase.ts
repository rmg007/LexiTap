import type { AnalyticsPort } from '@/domain/analytics/AnalyticsPort';

// Emits session_completed event when the app goes to background or is closed.
// Useful for retention cohorts (D1/D7/D30 return rate) and session duration analysis.
// Captures duration in milliseconds.

export interface SessionCompletedInput {
  durationMs: number;
}

export class SessionCompletedUseCase {
  constructor(private readonly analytics: AnalyticsPort) {}

  async execute(input: SessionCompletedInput): Promise<void> {
    this.analytics.track('session_completed', {
      duration_ms: input.durationMs,
    });
  }
}
