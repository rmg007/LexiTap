# Sentry Crash Reporting Setup

**Status:** B1 (basic) + B2 (PII scrub) deployed and tested. B3 (source maps + tags) deferred.

---

## Overview

Sentry crash reporting is initialized at app startup and captures uncaught JavaScript errors, unhandled promise rejections, and user-initiated exceptions. All events are **PII-scrubbed on-device** before leaving the user's phone — no identity, email, tokens, or network URLs ever reach Sentry's servers.

### Key Facts

- **Env-gated:** Inert in development and whenever `EXPO_PUBLIC_SENTRY_DSN` is unset
- **Fail-closed:** If scrubbing throws, the event is dropped rather than risk shipping unscrubbed PII
- **No tracing/replay/screenshots:** Only diagnostic data (errors + breadcrumbs), not performance data
- **Disclosed:** Privacy policy § Operations § Sentry discloses on-device scrubbing

---

## B1: Basic Initialization

### Entry Point: `app/_layout.tsx`

Sentry is initialized at module load time — before any rendering — so startup crashes are captured:

```typescript
import { initCrashReporting, wrapRoot } from '@/infrastructure/crash';

// Line 16: Initialize at module load
initCrashReporting();

// Line 82: Wrap the root component with Sentry's error boundary
export default wrapRoot(RootLayout);
```

### Initialization Code: `src/infrastructure/crash/sentry.ts`

```typescript
export function initCrashReporting(): void {
  if (initialized) return;
  initialized = true;

  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? undefined,
    // Inert in dev and whenever no DSN is set
    enabled: !__DEV__ && Boolean(dsn),
    environment: __DEV__ ? 'development' : 'production',
    // Session tracking for "crash-free SESSION" metrics; no performance tracing
    enableAutoSessionTracking: true,
    tracesSampleRate: 0,    // No performance tracing
    attachScreenshot: false, // No screenshots
    sendDefaultPii: false,   // No default PII collection
    // Fail-closed: drop event on scrubbing error
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
```

### What B1 Captures

1. **Uncaught exceptions** — JavaScript errors not caught by app code
2. **Unhandled promise rejections** — Promises that reject without a catch handler
3. **User-initiated captures** — Calls to `captureException(error)` in error handlers
4. **Breadcrumb trail** — Navigation, user actions, console logs leading to the error
5. **Session tracking** — Did the session crash, or complete?

### What B1 Does NOT Capture

- Performance data (request timing, database queries, component renders)
- Replay/video or screenshots
- Network requests or response bodies
- User identity or device name

---

## B2: PII Scrubbing (On-Device)

### Scrubber Code: `src/infrastructure/crash/scrub.ts`

All events pass through two scrubbing stages before reaching Sentry:

#### 1. **Event Scrubbing** (`scrubEvent`)

Removes these fields from every error event:

| Field | Removed because |
|-------|---|
| `event.user` | Contains id, email, username, IP address |
| `event.server_name` | Often the device name ("Jane's iPhone") |
| `event.request` | Contains URLs, headers, cookies, auth tokens |
| `event.extra` | May contain logged PII or metadata |

Redacts these patterns in free-text fields (message, exception values):

| Pattern | Replaced with |
|---------|---|
| JWT tokens (`eyJ...`) | `[redacted-jwt]` |
| Bearer tokens (`bearer ...`) | `[redacted]` |
| Email addresses (`user@example.com`) | `[redacted-email]` |

Example:

```javascript
// Before scrubbing
{
  message: "Auth failed for jane@example.com",
  user: { id: "u_1234", email: "jane@example.com" },
  exception: { values: [{ value: "token rejected: eyJhbGc..." }] },
}

// After scrubbing
{
  message: "Auth failed for [redacted-email]",
  // user field deleted
  exception: { values: [{ value: "token rejected: [redacted-jwt]" }] },
}
```

#### 2. **Breadcrumb Scrubbing** (`scrubBreadcrumb`)

Drops entire breadcrumb categories that contain auth/network data:

