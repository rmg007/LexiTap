import type { Breadcrumb, Event } from '@sentry/react-native';

import { scrubBreadcrumb, scrubEvent } from './scrub';

describe('scrubEvent', () => {
  it('strips all identity fields', () => {
    const event = {
      user: { id: 'u1', email: 'jane@example.com', ip_address: '1.2.3.4' },
      server_name: "Jane's iPhone",
      request: { url: 'https://proj.supabase.co/auth/v1/token', headers: { authorization: 'Bearer x' } },
      extra: { note: 'jane@example.com' },
    } as Event;

    const result = scrubEvent(event);

    expect(result.user).toBeUndefined();
    expect(result.server_name).toBeUndefined();
    expect(result.request).toBeUndefined();
    expect(result.extra).toBeUndefined();
  });

  it('redacts email addresses in the top-level message', () => {
    const result = scrubEvent({ message: 'sync failed for jane.doe@example.com' } as Event);
    expect(result.message).not.toContain('@example.com');
    expect(result.message).toContain('[redacted-email]');
  });

  it('redacts JWTs and bearer tokens in exception values', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0In0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
    const event = {
      exception: {
        values: [
          { type: 'AuthError', value: `token rejected: ${jwt}` },
          { type: 'HttpError', value: 'header was Bearer sk_live_abc123def' },
        ],
      },
    } as Event;

    const [authEx, httpEx] = scrubEvent(event).exception!.values!;
    expect(authEx!.value).toContain('[redacted-jwt]');
    expect(authEx!.value).not.toContain(jwt);
    expect(httpEx!.value).toContain('[redacted]');
    expect(httpEx!.value).not.toContain('sk_live_abc123def');
  });

  it('drops network/sync breadcrumbs and keeps navigation', () => {
    const event = {
      breadcrumbs: [
        { category: 'xhr', message: 'GET https://proj.supabase.co' },
        { category: 'sync', message: 'flush pending writes' },
        { category: 'navigation', message: '/quiz -> /review' },
        { category: 'console', message: 'logged jane@example.com', data: { email: 'jane@example.com' } },
      ],
    } as Event;

    const crumbs = scrubEvent(event).breadcrumbs!;

    expect(crumbs).toHaveLength(2);
    expect(crumbs.map((c) => c.category)).toEqual(['navigation', 'console']);
    const consoleCrumb = crumbs[1]!;
    expect(consoleCrumb.data).toBeUndefined();
    expect(consoleCrumb.message).toContain('[redacted-email]');
  });

  it('never throws on a malformed or empty event', () => {
    expect(() => scrubEvent({} as Event)).not.toThrow();
    expect(() => scrubEvent({ exception: { values: [{}] } } as Event)).not.toThrow();
    expect(() => scrubEvent({ breadcrumbs: [null] } as unknown as Event)).not.toThrow();
  });
});

describe('scrubBreadcrumb', () => {
  it.each(['http', 'xhr', 'fetch', 'sync', 'http.client'])('drops %s breadcrumbs', (category) => {
    expect(scrubBreadcrumb({ category } as Breadcrumb)).toBeNull();
  });

  it('keeps navigation breadcrumbs', () => {
    const crumb = { category: 'navigation', message: '/home' } as Breadcrumb;
    expect(scrubBreadcrumb(crumb)).not.toBeNull();
  });

  it('drops console data but redacts and keeps the message', () => {
    const result = scrubBreadcrumb({
      category: 'console',
      message: 'user jane@example.com tapped',
      data: { email: 'jane@example.com' },
    } as Breadcrumb);

    expect(result).not.toBeNull();
    expect(result!.data).toBeUndefined();
    expect(result!.message).toContain('[redacted-email]');
  });
});
