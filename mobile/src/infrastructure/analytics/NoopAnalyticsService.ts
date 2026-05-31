import type { AnalyticsPort } from '@/domain/analytics/AnalyticsPort';

// Production default when EXPO_PUBLIC_POSTHOG_API_KEY is absent. Zero overhead.
export class NoopAnalyticsService implements AnalyticsPort {
  track(_event: string, _properties?: Record<string, unknown>): void {
    // intentional no-op
  }
}
