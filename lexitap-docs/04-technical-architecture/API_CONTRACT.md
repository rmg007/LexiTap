---
title: API Contract and Supabase Interface
category: technical
status: active
updated: 2026-05-24
priority: P1
tags: [api, supabase, auth, sync, rpc, referral, promo, errors, retry, contract]
---

# API Contract and Supabase Interface

LexiTap has **no custom backend server** (see [TECH_STACK_DECISIONS.md](./TECH_STACK_DECISIONS.md#tsd-005-no-backend-server-at-mvp)). The "API" is the Supabase client surface: Auth, RLS-protected table access (PostgREST), and a small set of Postgres RPC / Edge Functions for operations that need server trust. This document is the contract: operations, request/response shapes, error handling, and retry semantics. All table-level access is gated by Row-Level Security ([SECURITY_MODEL.md](./SECURITY_MODEL.md)).

## Table of Contents

- [Client and Transport](#client-and-transport)
- [Auth Operations](#auth-operations)
- [Backup: Upload](#backup-upload)
- [Backup: Restore](#backup-restore)
- [RPC: Receipt Validation](#rpc-receipt-validation)
- [RPC: Teacher Advocate Redemption](#rpc-teacher-advocate-redemption) *(Phase 3+)*
- [RPC: Promo Code Redemption](#rpc-promo-code-redemption) *(Phase 3+)*
- [Error Model](#error-model)
- [Retry Semantics](#retry-semantics)
- [Open Questions](#open-questions)

---

## Client and Transport

All calls go through `@supabase/supabase-js`, configured with the public anon key and project URL (injected via EAS secrets / `.env`, never hardcoded). The anon key is a public identifier; data protection is RLS, not key secrecy. The Supabase client lives in `src/infrastructure/sync/` and is never imported by `domain/` or `application/`.

Auth uses Supabase Auth (Email Magic-Link + Google OAuth + Apple Sign-In). An authenticated session carries a JWT whose `sub` is the `user_accounts.id` (UUID), which every RLS policy keys on via `auth.uid()`.

## Auth Operations

| Operation | Method | Notes |
|-----------|--------|-------|
| Sign in / up (Email Magic-Link) | `supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })` | Sends Magic-Link email; trigger inserts `user_accounts` row on new signup |
| Sign in (Google) | `supabase.auth.signInWithIdToken({ provider: 'google', token })` | Native Google flow |
| Sign in (Apple) | `supabase.auth.signInWithIdToken({ provider: 'apple', token })` | Native Apple flow (mandatory on iOS if any social login offered) |
| Sign out | `supabase.auth.signOut()` | Local data remains |
| Get session | `supabase.auth.getSession()` | Used on launch to decide pull |

On first successful sign-in the client writes the device's IANA timezone (AsyncStorage source of truth) to `user_accounts.timezone`. Auth is optional for using the app — sync and account are value-adds; the app works fully offline and pre-auth.

```ts
// Response shape (success)
{ data: { user: { id: UUID, email }, session: { access_token, ... } }, error: null }
// Failure
{ data: { user: null, session: null }, error: { name, message, status } }
```

## Backup: Upload

Triggered opportunistically (on app background / account sign-in). The entire `user.db` is AES-256 encrypted with a per-user key stored in Supabase Vault, then uploaded as an object to the `user_db_backups` Storage bucket at path `{user_id}/user.db.enc`. The operation is idempotent — safe to retry; overwrites the single backup object. The device is always the authority; the cloud blob is a restore aid, not a live mirror.

```ts
// Pseudocode — actual implementation in infrastructure/sync/BackupService.ts (Phase 3)
const encrypted = await encryptWithVaultKey(userId, await readLocalDb());
await supabase.storage.from('user_db_backups').upload(`${userId}/user.db.enc`, encrypted, { upsert: true });
```

Per-table sync mirror tables (`user_progress_sync`, `user_entitlements_sync`, `user_stats_sync`) were removed in v3.0. There is no row-level push/pull.

## Backup: Restore

Triggered when a signed-in user installs on a new device and has no local `user.db`. Downloads the blob, decrypts it, and initialises the local database from it. Falls back to empty schema + onboarding if no backup exists.

## RPC: Receipt Validation

RevenueCat handles store receipt validation server-side. The app never calls App Store / Play Store receipt endpoints directly. On purchase:

1. RevenueCat SDK validates the receipt and returns a `CustomerInfo` object.
2. The app reads entitlement state directly from `CustomerInfo` — **never** writes it to `user.db`.
3. Entitlement state is cached in memory only; re-fetched on each session start.

The `validate_receipt` Edge Function described in earlier versions was superseded by RevenueCat in v3.0. No server-side entitlement write to `user_entitlements_sync` occurs.

## RPC: Teacher Advocate Redemption

> **STATUS: Phase 3+ (not implemented in v1).** Teacher referral and advocate reward mechanics are deferred. See `plans/full-cleanup-2026-05-28.md`.

Recording a teacher-code redemption and reward eligibility must be server-authoritative to prevent client tampering. Postgres RPC / Edge Function:

```
POST  rpc: redeem_teacher_code
body:   { teacher_code: string, source_event_id: string }
returns:{ accepted: boolean, premium_trial_days: integer, reward_status: 'pending'|'not_applicable' }
side-effects (server-side, transactional):
  - INSERT referrals (teacher attribution + reward status)
  - GRANT extended Premium trial entitlement when eligible
  - UPDATE teachers SET total_active_referrals += 1, reward_credits = ...
constraints: source_event_id is UNIQUE → duplicate redemption rejected
```

Reward eligibility is derived from server-side teacher and learner activity state; the client never sends or computes reward credits. See [../01-discovery-strategy/GO_TO_MARKET_STRATEGY.md](../01-discovery-strategy/GO_TO_MARKET_STRATEGY.md) for the advocate program rules.

## RPC: Promo Code Redemption

> **STATUS: Phase 3+ (not implemented in v1).** Promo code mechanics are deferred. v1 uses App Store IAP via RevenueCat only.

```
POST  rpc: redeem_promo
body:   { code: string }
returns:{ accepted: boolean, type: 'free_module'|'free_premium', free_product_id: string|null }
side-effects (server-side, transactional):
  - check is_active AND uses_remaining > 0 AND (expires_at IS NULL OR expires_at > now())
  - UPDATE promo_codes SET uses_remaining -= 1, uses_count += 1
  - grant entitlement via RevenueCat (user_entitlements_sync removed in v3.0)
```

All validation (active, not expired, uses remaining) happens server-side in one transaction to prevent race-condition over-redemption.

## Error Model

Supabase client calls return `{ data, error }`. Map errors to a domain-level taxonomy in the infrastructure adapter so the application layer never sees Supabase types:

| Class | Trigger | App behavior |
|-------|---------|--------------|
| `NetworkError` | offline, timeout, DNS | Silent no-op for sync (offline-first); queue for next attempt |
| `AuthError` | expired/invalid JWT (401) | Refresh session; if refresh fails, treat as signed-out |
| `PermissionError` | RLS denial (403) | Log; never retry blindly (indicates a bug or tamper) |
| `ConflictError` | unique violation (e.g. duplicate `receipt_id`) | Treat as already-processed; success-equivalent |
| `ValidationError` | bad RPC input (4xx) | Surface to user (e.g. invalid promo code) |
| `ServerError` | 5xx | Retry with backoff |

```ts
type SyncResult =
  | { ok: true }
  | { ok: false; kind: 'network'|'auth'|'permission'|'conflict'|'validation'|'server'; message: string };
```

## Retry Semantics

- **Sync (push/pull):** never blocks the user. On `NetworkError` or `ServerError`, no immediate retry loop — retry on the next app open. Sync is fully idempotent (upsert + cursor), so dropped/duplicate pushes are harmless.
- **RPCs (receipt/referral/promo):** at-most-once user intent, made idempotent by unique keys (`receipt_id`) and server-side decrement guards. Client may retry on `NetworkError`/`ServerError` with capped exponential backoff (e.g. 1s, 2s, 4s, max 3 attempts); a `ConflictError` on retry is treated as success.
- **Auth:** one transparent session refresh on 401; if it fails, drop to signed-out state and continue offline.
- No background daemon, no persistent retry queue beyond the AsyncStorage sync cursor — right-sized for ~1,000 users and the realistic ~$194 first-year cash outlay.

## Open Questions

- `requires-implementation-spike` — Whether receipt validation and referral/promo RPCs run as Postgres RPC (security definer) functions or Edge Functions — leaning Edge Functions for the ones holding store secrets, RPC for pure-DB logic.
- `requires-product-decision` — Exact JWT refresh window and whether to pre-emptively refresh on launch.
