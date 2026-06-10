// delete-account — permanently erases the calling user's account + data.
//
// Invoked from the app via `supabase.functions.invoke('delete-account')`. The
// supabase-js client auto-injects the caller's JWT as `Authorization: Bearer
// <jwt>`. `verify_jwt = true` (see config.toml) makes the Edge gateway reject
// unauthenticated calls BEFORE this code runs; we additionally re-derive the
// caller from their token here (defense in depth) so a user can only ever
// delete THEIR OWN account — the deleted id comes from the verified JWT, never
// from request input.
//
// Steps (ORDER IS LOAD-BEARING — do not reorder):
//   1. Revoke Apple Sign-In token (AUTH-2) — BEFORE the irreversible auth-user
//      delete. Once the user is deleted admin.getUserById() can no longer
//      fetch the provider_refresh_token. Skipped when APPLE_TEAM_ID /
//      APPLE_KEY_ID / APPLE_P8_PRIVATE_KEY / APPLE_CLIENT_ID are unset (Ryan
//      hasn't uploaded the .p8 yet); once set, a revoke failure ABORTS the
//      deletion so the user can retry (fail-safe: don't leave Apple tokens
//      alive after the account is gone — App Review 5.1.1(v)).
//   2. Delete RevenueCat customer (RC-2) — before the irreversible auth-user
//      delete. Skipped when REVENUECAT_SECRET_KEY is unset (RC-1 not done
//      yet); once set, a deletion failure ABORTS like the storage step
//      (fail-fatal — erasure must be complete, not best-effort).
//   3. Delete every object under `${userId}/` in the private `user-backups`
//      bucket (the encrypted user.db backup lives at `${userId}/user.db`).
//   4. Delete the auth user via the Admin API. This cascades to rows FK'd to
//      auth.users (ON DELETE CASCADE).
//
// Required function secrets (set via `supabase secrets set` — see README.md):
//   APPLE_TEAM_ID          — 10-char Apple Team ID (e.g. ABCDE12345)
//   APPLE_KEY_ID           — 10-char Services key ID from developer.apple.com
//   APPLE_P8_PRIVATE_KEY   — raw .p8 content (the "-----BEGIN PRIVATE KEY-----" block)
//   APPLE_CLIENT_ID        — "com.lexitap.app"
//   REVENUECAT_SECRET_KEY  — RevenueCat secret API key (sk_...)
//
// Runtime secrets (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)
// are injected automatically — no manual setup needed.
// The service-role key NEVER leaves this server-side function.

import { createClient } from 'npm:@supabase/supabase-js@2';

const BACKUP_BUCKET = 'user-backups';

// Minimal structural type covering the admin auth methods used by helpers.
// Exported so tests can build a compatible stub without importing the full SDK.
// Using the full SupabaseClient generic causes type-parameter conflicts when
// callers pass a `createClient(url, serviceKey)` (which infers different
// defaults). The helpers only call getUserById — narrowing keeps it simple.
export type AdminAuthClient = {
  auth: {
    admin: {
      getUserById: (id: string) => Promise<{
        data: {
          user: {
            identities?: Array<{
              provider: string;
              id: string;
              identity_data?: unknown;
            }>;
          } | null;
        } | null;
        error: { message?: string } | null;
      }>;
    };
  };
};
const APPLE_AUTH_BASE = 'https://appleid.apple.com';
const REVENUECAT_API_BASE = 'https://api.revenuecat.com';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ---------------------------------------------------------------------------
// AUTH-2: Apple Sign In token revocation
// ---------------------------------------------------------------------------

