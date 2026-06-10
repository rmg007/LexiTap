// Tests for AUTH-2 (Apple token revocation) and RC-2 (RevenueCat deletion).
//
// Run with: deno test --allow-env supabase/functions/delete-account/index.test.ts
//
// The Deno.env.get() calls are intercepted via a minimal stub so tests don't
// need real secrets. fetch() is replaced per-test via globalThis.fetch.

import {
  mintAppleClientSecret,
  callAppleRevoke,
  revokeAppleTokens,
  deleteRevenueCatCustomer,
  type AdminAuthClient,
} from './index.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type FetchSpy = {
  calls: { url: string; init: RequestInit }[];
  nextResponse: Response;
};

function mockFetch(spy: FetchSpy) {
  globalThis.fetch = (url: string | URL | Request, init?: RequestInit) => {
    spy.calls.push({ url: String(url), init: init ?? {} });
    return Promise.resolve(spy.nextResponse.clone());
  };
}

function okResponse(body = '{}') {
  return new Response(body, { status: 200 });
}

function errorResponse(status: number, body = '{"error":"fail"}') {
  return new Response(body, { status });
}

// Minimal fake Supabase admin client satisfying AdminAuthClient.
function makeAdmin(opts: {
  identities?: { provider: string; id: string; identity_data?: Record<string, unknown> }[];
  getUserError?: string;
}): AdminAuthClient {
  return {
    auth: {
      admin: {
        getUserById: (_id: string) => {
          if (opts.getUserError) {
            return Promise.resolve({
              data: null,
              error: { message: opts.getUserError },
            });
          }
          return Promise.resolve({
            data: { user: { identities: opts.identities ?? [] } },
            error: null,
          });
        },
      },
    },
  };
}

// Stub Deno.env so tests can set/clear secrets without touching the real env.
const _realEnvGet = Deno.env.get.bind(Deno.env);
function withEnv(vars: Record<string, string | undefined>, fn: () => Promise<void>) {
  return async () => {
    const original = Object.fromEntries(
      Object.keys(vars).map((k) => [k, _realEnvGet(k)]),
    );
    for (const [k, v] of Object.entries(vars)) {
      if (v === undefined) {
        Deno.env.delete(k);
      } else {
        Deno.env.set(k, v);
      }
    }
    try {
      await fn();
    } finally {
      for (const [k, v] of Object.entries(original)) {
        if (v === undefined) Deno.env.delete(k);
        else Deno.env.set(k, v);
      }
    }
  };
}

// ---------------------------------------------------------------------------
// mintAppleClientSecret
// ---------------------------------------------------------------------------

Deno.test('mintAppleClientSecret — produces a 3-part JWT', async () => {
  // Generate a real P-256 key so we can test end-to-end (no real Apple call).
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify'],
  );
  const pkcs8 = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
  const pemBody = btoa(String.fromCharCode(...new Uint8Array(pkcs8)));
  const pem = `-----BEGIN PRIVATE KEY-----\n${pemBody}\n-----END PRIVATE KEY-----`;

  const jwt = await mintAppleClientSecret('TEAM0000AB', 'KEY0000001', 'com.lexitap.app', pem);
  const parts = jwt.split('.');
  if (parts.length !== 3) throw new Error(`Expected 3 parts, got ${parts.length}`);

  // Header must declare ES256 + correct kid.
  const header = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')));
  if (header.alg !== 'ES256') throw new Error(`Expected alg=ES256, got ${header.alg}`);
  if (header.kid !== 'KEY0000001') throw new Error(`Expected kid=KEY0000001, got ${header.kid}`);

  // Payload must have correct iss/sub/aud and a sensible exp.
  const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
  if (payload.iss !== 'TEAM0000AB') throw new Error('Wrong iss');
  if (payload.sub !== 'com.lexitap.app') throw new Error('Wrong sub');
  if (payload.aud !== 'https://appleid.apple.com') throw new Error('Wrong aud');
  if (payload.exp - payload.iat !== 180) throw new Error('Wrong exp delta');
});

