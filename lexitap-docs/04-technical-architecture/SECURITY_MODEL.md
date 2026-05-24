---
title: Security Model
category: technical
status: active
updated: 2026-05-24
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
- [Receipt and Entitlement Validation](#receipt-and-entitlement-validation)
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

Core principle: **the client is untrusted.** Anything that grants an entitlement, records a teacher advocate reward, or decrements a promo code is decided server-side. The client can read/write only its own rows, and only through RLS-enforced policies.

## Secrets Management

- **Dev:** secrets in a gitignored `.env` (Supabase URL, anon key, OAuth client IDs). Loaded via Expo config.
- **Production:** **EAS secrets** injected at build time. No secret is committed to the repo or baked into source.
- **No hardcoded secrets, ever** — enforced by convention and review.

What is and is not a secret:
- The **Supabase anon key is public** by design — it identifies the project, not a privileged actor. Data protection comes from RLS, not from hiding this key.
- **Store receipt-validation credentials, the Supabase service-role key, OAuth client secrets** are real secrets and live **only** in Supabase Edge Function environment config — never in the app binary, never in `.env` that ships.

## Authentication

- Supabase Auth handles **email + password** (Argon2/bcrypt hashing managed by Supabase) and **Google OAuth** (native ID-token flow).
- Sessions are JWTs; `auth.uid()` (the user's UUID) is the key every RLS policy checks.
- Auth is **optional**: the app is fully usable offline and pre-auth. Sign-in unlocks cross-device sync and purchase restore. No account is required to learn.
- Session refresh is transparent; on unrecoverable auth failure the app silently drops to signed-out/offline mode rather than blocking the user.

## Row-Level Security Policies

RLS is **enabled on every Supabase table**. Default-deny; explicit policies grant the minimum. Representative policies:

```sql
-- Users may read/write ONLY their own sync rows
ALTER TABLE user_progress_sync ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_progress ON user_progress_sync
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE user_entitlements_sync ENABLE ROW LEVEL SECURITY;
-- Clients may READ their entitlements but NOT self-grant:
CREATE POLICY read_own_entitlements ON user_entitlements_sync
  FOR SELECT USING (user_id = auth.uid());
-- INSERT/UPDATE only via service role (Edge Function after receipt validation)
CREATE POLICY service_writes_entitlements ON user_entitlements_sync
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE user_stats_sync ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_stats ON user_stats_sync
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE user_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_account ON user_accounts
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
```

Teacher/referral/promo tables are **not** client-writable. `referrals` and `promo_codes` decrements happen only in Edge Functions (service role); clients get read-only or no direct access. This prevents a tampered client from minting advocate rewards or infinite promo redemptions.

## Receipt and Entitlement Validation

Entitlements are money. They are **never** trusted from the client.

1. On purchase, the app sends the store receipt to the `validate_receipt` Edge Function ([API_CONTRACT.md](./API_CONTRACT.md#rpc-receipt-validation)).
2. The function validates against Apple/Google using server-held credentials.
3. On success, the function (service role) writes the entitlement to `user_entitlements_sync`; RLS blocks the client from doing this itself.
4. The client mirrors the now-verified entitlement into local `user_entitlements`.
5. On launch, invalid/refunded entitlements are re-validated and removed.

Referral and promo redemptions follow the same pattern: server-side, transactional, idempotent via unique keys (`receipt_id`) and decrement guards.

## Data at Rest and in Transit

- **In transit:** all Supabase traffic is TLS (HTTPS). No plaintext network paths.
- **At rest (device):** `user.db` holds only the user's own learning progress and entitlement records — low sensitivity. No passwords are stored on device (Supabase Auth manages credentials). We rely on OS-level app sandboxing and full-disk encryption (default on modern iOS/Android). We do **not** add app-level DB encryption (e.g., SQLCipher) at MVP — the asset value doesn't justify the complexity/cost; revisit if we ever store sensitive PII locally.
- **At rest (cloud):** Supabase-managed Postgres encryption at rest. We store minimal PII: email, display name, timezone. No payment card data ever touches our systems (handled by the app stores).
- **Content DB (`words.db`):** public, non-sensitive vocabulary content — no protection needed beyond not shipping copyrighted material (a content-pipeline concern).

## Threat Model

Sized for a ~$194 solo app whose primary asset is paid vocabulary content and non-cash advocate rewards.

| Threat | Likelihood | Mitigation |
|--------|-----------|------------|
| Cracked client self-grants entitlements | medium | Server-side receipt validation; RLS blocks client entitlement writes |
| Forged/replayed referral to mint advocate rewards | low-medium | Server-side `redeem_teacher_code`; `source_event_id` UNIQUE; rewards computed server-side |
| Promo code brute force / over-redemption | low-medium | Server-side decrement + active/expiry checks in one transaction |
| User reads another user's progress | low | RLS `user_id = auth.uid()` on all sync tables |
| Stolen anon key | n/a | Anon key is public by design; RLS is the real control |
| Leaked service-role key / store secret | low/high-impact | Kept only in Edge Function env; never in repo or binary; rotate if leaked |
| Pirated content extraction from binary | medium/low-impact | Accepted: free tiers are free anyway; paid content piracy is low-value to chase for a solo app |
| Account takeover | low | Delegated to Supabase Auth (hashing, OAuth); no custom auth code to get wrong |
| Local DB tampering | low | Only affects the tamperer's own device/progress; cloud re-validates entitlements |

## What We Deliberately Do Not Do

- No custom auth — Supabase Auth only (less code to get wrong).
- No app-level SQLite encryption at MVP (low asset value, OS sandbox + disk encryption suffice).
- No DRM / aggressive anti-tamper on bundled content (not worth the engineering cost for a solo app).
- No analytics/tracking SDKs requiring network in core flows (privacy + offline-first).
- No PII beyond email/display-name/timezone; no payment data handled by us.
- No background sync daemon or always-on connections (smaller attack surface, lower cost).

## Open Questions

- Whether to enforce email verification before enabling sync (leaning yes for abuse resistance, but it adds friction).
- Rate-limiting strategy for `redeem_promo` / `redeem_teacher_code` Edge Functions (Supabase-native limits vs in-function counters).
- Account-deletion data flow: RLS cascade delete vs an Edge Function sweep (see [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)).
