# delete-account Edge Function

Permanently erases a calling user's account and all associated data.
Invoked client-side via `supabase.functions.invoke('delete-account')`.

## Deletion order (load-bearing — do not reorder)

| Step | What | Why order matters |
|------|------|-------------------|
| 1 | Revoke Apple Sign-In token (AUTH-2) | Must happen before step 4 — once `auth.users` is deleted `admin.getUserById()` can no longer retrieve `provider_refresh_token`. Leaving a live Apple token on a deleted account violates App Review guideline 5.1.1(v). |
| 2 | Delete RevenueCat customer (RC-2) | Before auth-user delete; fail-fatal when secret is set so erasure is complete. |
| 3 | Clear `user-backups` storage bucket | Before auth-user delete; once the auth row is gone the RLS-scoped objects become unrecoverable orphans. |
| 4 | Delete auth user (irreversible) | Last. Cascades to all FK'd rows. Idempotent (404 → treat as success). |

## Secrets Ryan must set

Run these once, before deploying a build that enables Sign in with Apple / after RC-1 is done.

```bash
# --- AUTH-2: Apple token revocation ---

# 1. Create a "Sign in with Apple" Services key at:
#    developer.apple.com > Certificates, Identifiers & Profiles > Keys
#    Enable "Sign in with Apple", set primary app ID = com.lexitap.app
#    Download the .p8 file (you can only download it once).

# 2. Note the Key ID (10 chars shown on the key detail page).

# 3. Your Team ID is the 10-char string in the top-right corner of
#    developer.apple.com (or in app.config.ts → appleTeamId).

supabase secrets set \
  APPLE_TEAM_ID="<your-10-char-team-id>" \
  APPLE_KEY_ID="<10-char-key-id-from-developer-portal>" \
  APPLE_CLIENT_ID="com.lexitap.app" \
  APPLE_P8_PRIVATE_KEY="$(cat /path/to/AuthKey_<KEYID>.p8)"

# --- RC-2: RevenueCat customer deletion ---

# Find the secret key at:
#   app.revenuecat.com > Project Settings > API Keys > Secret keys (sk_...)
# This is the SECRET key (not the public key used in the app).

supabase secrets set \
  REVENUECAT_SECRET_KEY="sk_..."
```

### Fail-safe / fail-open behaviour when secrets are unset

| Secret(s) | Behaviour |
|-----------|-----------|
| `APPLE_*` unset | Apple revocation is **skipped** (logged). Deletion still completes. Safe while SIWA is not yet shipped. |
| `REVENUECAT_SECRET_KEY` unset | RC deletion is **skipped** (logged). Deletion still completes. Safe while RC-1 is not yet done. |
| Any secret set + API call fails | Deletion **aborts** with `delete_failed`. Client can retry. |

## Running tests locally

Requires [Deno](https://deno.land/):

```bash
deno test --allow-env --node-modules-dir=auto \
  supabase/functions/delete-account/index.test.ts
```

Expected: **15 passed, 0 failed**.

## Deploying

```bash
supabase functions deploy delete-account
```

Do **not** deploy until the project is on the Supabase Pro plan (SUPA-1) — the
free tier pauses idle projects (NXDOMAIN, not 5xx), which silently breaks auth
and deletion for TestFlight users.
