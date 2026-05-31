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
// MONETIZATION MODEL (locked — see lexitap-docs/08-financial-legal/
// REVENUE_MODEL_PRICING.md and APP_STORE_DISTRIBUTION_STRATEGY.md):
//   - There are exactly THREE store products (see STORE_PRODUCTS below).
//   - The "Premium Pass" is a RevenueCat ENTITLEMENT (`premium`), granted by
//     EITHER subscription SKU (monthly or annual). Holding it unlocks every
//     premium content tier. Premium tiers are NOT individually purchasable —
//     there is no per-tier price or SKU. RevenueCat is the runtime entitlement
//     authority; entitlement state is never persisted to user.db.
//   - "Common 3000" is the ONE standalone tier: a $1.99 one-time non-consumable
//     (`com.lexitap.common3k`). It is distinct content (ranks 3,001–6,000), not
//     a premium view of Foundation, and is NOT part of the Premium Pass.
//   - Free tiers (Foundation, Advanced) have no product at all.
//
// The previous version of this file encoded a dead model (per-tier $9.99
// one-time SKUs like `lexitap.toefl`). Configuring the stores from that would
// have created the wrong products.

// --- Store product catalog: exactly the SKUs configured in App Store Connect
// and Google Play, imported into RevenueCat. Nothing else is purchasable. ---

export const PREMIUM_MONTHLY_SKU = 'com.lexitap.premium.monthly';
export const PREMIUM_ANNUAL_SKU = 'com.lexitap.premium.annual';
export const COMMON3K_SKU = 'com.lexitap.common3k';

// RevenueCat entitlement identifiers. The two Premium Pass subscriptions both
// grant `premium`; the Common 3000 unlock grants `common3k`.
export const PREMIUM_ENTITLEMENT_ID = 'premium';
export const COMMON3K_ENTITLEMENT_ID = 'common3k';

export type StoreProductType = 'subscription' | 'non_consumable';

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
  {
    sku: PREMIUM_MONTHLY_SKU,
    type: 'subscription',
    listPriceUsd: 4.99,
    entitlementId: PREMIUM_ENTITLEMENT_ID,
  },
  {
    sku: PREMIUM_ANNUAL_SKU,
    type: 'subscription',
    listPriceUsd: 24.99,
    entitlementId: PREMIUM_ENTITLEMENT_ID,
  },
  {
    sku: COMMON3K_SKU,
    type: 'non_consumable',
    listPriceUsd: 1.99,
    entitlementId: COMMON3K_ENTITLEMENT_ID,
  },
] as const;

// --- Content tiers ---

// How a content tier is unlocked. Keeps "content tier" cleanly separate from
// "store product": most premium tiers have no product of their own — they ride
// the Premium Pass entitlement.
export type TierUnlock =
  | { readonly kind: 'free' }
  // Unlocked by holding the Premium Pass entitlement (either subscription SKU).
  | { readonly kind: 'premium' }
  // Unlocked by its own one-time store product (Common 3000 only).
  | { readonly kind: 'standalone'; readonly sku: string; readonly listPriceUsd: number };

// Presentation-facing tier metadata. Extends the application TierMeta port with
// merchandising fields (unlock model, CEFR band, ordering, active flag). The
// TierMeta fields are exactly the port shape so a TierConfigProvider can return
// these rows directly.
export interface TierConfigEntry extends TierMeta {
  readonly unlock: TierUnlock;
  readonly cefr: readonly CefrLevel[];
  readonly description: string;
  readonly displayOrder: number;
  // Post-launch tiers are configured but not yet purchasable/visible.
  readonly isActive: boolean;
}

// Helper keeps each row terse while deriving the TierMeta fields (isFree,
// premiumPassSku) from the unlock model so they cannot drift out of sync.
function tier(
  id: string,
  entry: Omit<TierConfigEntry, 'id' | 'appId' | 'isFree' | 'premiumPassSku'>,
): TierConfigEntry {
  return {
    ...entry,
    id: id as TierId,
    appId: APP_ID,
    isFree: entry.unlock.kind === 'free',
    // The Premium Pass entitlement id when this tier rides the pass; null for
    // free and standalone tiers. (The port field is named *Sku for historical
    // reasons; it carries the entitlement identifier.)
    premiumPassSku: entry.unlock.kind === 'premium' ? PREMIUM_ENTITLEMENT_ID : null,
  };
}

