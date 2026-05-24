import type { TierId } from '@/domain/vocabulary/ids';
import type { TierConfigProvider, TierMeta } from '@/application/tier/TierConfigProvider';
import { TIER_CONFIG, listTiers, getTierConfig } from '@/config/tiers';

// Concrete TierConfigProvider backing the application port with the static
// TIER_CONFIG map. Config-over-conditionals: the application layer sees only the
// TierMeta shape, so it stays reusable across sister apps.

// Synthetic tier id recorded for a Premium Pass entitlement. It is not a content
// tier (it has no words); holding it unlocks every paid tier (CheckAccessUseCase).
export const PREMIUM_PASS_TIER_ID = 'premium_pass' as TierId;

export const tierConfigProvider: TierConfigProvider = {
  getTier(id: TierId): TierMeta | null {
    return getTierConfig(id);
  },
  getAllTiers(): readonly TierMeta[] {
    return listTiers();
  },
  getPremiumPassTierId(): TierId | null {
    // Present only when the config actually defines a Premium Pass SKU.
    return Object.values(TIER_CONFIG).some((t) => t.premiumPassSku !== null)
      ? PREMIUM_PASS_TIER_ID
      : null;
  },
};