// Encode a Base64URL string without padding (required by JWT spec).
function toBase64Url(buf: Uint8Array | ArrayBuffer): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Mint a short-lived (180 s) ES256 client-secret JWT for Apple's token
// and revoke endpoints. Apple validates iss=teamId, sub=clientId, aud, exp.
export async function mintAppleClientSecret(
  teamId: string,
  keyId: string,
  clientId: string,
  p8Pem: string,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: 'ES256', kid: keyId };
  const payload = {
    iss: teamId,
    iat: now,
    exp: now + 180,
    aud: 'https://appleid.apple.com',
    sub: clientId,
  };

  const enc = new TextEncoder();
  const headerB64 = toBase64Url(enc.encode(JSON.stringify(header)));
  const payloadB64 = toBase64Url(enc.encode(JSON.stringify(payload)));
  const signingInput = `${headerB64}.${payloadB64}`;

  // Strip PEM armor and decode the raw DER key bytes.
  const pemBody = p8Pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');
  const keyBytes = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBytes.buffer,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );

  const sigBuf = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    enc.encode(signingInput),
  );

  return `${signingInput}.${toBase64Url(sigBuf)}`;
}

// Call Apple's /auth/revoke for one refresh_token.
// Throws on any non-2xx response.
export async function callAppleRevoke(
  refreshToken: string,
  clientSecret: string,
  clientId: string,
  appleAuthBase = APPLE_AUTH_BASE,
): Promise<void> {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    token: refreshToken,
    token_type_hint: 'refresh_token',
  });

  const res = await fetch(`${appleAuthBase}/auth/revoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Apple revoke failed ${res.status}: ${text}`);
  }
}

// Revoke all Apple Sign-In tokens for this user.
//
// Returns 'skipped' when secrets are not configured (log + continue deletion).
// Returns 'ok' when revocation succeeded (or user has no Apple identity).
// THROWS when secrets are configured and revocation fails — caller aborts.
export async function revokeAppleTokens(
  userId: string,
  admin: AdminAuthClient,
  appleAuthBase = APPLE_AUTH_BASE,
): Promise<'ok' | 'skipped'> {
  const teamId = Deno.env.get('APPLE_TEAM_ID');
  const keyId = Deno.env.get('APPLE_KEY_ID');
  const p8Key = Deno.env.get('APPLE_P8_PRIVATE_KEY');
  const clientId = Deno.env.get('APPLE_CLIENT_ID');

  if (!teamId || !keyId || !p8Key || !clientId) {
    console.warn(
      '[delete-account] Apple revoke secrets not configured — skipping ' +
        '(set APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_P8_PRIVATE_KEY, APPLE_CLIENT_ID)',
    );
    return 'skipped';
  }

  // Fetch the user's linked identities via the Admin API.
  const { data: userRecord, error: userLookupErr } =
    await admin.auth.admin.getUserById(userId);
  if (userLookupErr || !userRecord?.user) {
    throw new Error(`Failed to fetch user identities: ${userLookupErr?.message}`);
  }

  const appleIdentities = (userRecord.user.identities ?? []).filter(
    (id) => id.provider === 'apple',
  );

  if (appleIdentities.length === 0) {
    return 'ok'; // No Apple identity — nothing to revoke.
  }

  const clientSecret = await mintAppleClientSecret(teamId, keyId, clientId, p8Key);

  for (const identity of appleIdentities) {
    // Supabase stores Apple's refresh_token in identity_data as
    // provider_refresh_token (populated by Supabase Auth during SIWA).
    // Absent = Apple didn't provide one (old token or already revoked) — skip.
    const refreshToken =
      (identity.identity_data as Record<string, unknown> | undefined)
        ?.provider_refresh_token as string | undefined;
    if (!refreshToken) {
      console.warn(
        `[delete-account] Apple identity ${identity.id} has no provider_refresh_token — skipping`,
      );
      continue;
    }
    await callAppleRevoke(refreshToken, clientSecret, clientId, appleAuthBase);
  }

  return 'ok';
}

// ---------------------------------------------------------------------------
// RC-2: RevenueCat customer deletion
// ---------------------------------------------------------------------------