// ---------------------------------------------------------------------------
// callAppleRevoke
// ---------------------------------------------------------------------------

Deno.test('callAppleRevoke — POSTs correct form body', async () => {
  const spy: FetchSpy = { calls: [], nextResponse: okResponse() };
  mockFetch(spy);

  await callAppleRevoke('rt_abc', 'cs_xyz', 'com.lexitap.app', 'https://test.apple');

  if (spy.calls.length !== 1) throw new Error('Expected 1 fetch call');
  if (!spy.calls[0].url.includes('/auth/revoke')) throw new Error('Wrong URL');

  const body = spy.calls[0].init.body as URLSearchParams;
  if (body.get('token') !== 'rt_abc') throw new Error('Wrong token');
  if (body.get('client_secret') !== 'cs_xyz') throw new Error('Wrong client_secret');
  if (body.get('token_type_hint') !== 'refresh_token') throw new Error('Wrong hint');
  if (body.get('client_id') !== 'com.lexitap.app') throw new Error('Wrong client_id');
});

Deno.test('callAppleRevoke — throws on non-2xx', async () => {
  const spy: FetchSpy = { calls: [], nextResponse: errorResponse(400, 'invalid_token') };
  mockFetch(spy);

  let threw = false;
  try {
    await callAppleRevoke('rt_abc', 'cs_xyz', 'com.lexitap.app', 'https://test.apple');
  } catch {
    threw = true;
  }
  if (!threw) throw new Error('Expected throw on 400');
});

// ---------------------------------------------------------------------------
// revokeAppleTokens
// ---------------------------------------------------------------------------

Deno.test(
  'revokeAppleTokens — skipped when secrets absent',
  withEnv(
    {
      APPLE_TEAM_ID: undefined,
      APPLE_KEY_ID: undefined,
      APPLE_P8_PRIVATE_KEY: undefined,
      APPLE_CLIENT_ID: undefined,
    },
    async () => {
      const admin = makeAdmin({ identities: [] });
      const result = await revokeAppleTokens('user-1', admin);
      if (result !== 'skipped') throw new Error(`Expected 'skipped', got '${result}'`);
    },
  ),
);

Deno.test(
  'revokeAppleTokens — ok when user has no Apple identity',
  withEnv(
    {
      APPLE_TEAM_ID: 'TEAM0000AB',
      APPLE_KEY_ID: 'KEY0000001',
      APPLE_P8_PRIVATE_KEY: await (async () => {
        const kp = await crypto.subtle.generateKey(
          { name: 'ECDSA', namedCurve: 'P-256' },
          true,
          ['sign'],
        );
        const raw = await crypto.subtle.exportKey('pkcs8', kp.privateKey);
        return `-----BEGIN PRIVATE KEY-----\n${btoa(
          String.fromCharCode(...new Uint8Array(raw)),
        )}\n-----END PRIVATE KEY-----`;
      })(),
      APPLE_CLIENT_ID: 'com.lexitap.app',
    },
    async () => {
      const admin = makeAdmin({ identities: [{ provider: 'google', id: 'g-1' }] });
      const result = await revokeAppleTokens('user-1', admin);
      if (result !== 'ok') throw new Error(`Expected 'ok', got '${result}'`);
    },
  ),
);

