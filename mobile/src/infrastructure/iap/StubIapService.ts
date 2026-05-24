import type {
  IapService,
  IapProduct,
  PurchaseResult,
  ReceiptValidation,
} from '@/infrastructure/iap/IapService';

// No-op IAP implementation. Lets the app build and the paywall render an empty/
// disabled state without a real store SDK.
//
// TODO(iap): replace with RevenueCatIapService (react-native-purchases) at
// Phase 3 — RevenueCat is the locked vendor; do NOT wire the deprecated
// expo-in-app-purchases. See
// lexitap-docs/08-financial-legal/THIRD_PARTY_DEPENDENCY_AUDIT.md. No real IAP
// dependency is installed yet by design.
export class StubIapService implements IapService {
  async getProducts(_skus: readonly string[]): Promise<IapProduct[]> {
    // No store connected yet: no products to display.
    return [];
  }

  async purchase(sku: string): Promise<PurchaseResult> {
    // Cannot complete a purchase without a store SDK; report a non-crashing
    // error status the paywall can surface.
    return { sku, status: 'error' };
  }

  async restorePurchases(): Promise<PurchaseResult[]> {
    return [];
  }

  async validateReceipt(_receiptToken: string): Promise<ReceiptValidation> {
    // Nothing to validate against yet; treat as invalid (grants no access).
    return { isValid: false, entitledSkus: [] };
  }
}
