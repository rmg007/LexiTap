import type { TierId } from '@/domain/vocabulary/ids';
import type { CefrLevel } from '@/domain/vocabulary/Word';
import type { TierMeta } from '@/application/tier/TierConfigProvider';
import { APP_ID } from '@/config/app';

// Tier configuration. Config-over-conditionals: tier identity, display strings,
// pricing, and CEFR metadata are looked up here, never branched on app/variant
// strings (SYSTEM_ARCHITECTURE.md app-agnostic rule). The concrete
// TierConfigProvider (infrastructure) reads this map; the application layer only
// ever sees the TierMeta port shape, so it stays reusable across sister apps.

// The "unlock everything" Premium Pass SKU. Holding its entitlement grants
// access to every paid tier (see CheckAccessUseCase).
export const PREMIUM_PASS_SKU = 'lexitap.premium_pass';

// Presentation-facing tier metadata. Extends the application TierMeta port with
// merchandising fields (price, CEFR band, word count, ordering, active flag).
// The first five fields are exactly the TierMeta shape so a TierConfigProvider
// can return these rows directly.
export interface TierConfigEntry extends TierMeta {
  // Merchandising / presentation metadata.
  priceUsd: number | null; // null for free tiers
  sku: string | null; // IAP product id for paid tiers
  cefr: readonly CefrLevel[];
  description: string;
  displayOrder: number;
  // Post-launch tiers are configured but not yet purchasable/visible.
  isActive: boolean;
}

// Helper keeps each row terse while pinning appId + premiumPassSku centrally.
function tier(
  id: string,
  entry: Omit<TierConfigEntry, 'id' | 'appId' | 'premiumPassSku'>,
): TierConfigEntry {
  return {
    id: id as TierId,
    appId: APP_ID,
    premiumPassSku: PREMIUM_PASS_SKU,
    ...entry,
  };
}

export const TIER_CONFIG: Readonly<Record<string, TierConfigEntry>> = {
  // --- Free tiers ---
  foundation: tier('foundation', {
    displayName: 'Foundation',
    description: 'Core everyday vocabulary (CEFR A2-B1).',
    isFree: true,
    priceUsd: null,
    sku: null,
    cefr: ['A2', 'B1'],
    displayOrder: 1,
    isActive: true,
  }),
  advanced: tier('advanced', {
    displayName: 'Advanced',
    description: 'Higher-register vocabulary (CEFR B2-C1).',
    isFree: true,
    priceUsd: null,
    sku: null,
    cefr: ['B2', 'C1'],
    displayOrder: 2,
    isActive: true,
  }),

  // --- Paid tiers ---
  toefl: tier('toefl', {
    displayName: 'TOEFL Prep',
    description: 'Academic vocabulary for the TOEFL exam.',
    isFree: false,
    priceUsd: 9.99,
    sku: 'lexitap.toefl',
    cefr: ['B2', 'C1'],
    displayOrder: 3,
    isActive: true,
  }),
  ielts: tier('ielts', {
    displayName: 'IELTS Prep',
    description: 'Academic vocabulary for the IELTS exam.',
    isFree: false,
    priceUsd: 9.99,
    sku: 'lexitap.ielts',
    cefr: ['B2', 'C1'],
    displayOrder: 4,
    isActive: true,
  }),
  business: tier('business', {
    displayName: 'Business English',
    description: 'Professional and workplace vocabulary.',
    isFree: false,
    priceUsd: 9.99,
    sku: 'lexitap.business',
    cefr: ['B2', 'C1'],
    displayOrder: 5,
    isActive: true,
  }),
  common3k: tier('common3k', {
    displayName: 'Common 3000',
    description: 'The 3,000 most frequent English words.',
    isFree: false,
    priceUsd: 9.99,
    sku: 'lexitap.common3k',
    cefr: ['A2', 'B1', 'B2'],
    displayOrder: 6,
    isActive: true,
  }),

  // --- Post-launch tiers (configured, not yet active) ---
  gre: tier('gre', {
    displayName: 'GRE Prep',
    description: 'Advanced exam vocabulary for the GRE.',
    isFree: false,
    priceUsd: 12.99,
    sku: 'lexitap.gre',
    cefr: ['C1', 'C2'],
    displayOrder: 7,
    isActive: false,
  }),
  gmat: tier('gmat', {
    displayName: 'GMAT Prep',
    description: 'Advanced exam vocabulary for the GMAT.',
    isFree: false,
    priceUsd: 12.99,
    sku: 'lexitap.gmat',
    cefr: ['C1', 'C2'],
    displayOrder: 8,
    isActive: false,
  }),
  idioms: tier('idioms', {
    displayName: 'Idioms',
    description: 'Common English idioms and expressions.',
    isFree: false,
    priceUsd: 6.99,
    sku: 'lexitap.idioms',
    cefr: ['B2', 'C1'],
    displayOrder: 9,
    isActive: false,
  }),
  phrasal_verbs: tier('phrasal_verbs', {
    displayName: 'Phrasal Verbs',
    description: 'High-frequency English phrasal verbs.',
    isFree: false,
    priceUsd: 6.99,
    sku: 'lexitap.phrasal_verbs',
    cefr: ['B1', 'B2'],
    displayOrder: 10,
    isActive: false,
  }),
} as const;

/** All tiers ordered for display. */
export function listTiers(): readonly TierConfigEntry[] {
  return Object.values(TIER_CONFIG).sort((a, b) => a.displayOrder - b.displayOrder);
}

/** Active tiers only (excludes post-launch). */
export function listActiveTiers(): readonly TierConfigEntry[] {
  return listTiers().filter((t) => t.isActive);
}

/** Look up a tier by id, or null when unknown. */
export function getTierConfig(id: TierId): TierConfigEntry | null {
  return TIER_CONFIG[id] ?? null;
}
