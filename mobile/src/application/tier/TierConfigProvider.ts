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
  // The Premium Pass SKU unlocks all paid tiers when its entitlement is held.
  premiumPassSku: string | null;
}

export interface TierConfigProvider {
  getTier(id: TierId): TierMeta | null;
  getAllTiers(): readonly TierMeta[];
  // The SKU/tier id that represents the "unlock everything" Premium Pass.
  getPremiumPassTierId(): TierId | null;
}
