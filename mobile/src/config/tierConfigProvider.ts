import type { TierId } from '@/domain/vocabulary/ids';
import type { TierConfigProvider, TierMeta } from '@/application/tier/TierConfigProvider';
import { listTiers, getTierConfig } from '@/config/tiers';

// Concrete TierConfigProvider backing the application port with the static
// TIER_CONFIG map. Config-over-conditionals: the application layer sees only the
// TierMeta shape, so it stays reusable across sister apps. Entitlement decisions
// Entitlement decisions (`foundation_access` / `all_packs` override) are made
// by the entitlement use case off TierMeta.entitlementId, not here.

export const tierConfigProvider: TierConfigProvider = {
  getTier(id: TierId): TierMeta | null {
    return getTierConfig(id);
  },
  getAllTiers(): readonly TierMeta[] {
    return listTiers();
  },
};
