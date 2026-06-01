import type { TierId } from '@/domain/vocabulary/ids';
import { getTierConfig } from '@/config/tiers';
import { ALL_EXAMS_ENTITLEMENT } from '@/config/tiers';
import type { IapPort } from '@/domain/iap/IapPort';

// Determines whether the current user may access a given content tier.
// Access rules (from tiers.ts config comment):
//   hasAccess = isFree OR owns(tier.entitlementId) OR owns(all_exams)
// Entitlement state is memory-only and never written to user.db (SECURITY_MODEL).

export class CheckTierAccessUseCase {
  constructor(private readonly iap: IapPort) {}

  async canAccessTier(tierId: TierId): Promise<boolean> {
    const tier = getTierConfig(tierId);
    if (!tier) return false; // unknown tier → deny (safe default)
    if (tier.isFree) return true;

    const entitlementId = tier.entitlementId;
    if (!entitlementId) return true;

    let active: readonly string[];
    try {
      active = await this.iap.getActiveEntitlements();
    } catch {
      // SDK offline → show paywall (fail closed).
      return false;
    }

    return active.includes(entitlementId) || active.includes(ALL_EXAMS_ENTITLEMENT);
  }
}
