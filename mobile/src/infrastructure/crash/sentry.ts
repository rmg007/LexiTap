import * as Sentry from '@sentry/react-native';

import { scrubBreadcrumb, scrubEvent } from './scrub';

// Crash reporting adapter — the ONLY module that imports the Sentry SDK, per the
// hexagonal rule (external SDKs live in infrastructure). Initialisation is
// env-gated: with no DSN configured (no Sentry project yet) or in dev, the SDK
// is disabled and nothing leaves the device. See plans/RELEASE_PLAN.md B1–B3.

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN ?? undefined;

let initialized = false;

export function initCrashReporting(): void {
  if (initialized) return;
  initialized = true;

  Sentry.init({
    dsn,
    // Inert in dev and whenever no DSN is set.
    enabled: !__DEV__ && Boolean(dsn),
    environment: __DEV__ ? 'development' : 'production',
    // Crash-free SESSION rate (the retention-dashboard signal) comes from auto
    // session tracking. No performance tracing, no replay, no screenshots — all
    // of which would capture far more than diagnostics.
    enableAutoSessionTracking: true,
    tracesSampleRate: 0,
    attachScreenshot: false,
    sendDefaultPii: false,
    // Fail-closed: if scrubbing ever throws, drop the event rather than risk
    // shipping unscrubbed PII off-device.
    beforeSend: (event) => {
      try {
        return scrubEvent(event);
      } catch {
        return null;
      }
    },
    beforeBreadcrumb: (breadcrumb) => {
      try {
        return scrubBreadcrumb(breadcrumb);
      } catch {
        return null;
      }
    },
  });
}

// Wraps the root component: JS error boundary + touch breadcrumbs. Identity is
// `Sentry.wrap` so the typing flows through to the wrapped component.
export const wrapRoot = Sentry.wrap;

// Guarded explicit capture. No-op until init + DSN; never sets user identity.
export function captureException(error: unknown): void {
  Sentry.captureException(error);
}
// Wire pseudonymous tags so events are groupable by device/session without
// identifying the user. Call once after anon_id resolves (container init).
// Tags survive scrubEvent — scrub deletes user/server_name/request/extra, not tags.
export function setSentryTags(anonId: string, sessionId: string): void {
  Sentry.setTag('anon_id', anonId);
  Sentry.setTag('session_id', sessionId);
}
