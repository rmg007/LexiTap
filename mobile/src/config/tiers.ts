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
// REVENUE_MODEL_PRICING.md):
//   - NO subscriptions. Every store product is a ONE-TIME non-consumable.
//   - Free content categories (Foundation, Advanced, Most Common 3000/9000)
//     carry NO product at all — they are content tags, always unlocked.
//   - Paid = one-time EXAM PACKS (TOEFL/IELTS/GRE/GMAT/Business) at $9.99 each,
//     each granting a per-pack entitlement (`exam_{name}`).
//   - The All-Exams bundle ($29.99) and the two gated upgrade SKUs ($19.99/$9.99,
//     priced `$29.99 − already-paid`) all grant `all_exams`, a superset covering
//     every current AND future exam pack.
//   - Access check (applied by the entitlement use case, Stage 5):
//       hasAccess(tier) = isFree OR owns(tier.entitlementId) OR owns(all_exams)
//   - RevenueCat is the runtime entitlement authority; entitlement state is never
//     persisted to user.db. "Content category" (a many-to-many word tag) is kept
//     cleanly separate from "store product".
//
// The previous version of this file encoded a DEAD model (Premium Pass
// subscriptions + a standalone Common 3000 SKU). Configuring the stores from
// that would have created the wrong products.

// --- Store product catalog: exactly the SKUs configured in App Store Connect
// and Google Play, imported into RevenueCat. Nothing else is purchasable. All
// are one-time non-consumables. ---

export const EXAM_TOEFL_SKU = 'com.lexitap.exam.toefl';
export const EXAM_IELTS_SKU = 'com.lexitap.exam.ielts';
export const EXAM_GRE_SKU = 'com.lexitap.exam.gre';
export const EXAM_GMAT_SKU = 'com.lexitap.exam.gmat';
export const EXAM_BUSINESS_SKU = 'com.lexitap.exam.business';
export const BUNDLE_FULL_SKU = 'com.lexitap.bundle.full';
export const BUNDLE_UPGRADE1_SKU = 'com.lexitap.bundle.upgrade1';
export const BUNDLE_UPGRADE2_SKU = 'com.lexitap.bundle.upgrade2';

// RevenueCat entitlement identifiers. Each exam pack grants its own entitlement;
// the bundle and both upgrade SKUs all grant `all_exams` (covers every current
// and future pack).
export const EXAM_TOEFL_ENTITLEMENT = 'exam_toefl';
export const EXAM_IELTS_ENTITLEMENT = 'exam_ielts';
export const EXAM_GRE_ENTITLEMENT = 'exam_gre';
export const EXAM_GMAT_ENTITLEMENT = 'exam_gmat';
export const EXAM_BUSINESS_ENTITLEMENT = 'exam_business';
export const ALL_EXAMS_ENTITLEMENT = 'all_exams';

// Every store product is a one-time non-consumable. (Subscriptions were removed
// with the monetization rethink; the type is kept explicit for forward clarity.)
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
  // --- Exam packs (uniform $9.99; uniform pricing keeps the upgrade math clean) ---
  { sku: EXAM_TOEFL_SKU, type: 'non_consumable', listPriceUsd: 9.99, entitlementId: EXAM_TOEFL_ENTITLEMENT },
  { sku: EXAM_IELTS_SKU, type: 'non_consumable', listPriceUsd: 9.99, entitlementId: EXAM_IELTS_ENTITLEMENT },
  { sku: EXAM_GRE_SKU, type: 'non_consumable', listPriceUsd: 9.99, entitlementId: EXAM_GRE_ENTITLEMENT },
  { sku: EXAM_GMAT_SKU, type: 'non_consumable', listPriceUsd: 9.99, entitlementId: EXAM_GMAT_ENTITLEMENT },
  { sku: EXAM_BUSINESS_SKU, type: 'non_consumable', listPriceUsd: 9.99, entitlementId: EXAM_BUSINESS_ENTITLEMENT },
  // --- All-Exams bundle + gated upgrade SKUs (all grant `all_exams`) ---
  { sku: BUNDLE_FULL_SKU, type: 'non_consumable', listPriceUsd: 29.99, entitlementId: ALL_EXAMS_ENTITLEMENT },
  { sku: BUNDLE_UPGRADE1_SKU, type: 'non_consumable', listPriceUsd: 19.99, entitlementId: ALL_EXAMS_ENTITLEMENT },
  { sku: BUNDLE_UPGRADE2_SKU, type: 'non_consumable', listPriceUsd: 9.99, entitlementId: ALL_EXAMS_ENTITLEMENT },
] as const;

// --- Content tiers ---

// How a content tier is unlocked. Keeps "content tier" cleanly separate from
// "store product": free categories have no product; each exam pack is a single
// one-time product that grants a per-pack entitlement.
export type TierUnlock =
  | { readonly kind: 'free' }
  // Unlocked by owning this pack's entitlement OR the `all_exams` bundle.
  | {
      readonly kind: 'exam_pack';
      readonly sku: string;
      readonly entitlementId: string;
      readonly listPriceUsd: number;
    };