Deno.test(
  'revokeAppleTokens — ok when Apple identity has no refresh_token',
  withEnv(
    {
      APPLE_TEAM_ID: 'TEAM0000AB',
      APPLE_KEY_ID: 'KEY0000001',
      APPLE_P8_PRIVATE_KEY: await (async () => {
        const kp = await crypto.subtle.generateKey(
          { name: 'ECDSA', namedCurve: 'P-256' },
          true,
          ['sign'],
        );
        const raw = await crypto.subtle.exportKey('pkcs8', kp.privateKey);
        return `-----BEGIN PRIVATE KEY-----\n${btoa(
          String.fromCharCode(...new Uint8Array(raw)),
        )}\n-----END PRIVATE KEY-----`;
      })(),
      APPLE_CLIENT_ID: 'com.lexitap.app',
    },
    async () => {
      const spy: FetchSpy = { calls: [], nextResponse: okResponse() };
      mockFetch(spy);
      const admin = makeAdmin({
        identities: [{ provider: 'apple', id: 'a-1', identity_data: {} }],
      });
      const result = await revokeAppleTokens('user-1', admin);
      if (result !== 'ok') throw new Error(`Expected 'ok', got '${result}'`);
      // No Apple fetch should have been made (skipped gracefully).
      const appleCalls = spy.calls.filter((c) => c.url.includes('apple'));
      if (appleCalls.length !== 0) throw new Error('Expected no Apple fetch');
    },
  ),
);

Deno.test(
  'revokeAppleTokens — calls /auth/revoke when refresh_token present',
  withEnv(
    {
      APPLE_TEAM_ID: 'TEAM0000AB',
      APPLE_KEY_ID: 'KEY0000001',
      APPLE_P8_PRIVATE_KEY: await (async () => {
        const kp = await crypto.subtle.generateKey(
          { name: 'ECDSA', namedCurve: 'P-256' },
          true,
          ['sign'],
        );
        const raw = await crypto.subtle.exportKey('pkcs8', kp.privateKey);
        return `-----BEGIN PRIVATE KEY-----\n${btoa(
          String.fromCharCode(...new Uint8Array(raw)),
        )}\n-----END PRIVATE KEY-----`;
      })(),
      APPLE_CLIENT_ID: 'com.lexitap.app',
    },
    async () => {
      const spy: FetchSpy = { calls: [], nextResponse: okResponse() };
      mockFetch(spy);
      const admin = makeAdmin({
        identities: [
          {
            provider: 'apple',
            id: 'a-1',
            identity_data: { provider_refresh_token: 'rt_real' },
          },
        ],
      });
      const result = await revokeAppleTokens('user-1', admin, 'https://test.apple');
      if (result !== 'ok') throw new Error(`Expected 'ok', got '${result}'`);
      const revokeCalls = spy.calls.filter((c) => c.url.includes('/auth/revoke'));
      if (revokeCalls.length !== 1) throw new Error(`Expected 1 revoke call, got ${revokeCalls.length}`);
    },
  ),
);

Deno.test(
  'revokeAppleTokens — throws when getUserById fails (secrets set)',
  withEnv(
    {
      APPLE_TEAM_ID: 'TEAM0000AB',
      APPLE_KEY_ID: 'KEY0000001',
      APPLE_P8_PRIVATE_KEY: 'stub-key',
      APPLE_CLIENT_ID: 'com.lexitap.app',
    },
    async () => {
      const admin = makeAdmin({ getUserError: 'DB error' });
      let threw = false;
      try {
        await revokeAppleTokens('user-1', admin);
      } catch {
        threw = true;
      }
      if (!threw) throw new Error('Expected throw when getUserById fails');
    },
  ),
);

Deno.test(
  'revokeAppleTokens — throws when Apple revoke fails (secrets set)',
  withEnv(
    {
      APPLE_TEAM_ID: 'TEAM0000AB',
      APPLE_KEY_ID: 'KEY0000001',
      APPLE_P8_PRIVATE_KEY: await (async () => {
        const kp = await crypto.subtle.generateKey(
          { name: 'ECDSA', namedCurve: 'P-256' },
          true,
          ['sign'],
        );
        const raw = await crypto.subtle.exportKey('pkcs8', kp.privateKey);
        return `-----BEGIN PRIVATE KEY-----\n${btoa(
          String.fromCharCode(...new Uint8Array(raw)),
        )}\n-----END PRIVATE KEY-----`;
      })(),
      APPLE_CLIENT_ID: 'com.lexitap.app',
    },
    async () => {
      const spy: FetchSpy = { calls: [], nextResponse: errorResponse(500) };
      mockFetch(spy);
      const admin = makeAdmin({
        identities: [
          {
            provider: 'apple',
            id: 'a-1',
            identity_data: { provider_refresh_token: 'rt_real' },
          },
        ],
      });
      let threw = false;
      try {
        await revokeAppleTokens('user-1', admin, 'https://test.apple');
      } catch {
        threw = true;
      }
      if (!threw) throw new Error('Expected throw on Apple 500');
    },
  ),
);

