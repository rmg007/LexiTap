---
title: Settings Screen Spec
screen_id: settings
category: ux-design
status: active
updated: 2026-05-24
priority: P1
tab: Settings
target_file: mobile/src/presentation/screens/SettingsScreen.tsx
related_flows: [purchasing-premium, redeeming-teacher-code, switching-devices-sync]
tags: [screen, settings, account, sync, content, study, about]
---

# Settings Screen

> AI-buildable spec. Tokens from [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md). Grouped list of account, content, study, and about controls. No ads, no tracking toggles to apologize for (privacy promise). Entry point to sync, Paywall, and teacher-code redemption.

## 1. Purpose

Central hub for account/sync, content unlocks, study preferences, and legal/help. Hosts several flow entry points rather than deep functionality itself.

## 2. Entry & exit

| Direction | From / To | Trigger |
|---|---|---|
| Enter | Tab bar | Tap `⚙ Settings` |
| Exit | Sign-in / Account | "Sign in / sync" |
| Exit | Paywall | "Unlock content" |
| Exit | Teacher Code Redemption | "Have a teacher code?" |
| Exit | Restore purchases (IAP) | "Restore purchases" |
| Exit | Web (Privacy/Terms/Help) | About rows — open via in-app browser/links |

## 3. Layout

```
┌─────────────────────────────┐
│ Settings                     │  ← title (A)
│                              │
│ ACCOUNT                      │  ← group header (B)
│  Sign in / sync          ›   │  ← row (C) cloud sync (free)
│  Restore purchases       ›   │
│  Have a teacher code?    ›   │
│                              │
│ CONTENT                      │
│  Unlock content          ›   │  → Paywall
│  Active tier: Foundation ›   │
│                              │
│ STUDY                        │
│  Daily reminder       [ ●]   │  ← toggle (D), single gentle reminder
│  Appearance: System      ›   │  ← System / Dark / Light
│                              │
│ ABOUT                        │
│  Privacy · Terms · Help  ›   │
├─────────────────────────────┤
│  ⌂Home  ▶Quiz  ▲Prog  ⚙Set  │
└─────────────────────────────┘
```

## 4. Anatomy

| Ref | Region | Component | Tokens | Content source |
|---|---|---|---|---|
| A | Title | Text `headline` | `text.primary` | static |
| B | Group headers | Text `caption`, uppercase | `text.tertiary` | static (ACCOUNT/CONTENT/STUDY/ABOUT) |
| C | List rows | List item + chevron | `bg.surface`, `text.primary`, chevron `text.tertiary` | per row |
| D | Reminder toggle | Switch | on `accent` | reminder opt-in state |

## 5. Data requirements

| Data | Source | Notes |
|---|---|---|
| Auth/sync state | account/sync service | "Sign in" vs "Signed in as …" |
| Active tier | active-tier read | shown inline |
| Entitlement summary | `user_entitlements` | informs "Unlock content" wording |
| Reminder opt-in | local settings | single daily reminder only |
| Appearance pref | local settings | System (default) / Dark / Light |
| Teacher code state | redemption service | shows applied code/trial if active |

## 6. States

| State | Trigger | Rendering |
|---|---|---|
| **Signed out** | No account | "Sign in / sync" prompts auth |
| **Signed in** | Account exists | Shows account identity + sync status |
| **Reminder on/off** | Toggle | Single daily reminder scheduled / cleared (opt-in) |
| **Appearance** | Selection | System default with Dark fallback |
| **All paid unlocked** | Premium Pass | "Unlock content" reframes to "Manage subscription" / hides upsell |
| **Teacher code active** | Code applied | Row shows applied trial state |
| **Offline** | No connectivity | Sync/restore rows show "connect to sync"; rest functional |

Privacy promise: no ads settings, no tracking-consent apology toggles.

## 7. Interactions

| Element | Trigger | Result | Haptic |
|---|---|---|---|
| Sign in / sync | tap | → Sign-in / Account ([SigninAccount.md](./SigninAccount.md)) | none |
| Restore purchases | tap | Trigger IAP restore (StoreKit/Play) | none |
| Have a teacher code? | tap | → Teacher Code Redemption | none |
| Unlock content | tap | → Paywall | none |
| Active tier | tap | Tier picker / Progress | `selection` |
| Daily reminder (D) | toggle | Schedule/cancel single reminder | `selection` |
| Appearance | tap | Open System/Dark/Light picker | `selection` |
| Privacy · Terms · Help | tap | Open respective page | none |

Destructive actions (delete account / reset progress), if present, are the ONLY place the destructive red token is allowed — with explicit confirmation.

## 8. Copy

| Key | String |
|---|---|
| title | "Settings" |
| account.signin | "Sign in / sync" |
| account.restore | "Restore purchases" |
| account.teacher | "Have a teacher code?" |
| content.unlock | "Unlock content" |
| content.activeTier | "Active tier: {tier}" |
| study.reminder | "Daily reminder" |
| study.appearance | "Appearance: {mode}" |
| about | "Privacy · Terms · Help" |

## 9. Accessibility

- Grouped list with header semantics; each row a button/link with a clear label and chevron not relied on alone.
- Toggle announces on/off state. Appearance row announces current value.
- Rows ≥ 48×48. Read order top-to-bottom by group.

## 10. Motion

Minimal — standard row press feedback (`motion.fast`). Toggle animates per platform. Reduce Motion respected.

## 11. Acceptance criteria

- [ ] Sync is presented as free; entitlements/restore reachable here.
- [ ] Single opt-in daily reminder only — no aggressive notification options.
- [ ] Appearance defaults to System with Dark fallback.
- [ ] No ads or tracking-consent toggles.
- [ ] Teacher-code and Paywall entry points present and routed correctly.
- [ ] Destructive actions (if any) gated behind explicit confirmation and are the only use of the destructive red token.
- [ ] All rows reachable/announced by screen reader.

## 12. Open questions

- Final About sub-pages (Privacy, Terms, Help) — in-app web views vs native screens.
- Whether "Manage subscription" deep-links to the store-native management UI.
