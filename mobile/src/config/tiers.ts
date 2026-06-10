import type { TierId } from '@/domain/vocabulary/ids';
import type { CefrLevel } from '@/domain/vocabulary/Word';
import type { TierMeta } from '@/application/tier/TierConfigProvider';
import { APP_ID } from '@/config/app';

// Tier configuration. Config-over-conditionals: tier identity, display strings,
// unlock model, and CEFR metadata are looked up here, never branched on
// app/variant strings (SYSTEM_ARCHITECTURE.md app-agnostic rule). The concrete
// TierConfigProvider (infrastructure) reads this map; the application layer only
// ever sees the TierMeta port shape, so it stays reusable across sister apps.
//
// MONETIZATION MODEL (v1 — matches App Store Connect products):
//   - NO subscriptions. Every store product is a ONE-TIME non-consumable.
//   - Three products:
//       Foundation Pack ($9.99)  — full 2,848-word vocabulary (foundation_access)
//       Bundle Pack     ($24.99) — Foundation + all future packs (all_packs)
//       Upgrade Pack    ($19.99) — Foundation owners upgrade to Bundle (all_packs)
//   - Access check (CheckTierAccessUseCase):
//       hasAccess(tier) = isFree
//                       OR owns(tier.entitlementId)
//                       OR owns(ALL_PACKS_ENTITLEMENT)
//   - RevenueCat is the runtime entitlement authority; entitlement state is never
//     persisted to user.db.
//   - "Content tier" (many-to-many word tag) stays separate from "store product".
//   - v2 exam packs (TOEFL/IELTS/GRE/GMAT/Business) will be added once the
//     exam-specific content pools are ready; their SKUs will use the
//     com.lexitap.app.exam.* namespace.

// --- Store product catalog: exactly the SKUs in App Store Connect + RevenueCat ---

export const FOUNDATION_PACK_SKU = 'com.lexitap.app.pack.foundation';
export const BUNDLE_PACK_SKU = 'com.lexitap.app.pack.bundle';
export const UPGRADE_PACK_SKU = 'com.lexitap.app.pack.upgrade';

// RevenueCat entitlement identifiers.
// foundation_access: granted by Foundation Pack.
// all_packs: granted by Bundle Pack and Upgrade Pack (a superset — covers
// foundation content AND all future packs, so a bundle owner never needs
// to buy individual packs).
export const FOUNDATION_ENTITLEMENT = 'foundation_access';
export const ALL_PACKS_ENTITLEMENT = 'all_packs';

// Every store product is a one-time non-consumable.
export type StoreProductType = 'non_consumable';

export interface StoreProduct {
  readonly sku: string;
  readonly type: StoreProductType;
  // List price in USD. The store localizes the displayed price; this is only
  // for internal reference / catalog config, never shown unlocalized to users.
  readonly listPriceUsd: number;
  // The RevenueCat entitlement this product grants on purchase.
  readonly entitlementId: string;
}

export const STORE_PRODUCTS: readonly StoreProduct[] = [
  { sku: FOUNDATION_PACK_SKU, type: 'non_consumable', listPriceUsd: 9.99,  entitlementId: FOUNDATION_ENTITLEMENT },
  { sku: BUNDLE_PACK_SKU,     type: 'non_consumable', listPriceUsd: 24.99, entitlementId: ALL_PACKS_ENTITLEMENT },
  { sku: UPGRADE_PACK_SKU,    type: 'non_consumable', listPriceUsd: 19.99, entitlementId: ALL_PACKS_ENTITLEMENT },
] as const;

// --- Content tiers ---

export type TierUnlock =
  | { readonly kind: 'free' }
  | {
      readonly kind: 'paid';
      readonly sku: string;
      readonly entitlementId: string;
      readonly listPriceUsd: number;
    };

export interface TierConfigEntry extends TierMeta {
  readonly unlock: TierUnlock;
  readonly cefr: readonly CefrLevel[];
  readonly description: string;
  readonly displayOrder: number;
  readonly isActive: boolean;
}

function tier(
  id: string,
  entry: Omit<TierConfigEntry, 'id' | 'appId' | 'isFree' | 'entitlementId'>,
): TierConfigEntry {
  return {
    ...entry,
    id: id as TierId,
    appId: APP_ID,
    isFree: entry.unlock.kind === 'free',
    entitlementId: entry.unlock.kind === 'paid' ? entry.unlock.entitlementId : null,
  };
}

export const TIER_CONFIG: Readonly<Record<string, TierConfigEntry>> = {
  // --- Paid packs (matching App Store Connect products) ---
  foundation: tier('foundation', {
    displayName: 'Foundation Pack',
    description: 'Full access to 2,848+ core English words. One-time unlock, learn forever.',
    unlock: {
      kind: 'paid',
      sku: FOUNDATION_PACK_SKU,
      entitlementId: FOUNDATION_ENTITLEMENT,
      listPriceUsd: 9.99,
    },
    cefr: ['A2', 'B1'],
    displayOrder: 1,
    isActive: true,
  }),
  bundle: tier('bundle', {
    displayName: 'Bundle Pack',
    description: 'Everything in Foundation, plus all future exam and specialty packs.',
    unlock: {
      kind: 'paid',
      sku: BUNDLE_PACK_SKU,
      entitlementId: ALL_PACKS_ENTITLEMENT,
      listPriceUsd: 24.99,
    },
    cefr: ['A2', 'B1', 'B2', 'C1'],
    displayOrder: 2,
    isActive: true,
  }),
  upgrade: tier('upgrade', {
    displayName: 'Upgrade to Bundle',
    description: 'Already own Foundation? Upgrade to the full Bundle and keep all future packs.',
    unlock: {
      kind: 'paid',
      sku: UPGRADE_PACK_SKU,
      entitlementId: ALL_PACKS_ENTITLEMENT,
      listPriceUsd: 19.99,
    },
    cefr: ['A2', 'B1', 'B2', 'C1'],
    displayOrder: 3,
    isActive: true,
  }),

  // --- Free / future tiers (not yet populated; hidden until content ships) ---
  advanced: tier('advanced', {
    displayName: 'Advanced',
    description: 'Higher-register vocabulary (CEFR B2-C1).',
    unlock: { kind: 'free' },
    cefr: ['B2', 'C1'],
    displayOrder: 4,
    isActive: false,
  }),
  common3k: tier('common3k', {
    displayName: 'Most Common 3000',
    description: 'The 3,000 most frequent English words by real-world usage.',
    unlock: { kind: 'free' },
    cefr: ['A2', 'B1', 'B2'],
    displayOrder: 5,
    isActive: false,
  }),
  common9k: tier('common9k', {
    displayName: 'Most Common 9000',
    description: 'Words ranked 3,001-9,000 by real-world frequency.',
    unlock: { kind: 'free' },
    cefr: ['B2', 'C1'],
    displayOrder: 6,
    isActive: false,
  }),
} as const;

/** All tiers ordered for display. */
export function listTiers(): readonly TierConfigEntry[] {
  return Object.values(TIER_CONFIG).sort((a, b) => a.displayOrder - b.displayOrder);
}

/** Active tiers only (excludes not-yet-populated). */
export function listActiveTiers(): readonly TierConfigEntry[] {
  return listTiers().filter((t) => t.isActive);
}

/** Look up a tier by id, or null when unknown. */
export function getTierConfig(id: TierId): TierConfigEntry | null {
  return TIER_CONFIG[id] ?? null;
}
