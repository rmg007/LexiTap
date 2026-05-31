import type { AnalyticsPort } from '@/domain/analytics/AnalyticsPort';
import { NoopAnalyticsService } from './NoopAnalyticsService';

// Factory. Returns PostHogAnalyticsService when EXPO_PUBLIC_POSTHOG_API_KEY is
// set (dev/staging only — CLAUDE.md forbids analytics SDKs in production builds
// without env gating). Falls through to NoopAnalyticsService otherwise.
export function createAnalyticsService(anonId: string): AnalyticsPort {
  const apiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
  if (!apiKey) return new NoopAnalyticsService();

  // Dynamic require keeps the PostHog SDK out of the module graph when the key
  // is absent (tree-shaking doesn't eliminate side-effect-heavy SDK init code).
  const { PostHogAnalyticsService } = require('./PostHogAnalyticsService') as typeof import('./PostHogAnalyticsService');
  return new PostHogAnalyticsService(apiKey, anonId);
}
