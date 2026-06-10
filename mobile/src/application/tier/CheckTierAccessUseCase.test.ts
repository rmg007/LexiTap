import { CheckTierAccessUseCase } from './CheckTierAccessUseCase';
import type { IapPort } from '@/domain/iap/IapPort';
import { asTierId } from '@/domain/vocabulary/ids';

function makeIap(entitlements: string[]): IapPort {
  return {
    getProducts: async () => [],
    purchase: async (sku) => ({ sku, status: 'error' }),
    restorePurchases: async () => [],
    validateReceipt: async () => ({ isValid: false, entitledSkus: [] }),
    getActiveEntitlements: async () => entitlements,
    logIn: async () => true,
    logOut: async () => true,
  };
}

describe('CheckTierAccessUseCase', () => {
  it('allows free tiers regardless of entitlements', async () => {
    const uc = new CheckTierAccessUseCase(makeIap([]));
    expect(await uc.canAccessTier(asTierId('advanced'))).toBe(true);
    expect(await uc.canAccessTier(asTierId('common3k'))).toBe(true);
  });

  it('blocks paid tiers when user has no entitlements', async () => {
    const uc = new CheckTierAccessUseCase(makeIap([]));
    expect(await uc.canAccessTier(asTierId('foundation'))).toBe(false);
    expect(await uc.canAccessTier(asTierId('bundle'))).toBe(false);
    expect(await uc.canAccessTier(asTierId('upgrade'))).toBe(false);
  });

  it('allows foundation tier when user has foundation_access', async () => {
    const uc = new CheckTierAccessUseCase(makeIap(['foundation_access']));
    expect(await uc.canAccessTier(asTierId('foundation'))).toBe(true);
    // bundle requires all_packs — foundation_access alone is not enough
    expect(await uc.canAccessTier(asTierId('bundle'))).toBe(false);
  });

  it('allows all paid tiers when user has all_packs', async () => {
    const uc = new CheckTierAccessUseCase(makeIap(['all_packs']));
    expect(await uc.canAccessTier(asTierId('foundation'))).toBe(true);
    expect(await uc.canAccessTier(asTierId('bundle'))).toBe(true);
    expect(await uc.canAccessTier(asTierId('upgrade'))).toBe(true);
  });

  it('all_packs also covers foundation (superset entitlement)', async () => {
    const uc = new CheckTierAccessUseCase(makeIap(['all_packs']));
    // foundation tier entitlementId = 'foundation_access', but all_packs is the
    // superset override applied by the use case — bundle owners access everything.
    expect(await uc.canAccessTier(asTierId('foundation'))).toBe(true);
  });

  it('returns false for unknown tier id', async () => {
    const uc = new CheckTierAccessUseCase(makeIap(['all_packs']));
    expect(await uc.canAccessTier(asTierId('nonexistent' as never))).toBe(false);
  });

  it('returns false when IAP service throws (fail-closed)', async () => {
    const iap: IapPort = {
      getProducts: async () => [],
      purchase: async (sku) => ({ sku, status: 'error' }),
      restorePurchases: async () => [],
      validateReceipt: async () => ({ isValid: false, entitledSkus: [] }),
      getActiveEntitlements: async () => { throw new Error('SDK offline'); },
      logIn: async () => true,
      logOut: async () => true,
    };
    const uc = new CheckTierAccessUseCase(iap);
    expect(await uc.canAccessTier(asTierId('foundation'))).toBe(false);
  });
});
