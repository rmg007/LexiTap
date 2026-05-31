import PostHog from 'posthog-react-native';
import type { AnalyticsPort } from '@/domain/analytics/AnalyticsPort';

// Env-gated PostHog adapter. Only instantiated when EXPO_PUBLIC_POSTHOG_API_KEY
// is set (see createAnalyticsService). The PostHog SDK queues events to
// AsyncStorage and flushes on connectivity — no separate flush infrastructure
// needed. Never logs PII; anon_id is the only identifier passed to PostHog.
export class PostHogAnalyticsService implements AnalyticsPort {
  private readonly client: PostHog;

  constructor(apiKey: string, anonId: string) {
    this.client = new PostHog(apiKey, { host: 'https://us.i.posthog.com' });
    this.client.identify(anonId);
  }

  track(event: string, properties?: Record<string, unknown>): void {
    try {
      // Cast needed: PostHogEventProperties is structurally identical but typed
      // as Record<string, JsonType>; our port uses unknown for portability.
      this.client.capture(event, properties as Record<string, string | number | boolean | null>);
    } catch {
      // Swallow: analytics must never crash the app.
    }
  }
}
