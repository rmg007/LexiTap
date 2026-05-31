---
title: Paywall Spec
screen_id: paywall
category: ux-design
status: active
updated: 2026-05-31
priority: P0
tab: null
surface: bottom-sheet
target_file: TBD
related_flows: [purchasing-exam-pack]
tags: [screen, paywall, monetization, iap, one-time, exam-packs, bundle, no-dark-patterns]
critical_path: true
---

# Paywall

> AI-buildable spec. Tokens from [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md). Presented as a dismissible bottom sheet. **Zero dark patterns**: always dismissible, honest framing, no ads, no pressure. Entitlement source of truth is RevenueCat `CustomerInfo` (memory only); never persisted to `user.db`. Vendor: RevenueCat (native wiring deferred; `StubIapService` until Phase 3).
>
> **Monetization model (2026-05-31): one-time purchases, NO subscriptions.** See [../../08-financial-legal/REVENUE_MODEL_PRICING.md](../../08-financial-legal/REVENUE_MODEL_PRICING.md). Products are one-time non-consumables: **exam packs at $9.99** and an **All-Exams bundle at $29.99** (covers all current + future exam packs). There is no monthly/annual/Premium-Pass subscription and no standalone Common 3000 SKU. All frequency/CEFR content (Foundation, Advanced, Most Common 3000/9000) is **free** and never triggers this paywall.

## 1. Purpose

Convert at the moment of genuine need (test-prep urgency, locked exam-pack tap) by selling the relevant **one-time exam pack** — with the **All-Exams bundle** as the value anchor. Honest, reversible, never coercive. A buy is permanent; nothing to cancel.

## 2. Entry & exit

| Direction | From / To | Trigger |
|---|---|---|
| Enter | Locked exam pack | Tap a locked exam pack (e.g. TOEFL) |
| Enter | Settings → Unlock content | Tap row |
| Enter | Learn flow → exam-pack content gated | Upgrade nudge |
| Exit | Dismiss (✕) | Tap close — no nag |
| Exit | Native purchase sheet | Tap **Unlock** |
| Exit | Entitlement granted → content unlocked | Purchase success |

## 3. Layout

The bundle card adapts to what the user already owns (see §5a upgrade logic): a pack owner sees the **discounted upgrade price**, not the full $29.99.

```
┌─────────────────────────────┐
│              ✕               │  ← dismiss (A), always present
│  Unlock TOEFL Pack           │  ← contextual title (B)
│                              │
│  • Exam-specific vocabulary  │  ← benefits (C), honest
│  • Audio pronunciations      │
│  • Study exactly the TOEFL set│
│  • One-time — yours forever  │
│                              │
│ ┌─────────────────────────┐ │
│ │ TOEFL Pack      $9.99    │ │  ← this pack (D)
│ │ one-time        [Unlock] │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ All-Exams Bundle $29.99  │ │  ← bundle value anchor (E)
│ │ Every exam, incl. future │ │     (price = $29.99 − already paid)
│ │              [ Unlock ]  │ │
│ └─────────────────────────┘ │
│  Restore purchases           │  ← always present (G)
└─────────────────────────────┘
```

## 4. Anatomy

| Ref | Region | Component | Tokens | Content source |
|---|---|---|---|---|
| A | Dismiss | Icon button | `text.secondary` | always present |
| B | Title | Text `headline` | `text.primary` | contextual to trigger pack |
| C | Benefits | Bullet list `body` | `text.secondary` | per-pack benefits |
| D | This pack | Pricing card + Unlock | `bg.surface.raised`, button `accent` | $9.99 one-time |
| E | All-Exams bundle | Pricing card (value anchor) | `accent.subtle` highlight | $29.99 (or upgrade price); unlocks all exam packs, current + future |
| G | Restore purchases | Text button | `text.secondary` | always present |

The bundle card (E) is hidden only if the user already owns `all_exams`.

## 5. Data requirements

| Data | Source | Notes |
|---|---|---|
| Trigger context (pack) | caller | drives title + benefits |
| Product list + prices | IAP adapter (RevenueCat; `StubIapService` for now) | localized store prices |
| Owned entitlements | RevenueCat `CustomerInfo` | drives which bundle SKU to offer (§5a) |
| Entitlement | RevenueCat SDK | Receipt validated server-side by RevenueCat; app caches `CustomerInfo` in memory only. **Never** persisted to `user.db`. |

### 5a. Upgrade logic (which bundle SKU to show)

App Store / Google Play have **no native upgrade for non-consumables**, so the discount is implemented as gated SKUs priced at `$29.99 − already-paid`. The application layer selects the SKU from owned entitlements:

| Customer owns | Bundle card shows | SKU |
|---|---|---|
| no exam packs | $29.99 | `com.lexitap.bundle.full` |
| 1 exam pack | $19.99 | `com.lexitap.bundle.upgrade1` |
| 2 exam packs | $9.99 | `com.lexitap.bundle.upgrade2` |
| 3+ exam packs | (hide bundle; offer remaining packs individually) | — |
| `all_exams` | (hide bundle entirely) | — |

