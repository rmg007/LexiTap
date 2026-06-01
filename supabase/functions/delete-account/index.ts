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
// Steps (both idempotent — safe to retry):
//   1. Delete every object under `${userId}/` in the private `user-backups`
//      bucket (the encrypted user.db backup lives at `${userId}/user.db`).
//   2. Delete the auth user via the Admin API. This cascades to rows FK'd to
//      auth.users (ON DELETE CASCADE).
//
// Runtime secrets (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)
// are injected automatically into every deployed function — no manual secret
// setup. The service-role key NEVER leaves this server-side function.

import { createClient } from 'npm:@supabase/supabase-js@2';

const BACKUP_BUCKET = 'user-backups';

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

Deno.serve(async (req: Request): Promise<Response> => {
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
    // Misconfiguration — never reveal which var is missing.
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
    // ORDER IS LOAD-BEARING: clear storage FIRST and only destroy the auth
    // identity once the backup blob is provably gone. The auth delete is
    // irreversible, and once it lands getUser() 401s so this function can never
    // run again for this id — anything left behind becomes an UNRECOVERABLE
    // orphan (the bucket's RLS scopes the object to a now-deleted auth.uid()).
    // So storage-clear failure is treated as FATAL: we return 500 and let the
    // client retry WHILE THE USER STILL EXISTS, rather than reporting success
    // with the encrypted user.db still sitting in the bucket (LEGAL-4 erasure
    // must be complete, not best-effort).

    // 1. List the user's backup objects. A missing folder lists empty (fine);
    //    a transient list failure is fatal — we cannot prove storage is clear.
    const { data: objects, error: listErr } = await admin.storage
      .from(BACKUP_BUCKET)
      .list(userId, { limit: 100 });
    if (listErr) {
      return json({ error: 'delete_failed' }, 500);
    }

    // 2. Remove them. If remove fails, ABORT before touching the auth user so
    //    the whole flow can be retried; never orphan the blob.
    if (objects && objects.length > 0) {
      const paths = objects.map((o) => `${userId}/${o.name}`);
      const { error: removeErr } = await admin.storage
        .from(BACKUP_BUCKET)
        .remove(paths);
      if (removeErr) {
        return json({ error: 'delete_failed' }, 500);
      }
    }

    // 3. Storage is provably clear — NOW delete the auth user (irreversible,
    //    last). Idempotent: an already-deleted user (e.g. a retry that cleared
    //    storage but failed mid-delete last time) is treated as success.
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
});
