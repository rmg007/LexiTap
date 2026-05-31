---
status: "complete"
last_updated: "2026-05-31"
audience: ["App Store reviewers", "users", "developers", "legal/compliance"]
purpose: "Apple 5.1.1 requirement: account deletion flow accessible within app (not just email). Canonical for in-app implementation and support handling."
---

# Account Deletion

**Last updated:** 31 May 2026

---

## Overview

Users have the right to delete their account and all associated data at any time. Deletion is **user-initiated** (via Settings → Delete Account) or **system-initiated** (if age verification fails post-signup).

---

## User-initiated deletion

### Access path

1. Open **Settings** (bottom-right)
2. Scroll to **Delete Account**
3. Tap the button
4. **Confirmation sheet** appears: "Delete account and all data?"
5. Confirm → account and backups deleted (30-second grace period, then irreversible)

### What gets deleted

- **Immediately:**
  - Supabase auth account (email, credentials)
  - All encrypted backups (user.db copies in Supabase Storage)
  - Analytics pseudonymous ID mapping (can't re-identify future sessions)

- **Retained on device (user choice):**
  - Local device progress (user.db) — only deleted if user uninstalls app
  - Crash reports already sent (owned by Sentry, governed by their retention policy)

### Grace period (30 seconds)

After tapping "Delete", a 30-second grace period allows the user to tap "Cancel" before the action is irreversible. This is friendly UX and covers scenarios where a child accidentally taps delete.

After 30 seconds:
- API call fires: `DELETE /api/user/{user_id}`
- Supabase: removes auth user + associated Storage backups
- Backend: marks user as deleted (soft-delete, not purged from analytics logs yet)

---

## System-initiated deletion

### Trigger: Age verification failure (post-signup)

If during the onboarding flow (age gate O-0) or later account review, LexiTap determines a user is under 13:

1. **In-app notice:** "Your account does not meet age requirements and has been deleted."
2. **Email notice (if email on file):** Confirmation that deletion completed
3. **Data immediately deleted:**
   - Auth account
   - All backups
   - All account-linked analytics (if any)

This ensures COPPA (Children's Online Privacy Protection Act) and GDPR compliance for under-13 users.

---

## Grace period rationale

### Why 30 seconds?

- **Accident recovery:** Covers the case where a user (esp. teen) taps delete unintentionally
- **Family device safety:** Allows a parent to intervene if a child deletes their account
- **Reversibility:** Still fully reversible (no data loss yet)
- **Compliance:** Apple and GDPR don't require instant permanent deletion; "within a reasonable time" is acceptable

### After 30 seconds

Data deletion is **permanent and unrecoverable** (backups and auth records deleted from Supabase). The user may re-sign up and start fresh, but cannot recover the previous account.

---

## What data is affected

### Deleted by account deletion

| Data | Location | Deleted? |
|------|----------|----------|
| Email / credentials | Supabase Auth | ✓ Yes |
| Encrypted backups (user.db) | Supabase Storage | ✓ Yes (all copies) |
| Analytics pseudonymous ID | PostHog (after account deletion event sent) | ✓ Yes (ID unmapped, no future tracking) |
| Crash reports already sent | Sentry | ✗ No (owned by Sentry; see retention below) |

### Not deleted by account deletion

| Data | Why | Governance |
|------|-----|-----------|
| Local progress on device (user.db) | User still owns the device | User must uninstall app to remove |
| Sentry crash logs | Third-party service; user does not have direct deletion rights | Governed by Sentry's 90-day retention policy (or less if Sentry purges) |
| PostHog analytics (already sent) | Already anonymized (no email/ID link); sent before deletion | Governed by PostHog's 90-day retention (events de-identified by then) |

---

## Implementation checklist (Developer)

- [ ] **Settings screen:** Add "Delete Account" button at bottom of Privacy section
  - Visible only if user is logged in
  - Tap → confirmation sheet → 30-second countdown
  - Countdown timer visible or just "Cancel" button available?
  - (Recommend: simple "Cancel" button, auto-delete after 30s)

- [ ] **Confirmation sheet:**
  - Title: "Delete your account?"
  - Body: "This will delete your account, backups, and all data. You can't undo this."
  - Buttons: "Cancel" (dismisses), "Delete" (starts countdown)

- [ ] **Countdown state:**
  - Display message: "Deleting in 10 seconds... Tap to cancel" (or just auto-delete)
  - Cancel button remains active for 30 seconds
  - After 30s, no more cancel option, API call fires

- [ ] **API call:**
  - Endpoint: `DELETE /api/user/delete` (authenticated, requires current session)
  - Payload: optional reason/feedback (not required)
  - Response: `{ success: true, message: "Account deleted" }`
  - On error: show toast, allow retry

- [ ] **Post-deletion:**
  - Clear local auth token
  - Route user to age gate (O-0) to sign up again if desired
  - Optional: show message "Account deleted. You can sign up again anytime."

- [ ] **Edge cases:**
  - User deletes account, then force-closes app mid-deletion → next launch checks auth, sees no session, routes to age gate
  - User deletes account on one device, other devices still have cached session → sessions expire on next app open or within 1 hour
  - User deletes account, then immediately re-signs up with same email → new account created, no data from old account

---

## Support flow

### User emails support@lexitap.app: "Delete my account"

**Response:**
> Thanks for reaching out. You can delete your account directly in the app:
> 1. Open **Settings** (bottom-right)
> 2. Scroll to **Delete Account**
> 3. Confirm the prompt
>
> Your account and backups will be deleted immediately. If you have trouble, reply and I'll help.

### User emails: "I accidentally deleted my account. Can you restore it?"

**Response (if within 30 days):**
> Apologies! If we still have a backup of your data, I can help restore it. Let me check...
> 
> (Admin: Check Supabase Storage for recent user.db backups under that user_id. If found within 30-day grace, can offer temporary restoration or data export.)

**Response (if after 30 days):**
> Unfortunately, the account and all backups have been permanently deleted and can't be recovered. You're welcome to sign up again and start fresh.

### User emails: "Delete my data from your servers"

**Response:**
> You can delete your account from within the app (Settings → Delete Account), which removes your auth account and encrypted backups.
>
> **What gets deleted:**
> - Email & login credentials (Supabase)
> - Encrypted backup files (Supabase Storage)
> - Analytics ID mapping (PostHog)
>
> **What you control directly:**
> - Local progress (user.db) — delete by uninstalling the app
>
> If you'd like a manual deletion or have questions, reply and we'll assist.

---

## Data deletion verification

### For App Store submission

When Apple asks "How do users delete data?", answer:

> Users can delete their account from within the app:
> 
> 1. Settings → Delete Account
> 2. Confirm the prompt
> 3. Account, email, and encrypted backups are deleted from our servers within 30 seconds
> 
> Additionally, users can:
> - Uninstall the app to delete local progress
> - Turn off analytics in Settings → Privacy
> - Request data deletion via support@lexitap.app (responds within 5 business days)

### For GDPR / CCPA requests

**Access request:** Email support@lexitap.app with a copy of ID → we provide a JSON export of all personal data within 30 days

**Deletion request:** Use in-app "Delete Account" button (immediate) or email support@lexitap.app (processed within 30 days)

---

## Retention after deletion

| Data | Retention | Notes |
|------|-----------|-------|
| Auth account (Supabase) | Deleted immediately (hard delete) | User can no longer sign in |
| Backups (Supabase Storage) | Deleted immediately | All copies of user.db removed |
| Analytics mapping | De-identified within 30 days | PostHog retains anonymized events for up to 90 days; no way to re-link to user |
| Crash logs (Sentry) | 90 days (Sentry's policy) | Sentry owns retention; we can't force earlier deletion |
| Audit logs (internal) | 7 days | Soft-delete record kept for support/legal disputes |

---

## Related documents

- [PRIVACY_POLICY.md](PRIVACY_POLICY.md) — What data we collect and how we protect it
- [TERMS_OF_SERVICE.md](TERMS_OF_SERVICE.md) — Your account termination rights
- `mobile/src/infrastructure/db/` — Database schema and backup logic
- `mobile/src/presentation/screens/SettingsScreen.tsx` — Settings UI (implementation)

---

## Compliance checklist

**Apple App Store 5.1.1:**
- ✓ Account deletion accessible within app (Settings → Delete Account)
- ✓ No email or external link required for deletion
- ✓ Deletion is permanent and irreversible (after grace period)
- ✓ User data is removed from our servers (not archived or retained for marketing)

**GDPR Right to Erasure (Article 17):**
- ✓ User can delete account and request deletion of personal data
- ✓ Deletion processed within 30 days (typical SLA)
- ✓ Personal data (email, backups) deleted; non-personal data (analytics, crash logs) may be retained per necessity

**COPPA (Children's Online Privacy Protection Act):**
- ✓ Age gate at signup (16+ enforced)
- ✓ Under-13 accounts deleted automatically
- ✓ Parental consent mechanism deferred (Phase 2)

**CCPA (California Consumer Privacy Act):**
- ✓ User can request deletion; must provide ID
- ✓ Deletion processed within 45 days
- ✓ No re-identification after deletion