// Delete the RevenueCat customer whose app_user_id equals the Supabase user id
// (set via Purchases.logIn(supabaseUserId) in IAP-1).
//
// Returns 'skipped' when secret not configured. Returns 'ok' on success or 404
// (idempotent). THROWS on any other failure — caller aborts.
export async function deleteRevenueCatCustomer(
  userId: string,
  rcApiBase = REVENUECAT_API_BASE,
): Promise<'ok' | 'skipped'> {
  const rcKey = Deno.env.get('REVENUECAT_SECRET_KEY');
  if (!rcKey) {
    console.warn(
      '[delete-account] REVENUECAT_SECRET_KEY not configured — skipping RevenueCat deletion',
    );
    return 'skipped';
  }

  const url = `${rcApiBase}/v1/subscribers/${encodeURIComponent(userId)}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${rcKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (res.ok || res.status === 404) {
    return 'ok';
  }

  const text = await res.text().catch(() => '');
  throw new Error(`RevenueCat deletion failed ${res.status}: ${text}`);
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

// Guard with import.meta.main so test imports don't start the server.
// The Supabase Edge runtime always invokes the file as `main`, so this
// has no effect on deployed behaviour.
if (import.meta.main) Deno.serve(handleRequest);

export async function handleRequest(req: Request): Promise<Response> {
  // CORS preflight.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return json({ error: 'server_misconfigured' }, 500);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return json({ error: 'missing_authorization' }, 401);
  }

  // User-scoped client: identifies the caller from THEIR token. The id we
  // delete is taken from this verified result, not from any request body.
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return json({ error: 'invalid_token' }, 401);
  }
  const userId = userData.user.id;

  // Service-role client: performs the privileged deletions.
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // -------------------------------------------------------------------------
    // Step 1 — Apple token revocation (AUTH-2)
    // BEFORE the irreversible auth-user delete: once auth.users is gone,
    // admin.getUserById() can no longer fetch provider_refresh_token.
    // If secrets are configured and revoke fails, ABORT — leaving a live Apple
    // token on a deleted account violates App Review 5.1.1(v).
    // -------------------------------------------------------------------------
    try {
      await revokeAppleTokens(userId, admin);
    } catch (appleErr) {
      console.error('[delete-account] Apple revoke error — aborting:', appleErr);
      return json({ error: 'delete_failed' }, 500);
    }

    // -------------------------------------------------------------------------
    // Step 2 — RevenueCat customer deletion (RC-2)
    // Also before auth-user delete. Fail-fatal when secret is set so erasure
    // is complete, not best-effort.
    // -------------------------------------------------------------------------
    try {
      await deleteRevenueCatCustomer(userId);
    } catch (rcErr) {
      console.error('[delete-account] RevenueCat deletion error — aborting:', rcErr);
      return json({ error: 'delete_failed' }, 500);
    }

    // -------------------------------------------------------------------------
    // Step 3 — Storage clear
    // A missing folder lists empty (fine). List or remove failure is fatal so
    // we can retry while the user still exists (never orphan the blob under a
    // deleted auth.uid).
    // -------------------------------------------------------------------------
    const { data: objects, error: listErr } = await admin.storage
      .from(BACKUP_BUCKET)
      .list(userId, { limit: 100 });
    if (listErr) {
      return json({ error: 'delete_failed' }, 500);
    }

    if (objects && objects.length > 0) {
      const paths = objects.map((o) => `${userId}/${o.name}`);
      const { error: removeErr } = await admin.storage
        .from(BACKUP_BUCKET)
        .remove(paths);
      if (removeErr) {
        return json({ error: 'delete_failed' }, 500);
      }
    }

    // -------------------------------------------------------------------------
    // Step 4 — Auth-user delete (irreversible, LAST)
    // Idempotent: already-deleted user (retry cleared everything above but
    // failed mid-delete) is treated as success.
    // -------------------------------------------------------------------------
    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) {
      const msg = (delErr.message ?? '').toLowerCase();
      const alreadyGone =
        msg.includes('not found') || (delErr as { status?: number }).status === 404;
      if (!alreadyGone) {
        return json({ error: 'delete_failed' }, 500);
      }
    }

    return json({ success: true }, 200);
  } catch (_e) {
    return json({ error: 'internal_error' }, 500);
  }
}
