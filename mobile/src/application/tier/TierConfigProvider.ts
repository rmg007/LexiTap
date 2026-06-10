import type { TierId } from '@/domain/vocabulary/ids';

// Tier metadata PORT. Access decisions must be driven by config, NOT hardcoded
// conditionals (SYSTEM_ARCHITECTURE.md app-agnostic rule). The concrete
// provider reads src/config/tiers.ts; the application layer only sees this
// interface so the domain/app layers stay reusable across sister apps.

export interface TierMeta {
  id: TierId;
  appId: string;
  displayName: string;
  isFree: boolean;
  // The entitlement that unlocks this tier when held, or null for free tiers.
  // For paid tiers this is the entitlement granted on purchase (e.g.
  // `foundation_access`, `all_packs`); the `all_packs` superset override is
  // applied by the entitlement use case, not encoded per-tier.
  entitlementId: string | null;
}

export interface TierConfigProvider {
  getTier(id: TierId): TierMeta | null;
  getAllTiers(): readonly TierMeta[];
}
