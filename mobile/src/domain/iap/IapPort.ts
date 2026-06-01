// IAP port — the interface the application and presentation layers depend on.
// Concrete adapters (RevenueCatIapService, StubIapService) live in infrastructure.
// Keeping types here prevents presentation from importing infrastructure.

export interface IapProduct {
  readonly sku: string;
  readonly priceString: string; // localized, store-formatted (e.g. "$9.99")
  readonly title: string;
  readonly description: string;
}

export type PurchaseStatus = 'purchased' | 'cancelled' | 'pending' | 'error';

export interface PurchaseResult {
  readonly sku: string;
  readonly status: PurchaseStatus;
  // Opaque store receipt token (absent when purchase did not complete).
  readonly receiptToken?: string;
}

export interface ReceiptValidation {
  readonly isValid: boolean;
  readonly entitledSkus: readonly string[];
}

export interface IapPort {
  getProducts(skus: readonly string[]): Promise<IapProduct[]>;
  purchase(sku: string): Promise<PurchaseResult>;
  restorePurchases(): Promise<PurchaseResult[]>;
  // RevenueCat validates server-side; client calls this for legacy compat only.
  validateReceipt(receiptToken: string): Promise<ReceiptValidation>;
  // Active RevenueCat entitlement identifiers for the current user.
  // Throws when the SDK is offline; callers should treat that as no access.
  getActiveEntitlements(): Promise<readonly string[]>;
}