export const TIER_CONFIG: Readonly<Record<string, TierConfigEntry>> = {
  // --- Free tiers ---
  foundation: tier('foundation', {
    displayName: 'Foundation',
    description: 'Core everyday vocabulary (CEFR A2-B1).',
    unlock: { kind: 'free' },
    cefr: ['A2', 'B1'],
    displayOrder: 1,
    isActive: true,
  }),
  advanced: tier('advanced', {
    displayName: 'Advanced',
    description: 'Higher-register vocabulary (CEFR B2-C1).',
    unlock: { kind: 'free' },
    cefr: ['B2', 'C1'],
    displayOrder: 2,
    isActive: true,
  }),

  // --- Premium Pass tiers (unlocked by the `premium` entitlement, not sold
  //     individually). Activated as content + audio ships; see roadmap. ---
  toefl: tier('toefl', {
    displayName: 'TOEFL Prep',
    description: 'Academic vocabulary for the TOEFL exam.',
    unlock: { kind: 'premium' },
    cefr: ['B2', 'C1'],
    displayOrder: 3,
    isActive: false,
  }),
  ielts: tier('ielts', {
    displayName: 'IELTS Prep',
    description: 'Academic vocabulary for the IELTS exam.',
    unlock: { kind: 'premium' },
    cefr: ['B2', 'C1'],
    displayOrder: 4,
    isActive: false,
  }),
  business: tier('business', {
    displayName: 'Business English',
    description: 'Professional and workplace vocabulary.',
    unlock: { kind: 'premium' },
    cefr: ['B2', 'C1'],
    displayOrder: 5,
    isActive: false,
  }),

  // --- Standalone one-time unlock (the only individually purchasable tier) ---
  common3k: tier('common3k', {
    displayName: 'Common 3000',
    description: 'The next 3,000 most frequent English words (ranks 3,001-6,000).',
    unlock: { kind: 'standalone', sku: COMMON3K_SKU, listPriceUsd: 1.99 },
    cefr: ['A2', 'B1', 'B2'],
    displayOrder: 6,
    isActive: false,
  }),

  // --- Post-launch Premium Pass tiers (configured, not yet active) ---
  gre: tier('gre', {
    displayName: 'GRE Prep',
    description: 'Advanced exam vocabulary for the GRE.',
    unlock: { kind: 'premium' },
    cefr: ['C1', 'C2'],
    displayOrder: 7,
    isActive: false,
  }),
  gmat: tier('gmat', {
    displayName: 'GMAT Prep',
    description: 'Advanced exam vocabulary for the GMAT.',
    unlock: { kind: 'premium' },
    cefr: ['C1', 'C2'],
    displayOrder: 8,
    isActive: false,
  }),
  idioms: tier('idioms', {
    displayName: 'Idioms',
    description: 'Common English idioms and expressions.',
    unlock: { kind: 'premium' },
    cefr: ['B2', 'C1'],
    displayOrder: 9,
    isActive: false,
  }),
  phrasal_verbs: tier('phrasal_verbs', {
    displayName: 'Phrasal Verbs',
    description: 'High-frequency English phrasal verbs.',
    unlock: { kind: 'premium' },
    cefr: ['B1', 'B2'],
    displayOrder: 10,
    isActive: false,
  }),
} as const;

/** All tiers ordered for display. */
export function listTiers(): readonly TierConfigEntry[] {
  return Object.values(TIER_CONFIG).sort((a, b) => a.displayOrder - b.displayOrder);
}

/** Active tiers only (excludes post-launch / not-yet-shipped). */
export function listActiveTiers(): readonly TierConfigEntry[] {
  return listTiers().filter((t) => t.isActive);
}

/** Look up a tier by id, or null when unknown. */
export function getTierConfig(id: TierId): TierConfigEntry | null {
  return TIER_CONFIG[id] ?? null;
}
