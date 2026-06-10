import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { RevenueCatIapService } from '@/infrastructure/iap/RevenueCatIapService';
import Purchases from 'react-native-purchases';
import { PURCHASES_ERROR_CODE } from 'react-native-purchases';
// Import mock helpers from the Jest mock file directly (TypeScript sees real package
// types; mock internals are only available at this path).
import {
  mockCustomerInfo,
  mockOfferings,
} from '../../__mocks__/react-native-purchases';

// jest.config.js maps react-native-purchases → src/__mocks__/react-native-purchases.ts

const mockPurchases = Purchases as jest.Mocked<typeof Purchases>;

function makePkg(sku: string) {
  return {
    product: {
      identifier: sku,
      priceString: '$9.99',
      title: 'Test Product',
      description: 'A test product',
      price: 9.99,
      currencyCode: 'USD',
      productCategory: 'NON_SUBSCRIPTION',
    },
    packageType: 'LIFETIME',
    offeringIdentifier: 'default',
  };
}

describe('RevenueCatIapService', () => {
  let service: RevenueCatIapService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RevenueCatIapService();
  });

  describe('getProducts', () => {
    it('returns mapped products for matching skus', async () => {
      const toeflPkg = makePkg('com.lexitap.exam.toefl');
      mockPurchases.getOfferings.mockResolvedValueOnce({
        ...mockOfferings,
        current: { ...mockOfferings.current!, availablePackages: [toeflPkg] },
      } as never);

      const products = await service.getProducts(['com.lexitap.exam.toefl']);
      expect(products).toHaveLength(1);
      expect(products[0]).toMatchObject({
        sku: 'com.lexitap.exam.toefl',
        priceString: '$9.99',
        title: 'Test Product',
      });
    });

    it('returns empty array when SDK throws', async () => {
      mockPurchases.getOfferings.mockRejectedValueOnce(new Error('SDK not configured') as never);
      const products = await service.getProducts(['com.lexitap.exam.toefl']);
      expect(products).toEqual([]);
    });

    it('filters out packages not in requested skus', async () => {
      mockPurchases.getOfferings.mockResolvedValueOnce({
        ...mockOfferings,
        current: {
          ...mockOfferings.current!,
          availablePackages: [makePkg('com.lexitap.exam.toefl'), makePkg('com.lexitap.exam.ielts')],
        },
      } as never);

      const products = await service.getProducts(['com.lexitap.exam.toefl']);
      expect(products).toHaveLength(1);
      expect(products[0]?.sku).toBe('com.lexitap.exam.toefl');
    });
  });

  describe('purchase', () => {
    it('returns purchased status on success', async () => {
      mockPurchases.getOfferings.mockResolvedValueOnce({
        ...mockOfferings,
        current: {
          ...mockOfferings.current!,
          availablePackages: [makePkg('com.lexitap.exam.toefl')],
        },
      } as never);
      mockPurchases.purchasePackage.mockResolvedValueOnce({
        productIdentifier: 'com.lexitap.exam.toefl',
        customerInfo: mockCustomerInfo,
        transaction: { transactionIdentifier: 'txn_123' },
      } as never);

      const result = await service.purchase('com.lexitap.exam.toefl');
      expect(result.status).toBe('purchased');
      expect(result.sku).toBe('com.lexitap.exam.toefl');
      expect(result.receiptToken).toBe('txn_123');
    });

    it('returns error when package not in offerings', async () => {
      mockPurchases.getOfferings.mockResolvedValueOnce(mockOfferings as never);
      const result = await service.purchase('com.lexitap.exam.toefl');
      expect(result.status).toBe('error');
    });

    it('returns cancelled when user cancels', async () => {
      mockPurchases.getOfferings.mockResolvedValueOnce({
        ...mockOfferings,
        current: {
          ...mockOfferings.current!,
          availablePackages: [makePkg('com.lexitap.exam.toefl')],
        },
      } as never);
      mockPurchases.purchasePackage.mockRejectedValueOnce({
        code: PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR,
        message: 'User cancelled',
      } as never);

      const result = await service.purchase('com.lexitap.exam.toefl');
      expect(result.status).toBe('cancelled');
    });

    it('returns pending for Ask-to-Buy', async () => {
      mockPurchases.getOfferings.mockResolvedValueOnce({
        ...mockOfferings,
        current: {
          ...mockOfferings.current!,
          availablePackages: [makePkg('com.lexitap.exam.toefl')],
        },
      } as never);
      mockPurchases.purchasePackage.mockRejectedValueOnce({
        code: PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR,
        message: 'Pending parental approval',
      } as never);

      const result = await service.purchase('com.lexitap.exam.toefl');
      expect(result.status).toBe('pending');
    });

    it('returns error on network failure', async () => {
      mockPurchases.getOfferings.mockRejectedValueOnce(new Error('Network error') as never);
      const result = await service.purchase('com.lexitap.exam.toefl');
      expect(result.status).toBe('error');
    });
  });

  describe('restorePurchases', () => {
    it('returns previously purchased skus', async () => {
      mockPurchases.restorePurchases.mockResolvedValueOnce({
        ...mockCustomerInfo,
        allPurchasedProductIdentifiers: ['com.lexitap.exam.toefl', 'com.lexitap.exam.ielts'],
      } as never);

      const results = await service.restorePurchases();
      expect(results).toHaveLength(2);
      expect(results[0]).toMatchObject({ sku: 'com.lexitap.exam.toefl', status: 'purchased' });
    });

    it('returns empty array on SDK error', async () => {
      mockPurchases.restorePurchases.mockRejectedValueOnce(new Error('SDK error') as never);
      const results = await service.restorePurchases();
      expect(results).toEqual([]);
    });
  });

  describe('validateReceipt', () => {
    it('always returns isValid=true (RevenueCat validates server-side)', async () => {
      const result = await service.validateReceipt('any-token');
      expect(result.isValid).toBe(true);
      expect(result.entitledSkus).toEqual([]);
    });
  });

  describe('getActiveEntitlements', () => {
    it('returns active entitlement identifiers', async () => {
      mockPurchases.getCustomerInfo.mockResolvedValueOnce({
        ...mockCustomerInfo,
        entitlements: {
          ...mockCustomerInfo.entitlements,
          active: {
            exam_toefl: { identifier: 'exam_toefl', isActive: true },
          },
        },
      } as never);

      const entitlements = await service.getActiveEntitlements();
      expect(entitlements).toContain('exam_toefl');
    });

    it('returns empty array when user owns nothing', async () => {
      mockPurchases.getCustomerInfo.mockResolvedValueOnce(mockCustomerInfo as never);
      const entitlements = await service.getActiveEntitlements();
      expect(entitlements).toEqual([]);
    });

    it('uses cached result on second call within TTL', async () => {
      mockPurchases.getCustomerInfo.mockResolvedValue(mockCustomerInfo as never);
      await service.getActiveEntitlements();
      await service.getActiveEntitlements();
      expect(mockPurchases.getCustomerInfo).toHaveBeenCalledTimes(1);
    });

    it('re-fetches after cache invalidated by purchase', async () => {
      mockPurchases.getCustomerInfo.mockResolvedValue(mockCustomerInfo as never);
      await service.getActiveEntitlements();
      service.invalidateCache();
      await service.getActiveEntitlements();
      expect(mockPurchases.getCustomerInfo).toHaveBeenCalledTimes(2);
    });

    it('throws on SDK error (let caller handle as offline)', async () => {
      mockPurchases.getCustomerInfo.mockRejectedValueOnce(new Error('SDK error') as never);
      await expect(service.getActiveEntitlements()).rejects.toThrow();
    });
  });

  describe('logIn', () => {
    it('aliases to the app user id and invalidates the entitlement cache', async () => {
      mockPurchases.getCustomerInfo.mockResolvedValue(mockCustomerInfo as never);
      await service.getActiveEntitlements(); // prime cache
      await service.logIn('supabase-user-1');
      expect(mockPurchases.logIn).toHaveBeenCalledWith('supabase-user-1');
      await service.getActiveEntitlements(); // cache invalidated -> refetch
      expect(mockPurchases.getCustomerInfo).toHaveBeenCalledTimes(2);
    });

    it('swallows the error when the SDK is unconfigured (never throws)', async () => {
      mockPurchases.logIn.mockRejectedValueOnce(
        new Error('There is no singleton instance') as never,
      );
      await expect(service.logIn('supabase-user-1')).resolves.toBeUndefined();
    });
  });

  describe('logOut', () => {
    it('reverts to anonymous and invalidates the entitlement cache', async () => {
      mockPurchases.getCustomerInfo.mockResolvedValue(mockCustomerInfo as never);
      await service.getActiveEntitlements(); // prime cache
      await service.logOut();
      expect(mockPurchases.logOut).toHaveBeenCalled();
      await service.getActiveEntitlements(); // cache invalidated -> refetch
      expect(mockPurchases.getCustomerInfo).toHaveBeenCalledTimes(2);
    });

    it('swallows the already-anonymous error (never throws)', async () => {
      mockPurchases.logOut.mockRejectedValueOnce({
        code: PURCHASES_ERROR_CODE.UNKNOWN_ERROR,
        message: 'Called logOut but the current user is anonymous',
      } as never);
      await expect(service.logOut()).resolves.toBeUndefined();
    });
  });
});
