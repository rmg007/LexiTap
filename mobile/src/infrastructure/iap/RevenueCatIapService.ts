import Purchases, { PURCHASES_ERROR_CODE } from 'react-native-purchases';
import type { PurchasesPackage } from 'react-native-purchases';
import { Platform } from 'react-native';
import type { IapPort, IapProduct, PurchaseResult, ReceiptValidation } from '@/domain/iap/IapPort';
import { logger } from '@/lib/logger';

// RevenueCat implementation of IapPort. Requires the native SDK (not Expo Go).
// Instantiate via createRevenueCatIapService() which handles SDK configuration
// and falls back gracefully when no API key is set (dev / test builds).
//
// SDK receipt validation is handled server-side by RevenueCat; validateReceipt()
// is a stub (see R6 in P3_REVENUECAT_PLAN.md).

const ENTITLEMENT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 min

export class RevenueCatIapService implements IapPort {
  private cachedEntitlements: readonly string[] | null = null;
  private cacheExpiresAt = 0;

  async getProducts(skus: readonly string[]): Promise<IapProduct[]> {
    try {
      const offerings = await Purchases.getOfferings();
      const packages: PurchasesPackage[] = offerings.current?.availablePackages ?? [];
      const skuSet = new Set(skus);
      return packages
        .filter((pkg) => skuSet.has(pkg.product.identifier))
        .map((pkg) => ({
          sku: pkg.product.identifier,
          priceString: pkg.product.priceString,
          title: pkg.product.title,
          description: pkg.product.description,
        }));
    } catch (err) {
      logger.warn('RevenueCat getProducts failed', { error: String(err) });
      return [];
    }
  }

  async purchase(sku: string): Promise<PurchaseResult> {
    try {
      const offerings = await Purchases.getOfferings();
      const packages: PurchasesPackage[] = offerings.current?.availablePackages ?? [];
      const pkg = packages.find((p) => p.product.identifier === sku);
      if (!pkg) {
        logger.warn('RevenueCat purchase: package not found', { sku });
        return { sku, status: 'error' };
      }
      const result = await Purchases.purchasePackage(pkg);
      this.invalidateCache();
      const txnId = (result.transaction as { transactionIdentifier?: string } | undefined)
        ?.transactionIdentifier;
      return { sku, status: 'purchased', ...(txnId ? { receiptToken: txnId } : {}) };
    } catch (err: unknown) {
      return this.handlePurchaseError(sku, err);
    }
  }

  async restorePurchases(): Promise<PurchaseResult[] | null> {
    try {
      const info = await Purchases.restorePurchases();
      this.invalidateCache();
      const skus: string[] = (info.allPurchasedProductIdentifiers as string[]) ?? [];
      return skus.map((s) => ({ sku: s, status: 'purchased' as const }));
    } catch (err) {
      // null = failure (unconfigured SDK / network) — distinguishable from a
      // successful-but-empty restore so the UI never tells a paying user
      // "no purchases found" on an error.
      logger.warn('RevenueCat restorePurchases failed', { error: String(err) });
      return null;
    }
  }

  async validateReceipt(_receiptToken: string): Promise<ReceiptValidation> {
    // RevenueCat validates server-side; no client-side check needed.
    // https://docs.revenuecat.com/docs/receipts
    return { isValid: true, entitledSkus: [] };
  }

  async getActiveEntitlements(): Promise<readonly string[]> {
    const now = Date.now();
    if (this.cachedEntitlements !== null && now < this.cacheExpiresAt) {
      return this.cachedEntitlements;
    }
    // Throws on network error — let callers handle (CheckTierAccessUseCase → deny).
    const info = await Purchases.getCustomerInfo();
    const active = Object.keys(info.entitlements.active as Record<string, unknown>);
    this.cachedEntitlements = active;
    this.cacheExpiresAt = now + ENTITLEMENT_CACHE_TTL_MS;
    return active;
  }

  // Alias the store customer to the Supabase user id (P3_AUTH_PLAN AU2.5).
  // Best-effort: an unconfigured SDK throws -- swallow, never block sign-in.
  // Returns false on failure so the container retries on the next auth event
  // instead of permanently committing a failed alias. Cache is invalidated on
  // BOTH paths: a failed identity switch must not keep serving the prior
  // user's entitlements from cache.
  async logIn(appUserId: string): Promise<boolean> {
    try {
      await Purchases.logIn(appUserId);
      return true;
    } catch (err) {
      logger.warn('RevenueCat logIn failed', { error: String(err) });
      return false;
    } finally {
      this.invalidateCache();
    }
  }

  // Revert to an anonymous store customer. RevenueCat throws
  // LOG_OUT_ANONYMOUS_USER_ERROR when the current user is ALREADY anonymous --
  // the desired state is reached, so that counts as success. Never throws.
  async logOut(): Promise<boolean> {
    try {
      await Purchases.logOut();
      return true;
    } catch (err) {
      const code =
        err != null && typeof err === 'object' && 'code' in err
          ? String((err as Record<string, unknown>).code)
          : null;
      if (code === String(PURCHASES_ERROR_CODE.LOG_OUT_ANONYMOUS_USER_ERROR)) return true;
      logger.warn('RevenueCat logOut failed', { error: String(err) });
      return false;
    } finally {
      this.invalidateCache();
    }
  }

  invalidateCache(): void {
    this.cachedEntitlements = null;
    this.cacheExpiresAt = 0;
  }

  private handlePurchaseError(sku: string, err: unknown): PurchaseResult {
    if (err != null && typeof err === 'object' && 'code' in err) {
      const code = String((err as Record<string, unknown>).code);
      if (code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
        return { sku, status: 'cancelled' };
      }
      // PAYMENT_PENDING_ERROR: Ask-to-Buy waiting on parental approval
      if (code === PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR) {
        return { sku, status: 'pending' };
      }
    }
    logger.warn('RevenueCat purchase error', { sku, error: String(err) });
    return { sku, status: 'error' };
  }
}

// Factory. Configures the SDK when an API key is present; returns a service that
// gracefully fails (empty products, error status) when unconfigured.
// API keys are set as EAS secrets:
//   EXPO_PUBLIC_REVENUECAT_API_KEY_IOS / EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID
export function createRevenueCatIapService(): IapPort {
  const apiKey =
    Platform.OS === 'ios'
      ? process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS
      : process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID;

  if (!apiKey) {
    logger.warn('RevenueCat API key not set — IAP disabled (set EAS secret to enable)');
    // SDK not configured → every call throws UninitializedPurchasesError, which
    // each method catches and converts to a safe default (empty / error status).
    return new RevenueCatIapService();
  }

  try {
    Purchases.configure({ apiKey });
  } catch (err) {
    logger.warn('RevenueCat configure failed', { error: String(err) });
    // Service still returned — methods catch SDK errors individually.
  }

  return new RevenueCatIapService();
}
