---
title: Sign-in / Account Spec
screen_id: signin-account
category: ux-design
status: active
updated: 2026-05-24
priority: P1
tab: null
target_file: TBD
related_flows: [switching-devices-sync, first-launch-onboarding-and-diagnostic]
tags: [screen, account, signin, sync, offline-first, supabase]
critical_path: true
---

# Sign-in / Account

> AI-buildable spec. Tokens from [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md). Optional account for **free cloud sync** — a deliberate differentiator vs device-bound competitors. Offline-first: SQLite is source of truth; cloud (Supabase) is the sync layer, never authority. Account is skippable everywhere.

## 1. Purpose

Let a user create or sign into an account to sync SRS state, progress, entitlements, streak, and settings across devices. Also the entry point for restoring on a new device.

## 2. Entry & exit

| Direction | From / To | Trigger |
|---|---|---|
| Enter | Settings → Sign in / sync | Tap row |
| Enter | Onboarding → optional account step | Skippable |
| Enter | New device first-run | "Sign in" instead of starting fresh |
| Exit | Home (hydrated) | Sign-in success → pull cloud snapshot |
| Exit | Back / Skip | Account is optional |

## 3. Layout

```
┌─────────────────────────────┐
│ ←   Account                  │  ← back + title (A)
│                              │
│  Sync your progress across   │  ← value framing (B)
│  devices. Free, always.      │
│                              │
│  [  Continue with Apple  ]   │  ← provider buttons (C)
│  [  Continue with Google ]   │
│  [  Email sign-in        ]   │
│                              │
│  Already have progress here? │  ← merge note (D)
│  We'll keep it.              │
│                              │
│        Skip for now          │  ← skip (E), always available
└─────────────────────────────┘
```

## 4. Anatomy

| Ref | Region | Component | Tokens | Content source |
|---|---|---|---|---|
| A | Title | Text `headline` | `text.primary` | static |
| B | Value framing | Text `body` | `text.secondary` | static — sync is free |
| C | Provider buttons | Auth buttons | per-provider style on `bg.surface.raised` | available auth providers |
| D | Merge note | Text `caption` | `text.tertiary` | shown when local data exists |
| E | Skip | Text button | `text.secondary` | always present |

## 5. Data requirements

| Data | Source | Notes |
|---|---|---|
| Auth providers | auth config (Supabase) | **MVP Auth Invariant:** Apple Sign-in, Google OAuth, and Email Magic-Link. Apple Sign-in is mandatory on iOS because Google OAuth is present. |
| Existing local data flag | local SQLite | Drives merge warning and activation. |
| Cloud backup | Supabase Storage (Phase 3+) | Encrypted `user.db` blob backup — downloaded on new-device install to seed local DB. No per-table sync. |
| Merge Policy | N/A (Phase 3+) | On new-device restore, the blob replaces the empty local DB. No multi-device merge required — device is always authoritative. Freeze fields are device-local and are preserved as part of the blob. |

## 6. States

| State | Trigger | Rendering |
|---|---|---|
| **Signed out** | Default | Provider buttons + skip |
| **Authenticating** | Provider chosen | Progress affordance |
| **New account** | First sign-in | Create + push local data to cloud |
| **Existing account, local data present** | Sign-in with on-device progress | Merge: last-write-wins per record; SRS events merge (append-only), never overwrite |
| **New device (no local data)** | Sign-in on fresh install | Pull snapshot → hydrate SQLite → Home with full continuity |
| **Offline at sign-in** | No connectivity | Allow read-only/cached start; complete hydration when online |
| **Signed in** | Already authed | Show identity + sign-out; sync status |
| **Auth error** | Provider/network failure | Gentle inline error, retry; never lose local data |

## 7. Interactions

| Element | Trigger | Result | Haptic |
|---|---|---|---|
| Provider button (C) | tap | Begin auth; on success sync | none |
| Skip (E) | tap | Continue offline; account remains optional | none |
| Sign out (signed-in state) | tap | End session; local data retained | none |

## 8. Copy

| Key | String |
|---|---|
| title | "Account" |
| value | "Sync your progress across devices. Free, always." |
| merge | "Already have progress here? We'll keep it." |
| skip | "Skip for now" |
| offline | "You're offline — we'll finish syncing when you reconnect." |

Sync is framed as a free benefit, never a gate.

## 9. Accessibility

- Provider buttons labeled with provider + action ("Continue with Apple").
- Read order: title → value → providers → merge note → skip.
- Skip is always reachable; targets ≥ 48×48. Errors announced via live region.

## 10. Motion

| Element | Animation | Duration |
|---|---|---|
| Auth progress | inline spinner | n/a |
| Hydration → Home | cross-fade | `motion.base` |
| Reduce Motion | fade only | per a11y doc |

## 11. Acceptance criteria

- [ ] Account is optional and skippable at every entry point.
- [ ] Cloud sync is presented as free.
- [ ] SQLite remains source of truth; cloud is the sync layer, never authority.
- [ ] Sign-in with existing local data merges last-write-wins per record; SRS history merges append-only and is never overwritten.
- [ ] New-device sign-in hydrates full continuity (SRS, progress, entitlements, streak, settings) without re-purchase.
- [ ] Offline sign-in degrades to read-only/cached start and completes hydration when online.
- [ ] Auth errors never destroy local data.

## 12. Open questions

- (None. Auth providers are set: Apple + Google + Email Magic-Link. Email uses magic-link to prevent passwords from ever being stored or typed locally.)
