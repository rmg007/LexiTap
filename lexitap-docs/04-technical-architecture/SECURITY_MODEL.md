---
title: Security Model
category: technical
status: active
updated: 2026-05-31
priority: P0
tags: [security, secrets, rls, receipt-validation, auth, threat-model, data-at-rest, eas]
---

# Security Model

The security posture for LexiTap: a solo-founder, offline-first ESL app with no custom server and a realistic ~$194 first-year cash outlay. Security is delivered through three pillars — secrets discipline, Supabase Row-Level Security, and server-side validation of anything that grants money or entitlements. The threat model is sized for the asset value: there are no high-value secrets in the app, and the local DB holds only the user's own learning progress.

## Table of Contents

- [Trust Boundaries](#trust-boundaries)
- [Secrets Management](#secrets-management)
- [Authentication](#authentication)
- [Row-Level Security Policies](#row-level-security-policies)
- [Entitlement-Grant Authority Matrix](#entitlement-grant-authority-matrix)
- [Receipt Validation](#receipt-validation)
- [Data at Rest and in Transit](#data-at-rest-and-in-transit)
- [Threat Model](#threat-model)
- [What We Deliberately Do Not Do](#what-we-deliberately-do-not-do)
- [Open Questions](#open-questions)

---

## Trust Boundaries

```
 [ user device ]            [ network ]            [ Supabase managed ]
  app code (untrusted)  ──TLS──▶  Auth/JWT  ──▶  Postgres + RLS (trusted)
  user.db (user's own)               │            Edge Functions (trusted,
  words.db (public content)          │             hold store secrets)
                                     ▼
                          everything from the client is untrusted;
                          RLS + Edge Functions are the trust boundary
```

Core principle: **the client is untrusted.** Anything that affects billing (IAP receipts) or content-error reports is validated server-side. The client can read/write only its own rows, enforced by RLS.

## Secrets Management

- **Dev:** secrets in a gitignored `.env` (Supabase URL, anon key, OAuth client IDs). Loaded via Expo config.
- **Production:** **EAS secrets** injected at build time. No secret is committed to the repo or baked into source.
- **No hardcoded secrets, ever** — enforced by convention and review.

What is and is not a secret:
- The **Supabase anon key is public** by design — it identifies the project, not a privileged actor. Data protection comes from RLS, not from hiding this key.
- **Store receipt-validation credentials, the Supabase service-role key, OAuth client secrets** are real secrets and live **only** in Supabase Edge Function environment config — never in the app binary, never in `.env` that ships.

## Authentication

- Supabase Auth handles **email magic-link** (`signInWithOtp` — no password is ever typed or stored), **Google OAuth** (native ID-token flow), and **Sign in with Apple** (mandatory on iOS once Google is offered, Guideline 4.8).
- Sessions are JWTs; `auth.uid()` (the user's UUID) is the key every RLS policy checks.
- Auth is **optional**: the app is fully usable offline and pre-auth. Sign-in unlocks cross-device sync and purchase restore. No account is required to learn.
- Session refresh is transparent; on unrecoverable auth failure the app silently drops to signed-out/offline mode rather than blocking the user.

## Row-Level Security Policies

RLS is **enabled on every Supabase table**. Default-deny; explicit policies grant the minimum. Representative policies:

```sql
-- Users may read/write ONLY their own account row
ALTER TABLE user_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_account ON user_accounts
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Supabase Storage: user_db_backups bucket
-- Each user's backup object lives at path: {user_id}/user.db
-- Bucket policy restricts reads and writes to objects whose path prefix matches auth.uid()::text.
-- Confidentiality comes from RLS path-scoping + Supabase Storage server-side encryption at rest.
-- No client-side AES / Vault key at MVP (user.db is low-sensitivity progress data) — see Backup below.
-- content_errors is service-role-write only (written by the Edge Function after deduplication).
```

Per-table sync mirror tables (`user_progress_sync`, `user_entitlements_sync`, `user_stats_sync`) were removed in v3.0. Cloud state is a single encrypted blob backup of `user.db` in Supabase Storage — no per-row RLS is needed for sync data.

Teacher/referral/promo tables are deferred to Phase 3. When implemented, they will not be client-writable; decrements happen only in Edge Functions (service role).

## Entitlement-Grant Authority Matrix

All paths that grant paid access must go through server-side validation. The client can never self-grant.

| Grant source | User-facing entry | Validation authority | Local persistence |
|---|---|---|---|
| Store one-time IAP (exam pack / All-Exams bundle) | Paywall / Restore Purchases | RevenueCat SDK (server-side) | Memory only; re-queried each session. Never written to `user.db`. |
| B2B institutional seat token | Seat-token activation | Supabase Edge Function (service-role token validation) | Local flag in `user.db` after accepted (Phase 3+) |
| Teacher advocate trial | Teacher code redemption | Supabase RPC `redeem_teacher_code` with `source_event_id` idempotency | After accepted (Phase 3+) |
| Promo code | Promo screen | Supabase RPC `redeem_promo` with server-side decrement guard | After accepted (Phase 3+) |

**Core invariant:** entitlement state is never derived from local `user.db` alone. RevenueCat is re-queried on session start; the result is memory-cached. Local `user.db` must never be the grant authority.

## Receipt Validation

Entitlements are money. They are **never** trusted from the client.

**Core invariants:**
- Entitlement state is **never** persisted to `user.db`. RevenueCat is the source of truth for access control.
- The app queries RevenueCat at session start and caches the result in memory only.
- On purchase: RevenueCat validates the receipt server-side and returns a `CustomerInfo` object; the app gates content on that result only.

1. On purchase, the app sends the store receipt to the `validate_receipt` Edge Function ([API_CONTRACT.md](./API_CONTRACT.md#rpc-receipt-validation)).
2. The function validates against Apple/Google using server-held credentials.
3. On success, RevenueCat returns a verified `CustomerInfo`; the app unlocks content in memory.
4. On launch, the app re-queries RevenueCat to refresh the cached entitlement state.

## Data at Rest and in Transit

- **In transit:** all Supabase traffic is TLS (HTTPS). No plaintext network paths.
- **At rest (device):** `user.db` holds only the user's own learning progress — low sensitivity. No entitlement data is persisted locally. No passwords are stored on device (Supabase Auth manages credentials). We rely on OS-level app sandboxing and full-disk encryption (default on modern iOS/Android). We do **not** add app-level DB encryption (e.g., SQLCipher) at MVP — the asset value doesn't justify the complexity/cost; revisit if we ever store sensitive PII locally.
- **At rest (cloud):** Supabase-managed Postgres encryption at rest. We store minimal PII: email, display name, timezone. No payment card data ever touches our systems (handled by the app stores).
- **Content DB (`words.db`):** public, non-sensitive vocabulary content — no protection needed beyond not shipping copyrighted material (a content-pipeline concern).

## Threat Model

Sized for a ~$194 solo app whose primary asset is paid vocabulary content and non-cash advocate rewards.

| Threat | Likelihood | Mitigation |
|--------|-----------|------------|
| Cracked client self-grants entitlements | medium | RevenueCat server-side receipt validation; app never persists entitlements locally |
| Forged referral/promo (Phase 3) | low-medium | Edge Function server-side; `source_event_id` UNIQUE; rewards computed server-side |
| Promo code brute force / over-redemption | low-medium | Server-side decrement + active/expiry checks in one transaction |
| User reads another user's progress | low | RLS `user_id = auth.uid()` on all sync tables |
| Stolen anon key | n/a | Anon key is public by design; RLS is the real control |
| Leaked service-role key / store secret | low/high-impact | Kept only in Edge Function env; never in repo or binary; rotate if leaked |
| Pirated content extraction from binary | medium/low-impact | Accepted: free tiers are free anyway; paid content piracy is low-value to chase for a solo app |
| Account takeover | low | Delegated to Supabase Auth (hashing, OAuth); no custom auth code to get wrong |
| Local DB tampering | low | Only affects the tamperer's own device/progress; RevenueCat re-validates on next launch |

## What We Deliberately Do Not Do

- No custom auth — Supabase Auth only (less code to get wrong).
- No app-level SQLite encryption at MVP (low asset value, OS sandbox + disk encryption suffice).
- No DRM / aggressive anti-tamper on bundled content (not worth the engineering cost for a solo app).
- No analytics/tracking SDKs requiring network in core flows (privacy + offline-first).
- No PII beyond email/display-name/timezone; no payment data handled by us.
- No background sync daemon or always-on connections (smaller attack surface, lower cost).

## Open Questions

- `requires-product-decision` — Whether to enforce email verification before enabling sync (leaning yes for abuse resistance, but adds friction).
- `deferred` — Rate-limiting strategy for `redeem_promo` / `redeem_teacher_code` Edge Functions (Phase 3+).
- `unresolved` — Account-deletion data flow: RLS cascade delete vs Edge Function sweep (see [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)).