// ---------------------------------------------------------------------------
// deleteRevenueCatCustomer
// ---------------------------------------------------------------------------

Deno.test(
  'deleteRevenueCatCustomer — skipped when secret absent',
  withEnv({ REVENUECAT_SECRET_KEY: undefined }, async () => {
    const result = await deleteRevenueCatCustomer('user-1');
    if (result !== 'skipped') throw new Error(`Expected 'skipped', got '${result}'`);
  }),
);

Deno.test(
  'deleteRevenueCatCustomer — DELETEs correct URL with Bearer auth',
  withEnv({ REVENUECAT_SECRET_KEY: 'sk_test_abc' }, async () => {
    const spy: FetchSpy = { calls: [], nextResponse: okResponse() };
    mockFetch(spy);

    const result = await deleteRevenueCatCustomer('user-uuid-1', 'https://rc.test');
    if (result !== 'ok') throw new Error(`Expected 'ok', got '${result}'`);
    if (spy.calls.length !== 1) throw new Error('Expected 1 fetch call');

    const call = spy.calls[0];
    if (!call.url.includes('/v1/subscribers/user-uuid-1')) throw new Error(`Wrong URL: ${call.url}`);

    const auth = (call.init.headers as Record<string, string>)?.['Authorization'];
    if (auth !== 'Bearer sk_test_abc') throw new Error(`Wrong auth: ${auth}`);

    const method = call.init.method;
    if (method !== 'DELETE') throw new Error(`Expected DELETE, got ${method}`);
  }),
);

Deno.test(
  'deleteRevenueCatCustomer — userId is URL-encoded',
  withEnv({ REVENUECAT_SECRET_KEY: 'sk_test_abc' }, async () => {
    const spy: FetchSpy = { calls: [], nextResponse: okResponse() };
    mockFetch(spy);
    await deleteRevenueCatCustomer('user/with/slashes', 'https://rc.test');
    if (!spy.calls[0].url.includes('user%2Fwith%2Fslashes')) {
      throw new Error(`URL not encoded: ${spy.calls[0].url}`);
    }
  }),
);

Deno.test(
  'deleteRevenueCatCustomer — 404 treated as ok (idempotent)',
  withEnv({ REVENUECAT_SECRET_KEY: 'sk_test_abc' }, async () => {
    const spy: FetchSpy = { calls: [], nextResponse: errorResponse(404) };
    mockFetch(spy);
    const result = await deleteRevenueCatCustomer('user-1', 'https://rc.test');
    if (result !== 'ok') throw new Error(`Expected 'ok' on 404, got '${result}'`);
  }),
);

Deno.test(
  'deleteRevenueCatCustomer — throws on non-2xx non-404',
  withEnv({ REVENUECAT_SECRET_KEY: 'sk_test_abc' }, async () => {
    const spy: FetchSpy = { calls: [], nextResponse: errorResponse(500) };
    mockFetch(spy);
    let threw = false;
    try {
      await deleteRevenueCatCustomer('user-1', 'https://rc.test');
    } catch {
      threw = true;
    }
    if (!threw) throw new Error('Expected throw on RC 500');
  }),
);

Deno.test(
  'deleteRevenueCatCustomer — throws on 429',
  withEnv({ REVENUECAT_SECRET_KEY: 'sk_test_abc' }, async () => {
    const spy: FetchSpy = { calls: [], nextResponse: errorResponse(429) };
    mockFetch(spy);
    let threw = false;
    try {
      await deleteRevenueCatCustomer('user-1', 'https://rc.test');
    } catch {
      threw = true;
    }
    if (!threw) throw new Error('Expected throw on RC 429');
  }),
);
