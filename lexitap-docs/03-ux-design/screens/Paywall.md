---
title: Paywall Spec
screen_id: paywall
category: ux-design
status: active
updated: 2026-05-24
priority: P0
tab: null
surface: bottom-sheet
target_file: TBD
related_flows: [purchasing-premium]
tags: [screen, paywall, monetization, subscription, iap, no-dark-patterns]
critical_path: true
---

# Paywall

> AI-buildable spec. Tokens from [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md). Presented as a dismissible bottom sheet. **Zero dark patterns**: always dismissible, honest framing, cancel anytime, no ads, no auto-renew tricks. Entitlement source of truth is local SQLite; cloud mirrors. Vendor: RevenueCat (native wiring deferred; `StubIapService` until Phase 3).

## 1. Purpose

Convert at the moment of genuine need (test-prep urgency, locked-tier tap, or Settings → Unlock content) with clear subscription options. Honest, reversible, never coercive.

## 2. Entry & exit

| Direction | From / To | Trigger |
|---|---|---|
| Enter | Progress → locked tier | Tap locked tier |
| Enter | Settings → Unlock content | Tap row |
| Enter | Learn flow → tier exhausted | Upgrade nudge |
| Exit | Dismiss (✕) | Tap close — no nag |
| Exit | Native purchase sheet | Tap **Choose/Unlock** |
| Exit | Entitlement granted → content unlocked | Purchase success |

## 3. Layout

```
┌─────────────────────────────┐
│              ✕               │  ← dismiss (A), always present
│  Unlock TOEFL Vocabulary     │  ← contextual title (B)
│                              │
│  • Audio pronunciations      │  ← benefits (C), honest
│  • Official-test context     │
│  • Cancel anytime            │
│  • No ads                    │
│                              │
│ ┌─────────────────────────┐ │
│ │ Premium       $4.99/mo   │ │  ← monthly option (D)
│ │ monthly       [ Choose ] │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ Premium Pass  $24.99/yr  │ │  ← annual value anchor (E)
│ │ Unlocks ALL paid tiers   │ │
│ │              [ Choose ]  │ │
│ └─────────────────────────┘ │
│  applied · 14-day trial      │
│  Restore purchases           │  ← always present (G)
└─────────────────────────────┘
```

## 4. Anatomy

| Ref | Region | Component | Tokens | Content source |
|---|---|---|---|---|
| A | Dismiss | Icon button | `text.secondary` | always present |
| B | Title | Text `headline` | `text.primary` | contextual to trigger tier |
| C | Benefits | Bullet list `body` | `text.secondary` | per-tier benefits |
| D | Monthly option | Pricing card + Choose | `bg.surface.raised`, button `accent` | $4.99/mo |
| E | Annual / Pass | Pricing card (value anchor) | `accent.subtle` highlight | $24.99/yr — unlocks all paid tiers |
| G | Restore purchases | Text button | `text.secondary` | always present |

Where applicable, a one-time **Common 3000** unlock ($1.99) may appear as an additional option.

## 5. Data requirements

| Data | Source | Notes |
|---|---|---|
| Trigger context (tier) | caller | drives title + benefits |
| Product list + prices | IAP adapter (RevenueCat; `StubIapService` for now) | localized store prices |
| Entitlement | RevenueCat SDK | Receipt validated server-side by RevenueCat; app caches `CustomerInfo` in memory only. Entitlements are **never** persisted to `user.db`. |

**Purchase State Machine (IAP → entitlement):**

1. User taps Choose/Unlock → native StoreKit / Google Play Billing sheet opens (IAP adapter: `StubIapService` at MVP, `RevenueCatIapService` in Phase 3).
2. Store returns one of: `cancelled` / `pending` / `error` / receipt token.
3. Receipt token is sent to the `validate_receipt` Supabase Edge Function (server-side trusted write; client cannot self-grant).
4. On valid receipt: RevenueCat returns verified `CustomerInfo`; app unlocks content in memory.
5. Content unlocks. On next launch, RevenueCat re-validates the cached entitlement state.

