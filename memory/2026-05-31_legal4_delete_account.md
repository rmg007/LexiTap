---
name: legal4-delete-account
description: LEGAL-4 delete account flow — AuthPort, SupabaseAuthService, container wiring, SettingsScreen modal
metadata:
  type: project
---

Commit `59554c8` — LEGAL-4 delete account (Apple 5.1.1(v) compliance).

**Why:** Apple App Store requires an in-app account deletion path. Submission blocked until it exists.

**What shipped:**
- `AuthPort.deleteAccount()` — new port method (returns `Result`)
- `SupabaseAuthService.deleteAccount()` — calls Supabase Edge Function `delete-account`, maps errors (404→network, 429→rate_limited, 5xx→network, throw→network); signs out on success
- `StubAuthService.deleteAccount()` — signs out in-memory, returns `ok()`
- `Services.auth: AuthPort` + `Services.clearUserData()` added to `ServicesContext` and wired in `container.ts`
- `clearUserData()` in container: transaction-deletes all user.db tables + `AsyncStorage.multiRemove` for all `lexitap.*` keys
- `SettingsScreen`: Delete Account button → `Modal` with 30s countdown → confirm button enables → `deleteAccount()` + `clearUserData()` → `router.replace('/onboarding')`
- 12 new tests; 338 total green

**How to apply:** When working on auth/deletion/settings screens, this wiring is in place. `not_configured` result from `deleteAccount()` is safe — UI still clears local data and navigates.

**Pending backend task (NOT code — infra):**
- Deploy Supabase Edge Function `delete-account` that calls the Supabase Admin API to delete `auth.uid()`. Until deployed, `SupabaseAuthService.deleteAccount()` returns `network` error and the UI shows retry.

**Stale note fixed:** PostHog EU host was already correct (`PostHogAnalyticsService.ts:17`) — the "US→EU host bug" in prior session notes was already resolved before this session.

**AsyncStorage key duplication:** `ASYNC_STORAGE_KEYS` in `container.ts` mirrors the `KEYS` const in `AsyncStorageAdapter.ts`. If new keys are added to `AsyncStorageAdapter`, also add them to `container.ts`.