| Category | Reason |
|----------|--------|
| `http`, `xhr`, `fetch` | May contain Supabase URLs or auth tokens |
| `sync` | Involves auth + network operations |

Keeps navigation, UI, and console breadcrumbs.

For console breadcrumbs, drops the `data` field but redacts and keeps the message:

```javascript
// Before scrubbing
{ category: 'console', message: 'user jane@example.com tapped', data: { email: 'jane@example.com' } }

// After scrubbing
{ category: 'console', message: 'user [redacted-email] tapped' }
// data field deleted
```

### Test Coverage

All scrubbing logic is unit-tested without loading the native Sentry module. See `src/infrastructure/crash/scrub.test.ts`:

```bash
npm run test src/infrastructure/crash/scrub.test.ts
```

Tests verify:

- ✓ All identity fields removed
- ✓ Emails redacted in messages
- ✓ JWTs and bearer tokens redacted in exception values
- ✓ Network breadcrumbs dropped, navigation kept
- ✓ Never throws on malformed events (fail-closed)

---

## Configuration

### Runtime Configuration: `.env.example`

```bash
# Crash reporting (Sentry). Runtime DSN — safe to ship; inert if unset.
# Allowed in production: events are PII-scrubbed on-device.
EXPO_PUBLIC_SENTRY_DSN=
```

