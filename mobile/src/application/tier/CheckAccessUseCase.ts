import type { TierId } from '@/domain/vocabulary/ids';
import type { Entitlement, EntitlementRepository, TierAccess } from '@/domain/user/Entitlement';
import type { TierConfigProvider } from '@/application/tier/TierConfigProvider';

// Entitlement / paywall decision. This logic lives in the application layer,
// never in domain or presentation. Tier identity flows through config, not
// conditionals (app-agnostic rule).

function isActive(e: Entitlement, now: number): boolean {
  return e.expiresAt === null || e.expiresAt > now;
}

export class CheckAccessUseCase {
  constructor(
    private readonly entitlements: EntitlementRepository,
    private readonly tiers: TierConfigProvider,
  ) {}

  async execute(tierId: TierId, now: number): Promise<TierAccess> {
    const tier = this.tiers.getTier(tierId);

    // Free tiers are implicitly unlocked.
    if (tier?.isFree) {
      return { tierId, hasAccess: true, reason: 'free' };
    }

    const held = await this.entitlements.getAll();
    const active = held.filter((e) => isActive(e, now));

    // Premium Pass unlocks all paid tiers.
    const premiumPassTierId = this.tiers.getPremiumPassTierId();
    if (premiumPassTierId !== null && active.some((e) => e.tierId === premiumPassTierId)) {
      return { tierId, hasAccess: true, reason: 'premium_pass' };
    }

    // Direct purchase of this tier.
    if (active.some((e) => e.tierId === tierId)) {
      return { tierId, hasAccess: true, reason: 'purchased' };
    }

    return { tierId, hasAccess: false, reason: 'locked' };
  }
}
