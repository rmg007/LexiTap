import type { Breadcrumb, Event } from '@sentry/react-native';

// PII / secret scrubbing for crash reports. These functions are PURE and import
// only TYPES from the SDK (erased at compile time), so unit tests exercise them
// without loading the native Sentry module. They run inside Sentry's
// `beforeSend` / `beforeBreadcrumb` hooks (see ./sentry.ts), which are the last
// gate before anything leaves the device.
//
// Privacy is legally load-bearing here: LexiTap is 13+ and global, so events may
// originate from minors (COPPA / GDPR Art. 8). We send diagnostics only — never
// identity. Disclosed in lexitap-docs/07-operations-compliance/PRIVACY_POLICY_TERMS_OF_SERVICE.md.

// Free-text fields (error messages, breadcrumb messages) can contain interpolated
// secrets or PII. Redact them with disjoint patterns. JWT runs first so a
// "bearer <jwt>" string is already neutralised before the bearer rule sees it.
const REDACTIONS: ReadonlyArray<readonly [RegExp, string]> = [
  // JSON Web Tokens — Supabase access/refresh tokens are JWTs.
  [/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[redacted-jwt]'],
  // Authorization values leaked into a message.
  [/\b(bearer|token)\s+[A-Za-z0-9._-]+/gi, '$1 [redacted]'],
  // Email addresses.
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[redacted-email]'],
];

function redact(text: string): string {
  let out = text;
  for (const [pattern, replacement] of REDACTIONS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

// Breadcrumb categories dropped wholesale: network crumbs carry the Supabase URL
// and auth tokens; `sync` touches auth/network too (RELEASE_PLAN B2: "drop sync").
const DROP_CATEGORIES: ReadonlyArray<string> = ['http', 'xhr', 'fetch', 'sync'];

/**
 * Sanitise a single breadcrumb. Returns `null` to drop it entirely.
 * Safe to call from `beforeBreadcrumb` and from {@link scrubEvent}.
 */
export function scrubBreadcrumb(crumb: Breadcrumb): Breadcrumb | null {
  const category = crumb.category ?? '';
  if (DROP_CATEGORIES.some((c) => category === c || category.startsWith(`${c}.`))) {
    return null;
  }
  // Console crumbs may carry logged metadata objects; keep the (redacted)
  // message but drop the structured payload.
  if (category === 'console') {
    delete crumb.data;
  }
  if (typeof crumb.message === 'string') {
    crumb.message = redact(crumb.message);
  }
  return crumb;
}

/**
 * Strip identity and redact secrets from an outbound event. Mutates and returns
 * the same object (Sentry's `beforeSend` contract). Never throws on a malformed
 * event — missing fields are simply skipped.
 */
export function scrubEvent<T extends Event>(event: T): T {
  // Identity — remove anything that could name a person or device.
  delete event.user; // id / email / username / ip_address
  delete event.server_name; // frequently the device name ("Jane's iPhone")
  delete event.request; // URLs, headers, cookies, bodies
  // `logger.error(msg, meta)` metadata lands in `extra` and may carry PII.
  delete event.extra;

  if (typeof event.message === 'string') {
    event.message = redact(event.message);
  }

  const values = event.exception?.values;
  if (values) {
    for (const ex of values) {
      if (typeof ex.value === 'string') {
        ex.value = redact(ex.value);
      }
    }
  }

  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs
      .filter((b): b is Breadcrumb => b != null)
      .map(scrubBreadcrumb)
      .filter((b): b is Breadcrumb => b !== null);
  }

  return event;
}
