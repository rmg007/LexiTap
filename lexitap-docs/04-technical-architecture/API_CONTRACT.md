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
- [Sync: Push](#sync-push)
- [Sync: Pull](#sync-pull)
- [RPC: Receipt Validation](#rpc-receipt-validation)
- [RPC: Teacher Advocate Redemption](#rpc-teacher-advocate-redemption)
- [RPC: Promo Code Redemption](#rpc-promo-code-redemption)
- [Error Model](#error-model)
- [Retry Semantics](#retry-semantics)
- [Open Questions](#open-questions)

---

## Client and Transport

All calls go through `@supabase/supabase-js`, configured with the public anon key and project URL (injected via EAS secrets / `.env`, never hardcoded). The anon key is a public identifier; data protection is RLS, not key secrecy. The Supabase client lives in `src/infrastructure/sync/` and is never imported by `domain/` or `application/`.

Auth uses Supabase Auth (email + Google OAuth). An authenticated session carries a JWT whose `sub` is the `user_accounts.id` (UUID), which every RLS policy keys on via `auth.uid()`.

## Auth Operations

| Operation | Method | Notes |
|-----------|--------|-------|
| Sign up (email) | `supabase.auth.signUp({ email, password })` | Creates auth user; trigger inserts `user_accounts` row |
| Sign in (email) | `supabase.auth.signInWithPassword({ email, password })` | Returns session JWT |
| Sign in (Google) | `supabase.auth.signInWithIdToken({ provider: 'google', token })` | Native Google flow |
| Sign out | `supabase.auth.signOut()` | Local data remains |
| Get session | `supabase.auth.getSession()` | Used on launch to decide pull |

On first successful sign-in the client writes the device's IANA timezone (AsyncStorage source of truth) to `user_accounts.timezone`. Auth is optional for using the app — sync and account are value-adds; the app works fully offline and pre-auth.

```ts
// Response shape (success)
{ data: { user: { id: UUID, email }, session: { access_token, ... } }, error: null }
// Failure
{ data: { user: null, session: null }, error: { name, message, status } }
```

## Sync: Push

Triggered on app close (and opportunistically). Upserts changed local rows into the cloud mirrors. Idempotent — safe to retry.

```ts
// PUSH user_progress (only rows changed since last sync cursor)
await supabase.from('user_progress_sync').upsert(
  changedRows.map(r => ({ user_id, ...r, synced_at: new Date().toISOString() })),
  { onConflict: 'user_id,word_id' }
);

await supabase.from('user_entitlements_sync').upsert(entitlements, { onConflict: 'user_id,tier_id' });
```

`SupabaseSyncService` currently pushes `user_progress_sync` and `user_entitlements_sync` only. `user_stats_sync` is a planned mirror of the streak/totals subset of local `user_stats`; the forgiveness freeze fields are device-only and never synced (see [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md#supabase-sync-mirror-tables)).

**Request row shape (`user_progress_sync`):** `{ user_id: UUID, word_id: string, mastery_level: int, next_review_date: bigint, last_reviewed_at: bigint, consecutive_correct: int, total_attempts: int, total_correct: int, first_seen_at: bigint, synced_at: ISO }`.

The local sync cursor (last successful push timestamp) lives in AsyncStorage; only rows with `last_reviewed_at > cursor` are pushed. Conflict policy is last-write-wins by `last_reviewed_at` — resolved client-side on pull, so the cloud upsert is a blind overwrite of the user's own rows (RLS guarantees you can only write your own).

## Sync: Pull

Triggered on app open. Fetches cloud mirrors and merges into local SQLite (last-write-wins by `last_reviewed_at`; cloud wins only if newer).

```ts
const { data: progress } = await supabase.from('user_progress_sync').select('*').eq('user_id', uid);
const { data: ents }     = await supabase.from('user_entitlements_sync').select('*').eq('user_id', uid);
// progress merges last-write-wins by last_reviewed_at; entitlements are additive.
// user_stats_sync pull is planned (streak/totals subset) — not yet implemented.
```

The `.eq('user_id', uid)` filter is defense-in-depth; RLS already restricts rows to the caller. Merge logic is in `SyncProgressUseCase` (application layer); the Supabase calls themselves are in the infrastructure adapter.

## RPC: Receipt Validation

Store receipt validation requires a trusted secret (App Store / Play credentials) that must never ship in the app. Runs as a **Supabase Edge Function**, not table access.

```
POST  rpc: validate_receipt
body:   { platform: 'ios'|'android', product_id: string, receipt: string }
returns:{ valid: boolean, tier_id: string, expires_at: bigint | null }
```

On `valid: true` the function writes the verified entitlement to `user_entitlements_sync` server-side (the client cannot self-grant entitlements; RLS denies client writes that don't originate from a validated receipt). The client then mirrors the granted entitlement into local `user_entitlements`.

## RPC: Teacher Advocate Redemption

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

```
POST  rpc: redeem_promo
body:   { code: string }
returns:{ accepted: boolean, type: 'free_module'|'free_premium', free_product_id: string|null }
side-effects (server-side, transactional):
  - check is_active AND uses_remaining > 0 AND (expires_at IS NULL OR expires_at > now())
  - UPDATE promo_codes SET uses_remaining -= 1, uses_count += 1
  - grant entitlement to user_entitlements_sync
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

- Whether receipt validation and referral/promo run as Postgres RPC (security definer) functions or Edge Functions — leaning Edge Functions for the ones holding store secrets, RPC for pure-DB logic.
- Exact JWT refresh window and whether to pre-emptively refresh on launch.