// Presentation-facing tier metadata. Extends the application TierMeta port with
// merchandising fields (unlock model, CEFR band, ordering, active flag). The
// TierMeta fields are exactly the port shape so a TierConfigProvider can return
// these rows directly.
export interface TierConfigEntry extends TierMeta {
  readonly unlock: TierUnlock;
  readonly cefr: readonly CefrLevel[];
  readonly description: string;
  readonly displayOrder: number;
  // Post-launch / not-yet-populated tiers are configured but not yet shown.
  readonly isActive: boolean;
}

// Helper keeps each row terse while deriving the TierMeta fields (isFree,
// entitlementId) from the unlock model so they cannot drift out of sync.
function tier(
  id: string,
  entry: Omit<TierConfigEntry, 'id' | 'appId' | 'isFree' | 'entitlementId'>,
): TierConfigEntry {
  return {
    ...entry,
    id: id as TierId,
    appId: APP_ID,
    isFree: entry.unlock.kind === 'free',
    // The per-pack entitlement when this tier is an exam pack; null for free
    // tiers. The global `all_exams` override is applied by the entitlement use
    // case, not encoded here.
    entitlementId: entry.unlock.kind === 'exam_pack' ? entry.unlock.entitlementId : null,
  };
}

export const TIER_CONFIG: Readonly<Record<string, TierConfigEntry>> = {
  // --- Free frequency / CEFR categories (no product, ever) ---
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
  common3k: tier('common3k', {
    displayName: 'Most Common 3000',
    description: 'The 3,000 most frequent English words by real-world usage.',
    unlock: { kind: 'free' },
    cefr: ['A2', 'B1', 'B2'],
    displayOrder: 3,
    // Free, but not populated until content volume ships (Stage 3).
    isActive: false,
  }),
  common9k: tier('common9k', {
    displayName: 'Most Common 9000',
    description: 'Words ranked 3,001-9,000 by real-world frequency.',
    unlock: { kind: 'free' },
    cefr: ['B2', 'C1'],
    displayOrder: 4,
    isActive: false,
  }),

  // --- Paid one-time exam packs ($9.99 each; each grants `exam_{name}`).
  //     Activated as content ships + monetization is wired (Stage 5). ---
  toefl: tier('toefl', {
    displayName: 'TOEFL Prep',
    description: 'Academic vocabulary for the TOEFL exam.',
    unlock: { kind: 'exam_pack', sku: EXAM_TOEFL_SKU, entitlementId: EXAM_TOEFL_ENTITLEMENT, listPriceUsd: 9.99 },
    cefr: ['B2', 'C1'],
    displayOrder: 5,
    isActive: false,
  }),
  ielts: tier('ielts', {
    displayName: 'IELTS Prep',
    description: 'Academic vocabulary for the IELTS exam.',
    unlock: { kind: 'exam_pack', sku: EXAM_IELTS_SKU, entitlementId: EXAM_IELTS_ENTITLEMENT, listPriceUsd: 9.99 },
    cefr: ['B2', 'C1'],
    displayOrder: 6,
    isActive: false,
  }),
  gre: tier('gre', {
    displayName: 'GRE Prep',
    description: 'Advanced academic vocabulary for the GRE.',
    unlock: { kind: 'exam_pack', sku: EXAM_GRE_SKU, entitlementId: EXAM_GRE_ENTITLEMENT, listPriceUsd: 9.99 },
    cefr: ['C1', 'C2'],
    displayOrder: 7,
    isActive: false,
  }),
  gmat: tier('gmat', {
    displayName: 'GMAT Prep',
    description: 'Advanced academic vocabulary for the GMAT.',
    unlock: { kind: 'exam_pack', sku: EXAM_GMAT_SKU, entitlementId: EXAM_GMAT_ENTITLEMENT, listPriceUsd: 9.99 },
    cefr: ['C1', 'C2'],
    displayOrder: 8,
    isActive: false,
  }),
  business: tier('business', {
    displayName: 'Business English',
    description: 'Professional and workplace vocabulary.',
    unlock: { kind: 'exam_pack', sku: EXAM_BUSINESS_SKU, entitlementId: EXAM_BUSINESS_ENTITLEMENT, listPriceUsd: 9.99 },
    cefr: ['B2', 'C1'],
    displayOrder: 9,
    isActive: false,
  }),
} as const;

/** All tiers ordered for display. */
export function listTiers(): readonly TierConfigEntry[] {
  return Object.values(TIER_CONFIG).sort((a, b) => a.displayOrder - b.displayOrder);
}

/** Active tiers only (excludes post-launch / not-yet-populated). */
export function listActiveTiers(): readonly TierConfigEntry[] {
  return listTiers().filter((t) => t.isActive);
}

/** Look up a tier by id, or null when unknown. */
export function getTierConfig(id: TierId): TierConfigEntry | null {
  return TIER_CONFIG[id] ?? null;
}