Pending/deferred receipts (e.g. Apple "Ask to Buy") must show the pending state only.

**Hexagonal Architecture Boundaries:**
- The IAP adapter (`StubIapService` at MVP, `RevenueCatIapService` at Phase 3) lives strictly in `infrastructure/iap/`. **The Paywall screen (presentation layer) calls the application layer only and must never import from `infrastructure/` directly.**
- Paywall business logic (what tier to offer, trial balance) deferred to Phase 3 RevenueCat integration.
- Premium Pass unlocks all current and future paid tiers globally. No off-store steering allowed in the presentation layer.

## 6. States

| State | Trigger | Rendering |
|---|---|---|
| **Default** | Opened | Title, benefits, options, restore |
| **Teacher code active** | Code applied | Show extended trial line (F); no discount steering |
| **Purchasing** | Choose tapped | Hand off to native StoreKit/Play sheet; show pending affordance |
| **Success** | Receipt validated (RevenueCat server-side) | `CustomerInfo` cached in memory; content unlocks; confirmation toast; dismiss |
| **Pending/deferred** | Store returns `pending` (e.g. Ask to Buy / family approval) | "We'll unlock as soon as it's approved." No content unlocked until RevenueCat confirms. |
| **Cancel/fail** | User cancels native sheet | Return to Paywall, no nag, no penalty |
| **Offline** | No connectivity at purchase | Block gracefully: "connect to complete purchase" |

## 7. Interactions

| Element | Trigger | Result | Haptic |
|---|---|---|---|
| Dismiss (A) | tap | Close sheet, return to caller | none |
| Choose monthly (D) | tap | Native purchase (monthly) | none |
| Choose annual (E) | tap | Native purchase (Premium Pass) | none |
| Restore (G) | tap | Restore purchases via RevenueCat | none |
| Teacher line (F) | — | Informational; reflects applied trial | n/a |

## 8. Copy

| Key | String |
|---|---|
| title | "Unlock {Tier}" |
| benefit.cancel | "Cancel anytime" |
| benefit.noads | "No ads" |
| option.monthly | "Premium · $4.99/mo" |
| option.annual | "Premium Pass · $24.99/yr — unlocks ALL paid tiers" |
| restore | "Restore purchases" |
| pending | "We'll unlock as soon as it's approved." |
| offline | "Connect to complete purchase." |

Banned: countdown timers, fake scarcity, pre-checked upsells, "limited offer" pressure, guilt copy.

## 9. Accessibility

- Sheet has a labeled dismiss and a grabber handle; dismissable via swipe and button.
- Pricing cards announce product name, price, and billing period; Choose buttons labeled with the plan.
- Read order: title → benefits → monthly → annual → restore. Targets ≥ 48×48.

## 10. Motion

| Element | Animation | Duration |
|---|---|---|
| Sheet present | slide up | `motion.base` (220ms) |
| Success confirm | toast fade | `motion.fast` |
| Reduce Motion | fade only | per a11y doc |

## 11. Acceptance criteria

- [ ] Always dismissible; closing produces no nag or penalty.
- [ ] Honest framing: cancel-anytime, no ads, no auto-renew dark patterns, no fake scarcity.
- [ ] Monthly ($4.99) and annual Premium Pass ($24.99, unlocks all paid tiers) both present; one-time Common 3000 ($1.99) where applicable.
- [ ] Restore purchases always available (here + Settings).
- [ ] Entitlement state is never persisted to `user.db`. RevenueCat `CustomerInfo` is the only access gate. Pending/deferred receipts show the pending state only.
- [ ] Entitlement/unlock decisions resolved in `application/`, not presentation.
- [ ] Teacher code shows an extended trial, never off-store discount steering.
- [ ] Pending/deferred and offline cases handled gracefully.

## 12. Open questions

- (None. Contextual benefit bullets are owned by the marketing/content team and will occupy a static visual placeholder block. The one-time Common 3000 unlock will render strictly on Foundation-adjacent tier entry paywalls.)
