import type { TierId } from '@/domain/vocabulary/ids';
import type { Entitlement, EntitlementRepository, TierAccess } from '@/domain/user/Entitlement';
import type { TierConfigProvider } from '@/application/tier/TierConfigProvider';

// Records a verified purchase and returns the resulting access. Receipt
// validation happens in infrastructure (IAP adapter); this use case only
// persists the entitlement and reports the unlock.

export interface UnlockTierInput {
  tierId: TierId;
  purchasedAt: number;
  expiresAt: number | null;
  receiptToken?: string;
}

export class UnlockTierUseCase {
  constructor(
    private readonly entitlements: EntitlementRepository,
    private readonly tiers: TierConfigProvider,
  ) {}

  async execute(input: UnlockTierInput): Promise<TierAccess> {
    const entitlement: Entitlement = {
      tierId: input.tierId,
      purchasedAt: input.purchasedAt,
      expiresAt: input.expiresAt,
      receiptToken: input.receiptToken,
    };
    await this.entitlements.upsert(entitlement);

    // A Premium Pass purchase grants access to every paid tier.
    const premiumPassTierId = this.tiers.getPremiumPassTierId();
    const reason =
      premiumPassTierId !== null && input.tierId === premiumPassTierId
        ? 'premium_pass'
        : 'purchased';

    return { tierId: input.tierId, hasAccess: true, reason };
  }
}
