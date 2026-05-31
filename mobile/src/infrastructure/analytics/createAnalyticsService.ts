import type { AnalyticsPort } from '@/domain/analytics/AnalyticsPort';
import { NoopAnalyticsService } from './NoopAnalyticsService';
import { getCurrentSessionId } from './AnonIdStore';

// Factory. Returns PostHogAnalyticsService when EXPO_PUBLIC_POSTHOG_API_KEY is
// set (env-gate: prod-allowed if key is configured, compliant with GDPR + opt-out).
// Falls through to NoopAnalyticsService if unset. Env-gate is the enforcement point
// for builds without analytics (tests, dev). User opt-out (Settings toggle) is
// checked at track() time (AnalyticsOptOutStore); it is independent of the env-gate.
export function createAnalyticsService(anonId: string): AnalyticsPort {
  const apiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
  if (!apiKey) return new NoopAnalyticsService();

  const sessionId = getCurrentSessionId();

  // Dynamic require keeps the PostHog SDK out of the module graph when the key
  // is absent (tree-shaking doesn't eliminate side-effect-heavy SDK init code).
  const { PostHogAnalyticsService } = require('./PostHogAnalyticsService') as typeof import('./PostHogAnalyticsService');
  return new PostHogAnalyticsService(apiKey, anonId, sessionId);
}
