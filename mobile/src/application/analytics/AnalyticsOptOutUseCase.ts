import type { AnalyticsPort } from '@/domain/analytics/AnalyticsPort';

// Emits analytics_opt_out when the user toggles off analytics in Settings.
// Event itself is captured (best-effort) to record the opt-out decision before
// the flag takes effect. Subsequent events will not be emitted after opt-out.
// This is deferred: A6 implementation includes the toggle UI.

export interface AnalyticsOptOutInput {
  optedOut: boolean;
}

export class AnalyticsOptOutUseCase {
  constructor(private readonly analytics: AnalyticsPort) {}

  async execute(input: AnalyticsOptOutInput): Promise<void> {
    this.analytics.track('analytics_opt_out', {
      opted_out: input.optedOut,
    });
  }
}
