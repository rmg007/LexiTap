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
  };
}

describe('CheckTierAccessUseCase', () => {
  it('allows free tiers regardless of entitlements', async () => {
    const uc = new CheckTierAccessUseCase(makeIap([]));
    expect(await uc.canAccessTier(asTierId('foundation'))).toBe(true);
    expect(await uc.canAccessTier(asTierId('advanced'))).toBe(true);
  });

  it('blocks exam pack tiers when user has no entitlements', async () => {
    const uc = new CheckTierAccessUseCase(makeIap([]));
    expect(await uc.canAccessTier(asTierId('toefl'))).toBe(false);
    expect(await uc.canAccessTier(asTierId('ielts'))).toBe(false);
  });

  it('allows exam pack tier when user has the matching entitlement', async () => {
    const uc = new CheckTierAccessUseCase(makeIap(['exam_toefl']));
    expect(await uc.canAccessTier(asTierId('toefl'))).toBe(true);
    expect(await uc.canAccessTier(asTierId('ielts'))).toBe(false);
  });

  it('allows any exam pack when user has all_exams', async () => {
    const uc = new CheckTierAccessUseCase(makeIap(['all_exams']));
    expect(await uc.canAccessTier(asTierId('toefl'))).toBe(true);
    expect(await uc.canAccessTier(asTierId('gre'))).toBe(true);
    expect(await uc.canAccessTier(asTierId('business'))).toBe(true);
  });

  it('returns false for unknown tier id', async () => {
    const uc = new CheckTierAccessUseCase(makeIap(['all_exams']));
    expect(await uc.canAccessTier(asTierId('nonexistent' as never))).toBe(false);
  });
});