All three bundle SKUs grant the same `all_exams` entitlement. Owning a second individual pack is just another one-time buy — entitlements stack; no upgrade involved.

**Purchase State Machine (IAP → entitlement):**

1. User taps Unlock → native StoreKit / Google Play Billing sheet opens (IAP adapter: `StubIapService` at MVP, `RevenueCatIapService` in Phase 3).
2. Store returns one of: `cancelled` / `pending` / `error` / receipt token.
3. RevenueCat validates the purchase server-side (client cannot self-grant).
4. On valid purchase: RevenueCat returns verified `CustomerInfo`; app unlocks content in memory.
5. Content unlocks. On next launch, RevenueCat re-validates the cached entitlement state.

Pending/deferred purchases (e.g. Apple "Ask to Buy") must show the pending state only.

**Hexagonal Architecture Boundaries:**
- The IAP adapter (`StubIapService` at MVP, `RevenueCatIapService` at Phase 3) lives strictly in `infrastructure/iap/`. **The Paywall screen (presentation layer) calls the application layer only and must never import from `infrastructure/` directly.**
- Which product to offer (pack vs which bundle SKU) is resolved in `application/`, not presentation.
- `all_exams` unlocks all current and future exam packs globally. No off-store steering allowed in the presentation layer.

## 6. States

| State | Trigger | Rendering |
|---|---|---|
| **Default** | Opened | Title, benefits, this-pack card, bundle card (per §5a), restore |
| **Owns some packs** | `CustomerInfo` shows ≥1 pack | Bundle card shows the discounted upgrade price |
| **Purchasing** | Unlock tapped | Hand off to native StoreKit/Play sheet; show pending affordance |
| **Success** | Purchase validated (RevenueCat) | `CustomerInfo` cached in memory; content unlocks; confirmation toast; dismiss |
| **Pending/deferred** | Store returns `pending` (e.g. Ask to Buy / family approval) | "We'll unlock as soon as it's approved." No content unlocked until RevenueCat confirms. |
| **Cancel/fail** | User cancels native sheet | Return to Paywall, no nag, no penalty |
| **Offline** | No connectivity at purchase | Block gracefully: "connect to complete purchase" |

## 7. Interactions

| Element | Trigger | Result | Haptic |
|---|---|---|---|
| Dismiss (A) | tap | Close sheet, return to caller | none |
| Unlock pack (D) | tap | Native purchase (this exam pack) | none |
| Unlock bundle (E) | tap | Native purchase (the §5a-selected bundle SKU) | none |
| Restore (G) | tap | Restore purchases via RevenueCat | none |

## 8. Copy

| Key | String |
|---|---|
| title | "Unlock {Pack}" |
| benefit.forever | "One-time — yours forever" |
| benefit.noads | "No ads" |
| option.pack | "{Pack} · $9.99" |
| option.bundle | "All-Exams Bundle · {price} — every exam, including future ones" |
| restore | "Restore purchases" |
| pending | "We'll unlock as soon as it's approved." |
| offline | "Connect to complete purchase." |

Banned: countdown timers, fake scarcity, pre-checked upsells, "limited offer" pressure, guilt copy, auto-renew framing (there is no subscription).

## 9. Accessibility

- Sheet has a labeled dismiss and a grabber handle; dismissable via swipe and button.
- Pricing cards announce product name and price; Unlock buttons labeled with the product.
- Read order: title → benefits → pack → bundle → restore. Targets ≥ 48×48.

## 10. Motion

| Element | Animation | Duration |
|---|---|---|
| Sheet present | slide up | `motion.base` (220ms) |
| Success confirm | toast fade | `motion.fast` |
| Reduce Motion | fade only | per a11y doc |

## 11. Acceptance criteria

- [ ] Always dismissible; closing produces no nag or penalty.
- [ ] Honest framing: one-time/yours-forever, no ads, no fake scarcity, no auto-renew language.
- [ ] This-pack ($9.99) and All-Exams bundle ($29.99, or the §5a discounted upgrade price) both present; bundle hidden if `all_exams` already owned.
- [ ] Bundle SKU is selected from owned entitlements per §5a so a pack owner never pays full $29.99 on top of a prior purchase.
- [ ] Restore purchases always available (here + Settings).
- [ ] Entitlement state is never persisted to `user.db`. RevenueCat `CustomerInfo` is the only access gate. Pending/deferred purchases show the pending state only.
- [ ] Product-selection decisions resolved in `application/`, not presentation.
- [ ] Pending/deferred and offline cases handled gracefully.

## 12. Open questions

- (None. Contextual benefit bullets are owned by the marketing/content team and occupy a static visual placeholder block.)
