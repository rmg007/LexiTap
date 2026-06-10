import type {
  IapPort,
  IapProduct,
  PurchaseResult,
  ReceiptValidation,
} from '@/domain/iap/IapPort';

// No-op IAP implementation of the domain IapPort. Lets the app build and the
// paywall render an empty/disabled state without a real store SDK. The
// production path is RevenueCatIapService (env-gated factory); this stub is
// the test double and the documented fallback shape.
export class StubIapService implements IapPort {
  async getProducts(_skus: readonly string[]): Promise<IapProduct[]> {
    // No store connected yet: no products to display.
    return [];
  }

  async purchase(sku: string): Promise<PurchaseResult> {
    // Cannot complete a purchase without a store SDK; report a non-crashing
    // error status the paywall can surface.
    return { sku, status: 'error' };
  }

  async restorePurchases(): Promise<PurchaseResult[] | null> {
    // No store SDK → a restore cannot be performed at all. null = failure,
    // NOT "[] = user owns nothing" (per the IapPort contract).
    return null;
  }

  async validateReceipt(_receiptToken: string): Promise<ReceiptValidation> {
    // Nothing to validate against yet; treat as invalid (grants no access).
    return { isValid: false, entitledSkus: [] };
  }

  async getActiveEntitlements(): Promise<readonly string[]> {
    // No store connected; user owns nothing.
    return [];
  }

  // Last id passed to logIn (null after logOut) — observable by tests that
  // assert the container's alias wiring.
  lastAppUserId: string | null = null;

  async logIn(appUserId: string): Promise<boolean> {
    // No store SDK to alias against; record for test assertions only.
    this.lastAppUserId = appUserId;
    return true;
  }

  async logOut(): Promise<boolean> {
    this.lastAppUserId = null;
    return true;
  }
}
