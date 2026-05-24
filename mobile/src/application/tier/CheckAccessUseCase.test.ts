import { CheckAccessUseCase } from '@/application/tier/CheckAccessUseCase';
import { UnlockTierUseCase } from '@/application/tier/UnlockTierUseCase';
import type { TierConfigProvider, TierMeta } from '@/application/tier/TierConfigProvider';
import type { Entitlement, EntitlementRepository } from '@/domain/user/Entitlement';
import { asTierId, type TierId } from '@/domain/vocabulary/ids';

const NOW = 1_700_000_000_000;
const FREE = asTierId('foundation');
const PAID = asTierId('expansion');
const PREMIUM = asTierId('premium_pass');

const TIERS: Record<string, TierMeta> = {
  foundation: { id: FREE, appId: 'lexitap', displayName: 'Foundation', isFree: true, premiumPassSku: null },
  expansion: { id: PAID, appId: 'lexitap', displayName: 'Expansion', isFree: false, premiumPassSku: 'pp' },
  premium_pass: { id: PREMIUM, appId: 'lexitap', displayName: 'Premium Pass', isFree: false, premiumPassSku: 'pp' },
};

const tierConfig: TierConfigProvider = {
  getTier: (id) => TIERS[id] ?? null,
  getAllTiers: () => Object.values(TIERS),
  getPremiumPassTierId: () => PREMIUM,
};

class MockEntitlements implements EntitlementRepository {
  store: Entitlement[] = [];
  constructor(seed: Entitlement[] = []) {
    this.store = seed;
  }
  async getAll(): Promise<Entitlement[]> {
    return this.store;
  }
  async upsert(e: Entitlement): Promise<void> {
    this.store.push(e);
  }
}

function ent(tierId: TierId, expiresAt: number | null = null): Entitlement {
  return { tierId, purchasedAt: NOW - 1000, expiresAt };
}

describe('CheckAccessUseCase', () => {
  it('free tiers are implicitly unlocked', async () => {
    const uc = new CheckAccessUseCase(new MockEntitlements(), tierConfig);
    expect(await uc.execute(FREE, NOW)).toEqual({ tierId: FREE, hasAccess: true, reason: 'free' });
  });

  it('paid tier locked with no entitlement', async () => {
    const uc = new CheckAccessUseCase(new MockEntitlements(), tierConfig);
    expect(await uc.execute(PAID, NOW)).toEqual({ tierId: PAID, hasAccess: false, reason: 'locked' });
  });

  it('direct purchase unlocks that tier', async () => {
    const uc = new CheckAccessUseCase(new MockEntitlements([ent(PAID)]), tierConfig);
    expect(await uc.execute(PAID, NOW)).toEqual({ tierId: PAID, hasAccess: true, reason: 'purchased' });
  });

  it('Premium Pass unlocks all paid tiers', async () => {
    const uc = new CheckAccessUseCase(new MockEntitlements([ent(PREMIUM)]), tierConfig);
    expect(await uc.execute(PAID, NOW)).toEqual({ tierId: PAID, hasAccess: true, reason: 'premium_pass' });
  });

  it('ignores an expired entitlement', async () => {
    const uc = new CheckAccessUseCase(new MockEntitlements([ent(PAID, NOW - 1)]), tierConfig);
    expect(await uc.execute(PAID, NOW)).toEqual({ tierId: PAID, hasAccess: false, reason: 'locked' });
  });

  it('honors an unexpired annual entitlement', async () => {
    const uc = new CheckAccessUseCase(new MockEntitlements([ent(PAID, NOW + 1000)]), tierConfig);
    expect((await uc.execute(PAID, NOW)).hasAccess).toBe(true);
  });
});

describe('UnlockTierUseCase', () => {
  it('persists the entitlement and reports purchased', async () => {
    const repo = new MockEntitlements();
    const uc = new UnlockTierUseCase(repo, tierConfig);
    const access = await uc.execute({ tierId: PAID, purchasedAt: NOW, expiresAt: null });
    expect(access).toEqual({ tierId: PAID, hasAccess: true, reason: 'purchased' });
    expect(repo.store).toHaveLength(1);
  });

  it('reports premium_pass when unlocking the pass tier', async () => {
    const uc = new UnlockTierUseCase(new MockEntitlements(), tierConfig);
    const access = await uc.execute({ tierId: PREMIUM, purchasedAt: NOW, expiresAt: NOW + 1000 });
    expect(access.reason).toBe('premium_pass');
  });
});