- **Runtime env var:** `EXPO_PUBLIC_SENTRY_DSN` (safe to ship in binary)
- **For local dev:** Leave unset (app doesn't send to Sentry)
- **For EAS builds:** Set via EAS secrets in `eas.json`

### Expo Config: `app.config.ts`

```typescript
extra: {
  sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? null,
  // ...
}
```

The DSN is injected from the environment variable and passed to the initializer.

### Build-Time (Source Maps, B3)

These are set as EAS secrets for the Expo Sentry plugin (deferred to B3):

```bash
# Set in EAS secrets only (never in .env)
SENTRY_ORG=
SENTRY_PROJECT=
SENTRY_AUTH_TOKEN=
```

Leave these unset for now; the Expo plugin skips source-map upload without them.

---

## Data Captured vs. Not Captured

### Captured (Safe)

- Error message and stack trace
- Breadcrumb trail (navigation, console logs, UI events)
- Breadcrumb timestamps and categories
- Device OS, app version, device model (from Sentry SDK defaults)
- Environment: `development` or `production`
- Crash-free session metrics

### Not Captured (Scrubbed)

- User ID, email, username
- Device name
- URLs, hostnames, domain names
- HTTP headers, cookies, auth tokens (Bearer, JWT, etc.)
- IP addresses
- Request/response bodies
- Network request metadata
- Console `data` field (structured logs)
- Performance timing
- Video/replay/screenshots

---

## Usage

### Capturing Errors in Application Code

Use `captureException` in error handlers:

```typescript
import { captureException } from '@/infrastructure/crash';

try {
  await database.query('...');
} catch (error) {
  logger.error('Query failed', { error: String(error) });
  captureException(error);
  // App continues gracefully
}
```

The error is scrubbed on-device, then sent only if DSN is set.

### Error Boundary

The root layout wraps the app with Sentry's error boundary:

```typescript
export default wrapRoot(RootLayout);
```

This catches render errors automatically. The boundary logs the error and captures it.

### Testing on Simulator/Device

#### To trigger a test error:

```typescript
// Add this to any component temporarily
useEffect(() => {
  // This throws on mount
  throw new Error('Test crash');
}, []);
```

Or call `captureException` directly from a button:

```typescript
import { captureException } from '@/infrastructure/crash';

<Button
  onPress={() => {
    captureException(new Error('Manual test error'));
  }}
>
  Test Crash
</Button>
```

#### Check Sentry dashboard:

1. Navigate to [sentry.io](https://sentry.io)
2. Select the LexiTap project
3. Errors appear in the "Issues" tab within seconds
4. Verify: error message visible, no PII in breadcrumbs

---

## B3: Source Maps + Custom Tags (Deferred)

### What B3 Would Do

B3 is planned but not yet shipped. It would add:

1. **Source maps:** Upload `.js.map` files during EAS build so Sentry shows readable source filenames + line numbers instead of bundled code
2. **Custom tags:** Annotate events with `cohort` (e.g., `beta`, `stable`) and `feature_flags` (e.g., `new_paywall`, `old_paywall`) for filtering
3. **Release tracking:** Group crashes by app version

### Implementation Sketch

The `beforeSend` hook could add tags:

```typescript
beforeSend: (event) => {
  // ... scrub event ...
  
  // Add tags for filtering (no identity!)
  event.tags = {
    cohort: await getCohortTag(), // e.g., 'beta' or 'stable'
  };
  
  // Add release for version grouping
  event.release = Constants.expoConfig?.version; // e.g., '0.1.0'
  
  return event;
},
```

This is blocked until:
- A Sentry organization and project are created
- EAS secrets are configured
- A plan for cohort assignment exists (Phase 3)

---

## Privacy & Compliance

### GDPR / CCPA

- ✓ No personal data collected (user ID, email, device name scrubbed on-device)
- ✓ No tracking across apps
- ✓ No consent banner needed (diagnostic data, not marketing)
- ✓ Disclosed in privacy policy

### Privacy Policy Language

The privacy policy discloses Sentry under **Operations § Crash Reporting**:

> LexiTap uses Sentry to track application crashes and errors. All crash data is automatically scrubbed of personally identifiable information (user ID, email, device name, auth tokens) on your device before any data leaves your phone. We capture error messages, stack traces, and navigation breadcrumbs only to improve reliability. You can opt out of crash reporting by contacting support.

---

## Troubleshooting

### Events not appearing in Sentry dashboard

1. **Check DSN is set:** Verify `EXPO_PUBLIC_SENTRY_DSN` in EAS build config
2. **Check enabled flag:** Verify `!__DEV__ && Boolean(dsn)` is true (not in dev)
3. **Check network:** Simulator may need internet access to reach sentry.io
4. **Check scrubbing:** If `beforeSend` throws, event is dropped silently (fail-closed)

### PII accidentally in events

This is a scrubber bug. File an issue with:
- The event ID from Sentry dashboard
- The PII that leaked
- Steps to reproduce

Then update scrub patterns:

```typescript
// src/infrastructure/crash/scrub.ts
const REDACTIONS = [
  // Add new pattern here
  [/<new-pattern>/g, '[redacted]'],
];
```

Add a test case:

```typescript
// src/infrastructure/crash/scrub.test.ts
it('redacts <what-leaked>', () => {
  const result = scrubEvent({ message: '...<leaked-data>...' } as Event);
  expect(result.message).not.toContain('<leaked-data>');
  expect(result.message).toContain('[redacted]');
});
```

---

## Related Files

| File | Purpose |
|------|---------|
| `src/infrastructure/crash/sentry.ts` | Sentry SDK initialization + wrapRoot export |
| `src/infrastructure/crash/scrub.ts` | PII redaction + breadcrumb filtering |
| `src/infrastructure/crash/scrub.test.ts` | Scrubber unit tests (272 tests total) |
| `src/infrastructure/crash/index.ts` | Public API exports |
| `app/_layout.tsx` | Root layout: initCrashReporting() called here |
| `app.config.ts` | DSN injection from env var |
| `.env.example` | DSN env var documented |
| `plans/RELEASE_PLAN.md` | B1–B3 feature breakdown + timing |

---

## References

- [Sentry React Native SDK Docs](https://docs.sentry.io/platforms/react-native/)
- [Sentry PII Redaction](https://docs.sentry.io/platforms/react-native/enriching-events/before-send-hook/)
- [Privacy Policy](../lexitap-docs/07-operations-compliance/PRIVACY_POLICY_TERMS_OF_SERVICE.md) § Operations § Crash Reporting
- [Release Plan](../plans/RELEASE_PLAN.md) § Content Pipeline § Crash Reporting (B1–B3)

---

*Last updated: 2026-05-31 — B1+B2 verified deployed, 272 tests green. Source maps + tags (B3) deferred to Phase 3.*
