import PostHog from 'posthog-react-native';
import type { AnalyticsPort } from '@/domain/analytics/AnalyticsPort';
import { getAnalyticsOptOut } from './AnalyticsOptOutStore';

// Env-gated PostHog adapter. Only instantiated when EXPO_PUBLIC_POSTHOG_API_KEY
// is set (see createAnalyticsService). The PostHog SDK queues events to
// AsyncStorage and flushes on connectivity — no separate flush infrastructure
// needed. Never logs PII; anon_id + session_id are the only identifiers passed
// to PostHog. Uses EU host (https://eu.i.posthog.com) for GDPR compliance.
// User opt-out (Settings toggle) is checked before each capture.
export class PostHogAnalyticsService implements AnalyticsPort {
  private readonly client: PostHog;
  private readonly sessionId: string;

  constructor(apiKey: string, anonId: string, sessionId: string) {
    this.sessionId = sessionId;
    this.client = new PostHog(apiKey, { host: 'https://eu.i.posthog.com' });
    this.client.identify(anonId);
  }

  async track(event: string, properties?: Record<string, unknown>): Promise<void> {
    try {
      // Check opt-out before sending. Fail-closed: if storage check fails,
      // assume the user wants to opt out and do not send.
      const isOptedOut = await getAnalyticsOptOut();
      if (isOptedOut) return;

      // Attach session_id to every event payload. Cast needed: PostHogEventProperties
      // is structurally identical to Record<string, JsonType>; our port uses unknown
      // for portability. Remove any PII before calling this (enforced by use cases).
      const payload = {
        ...properties,
        session_id: this.sessionId,
      };
      this.client.capture(event, payload as Record<string, string | number | boolean | null>);
    } catch {
      // Swallow: analytics must never crash the app.
    }
  }
}
