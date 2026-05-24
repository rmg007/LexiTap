// Clean in-app-purchase PORT, defined in infrastructure because the IAP vendor
// is itself an infrastructure concern and no domain port exists for it. The
// application layer depends on this interface, not a concrete vendor SDK.
//
// RevenueCat (react-native-purchases) is the locked IAP vendor, chosen over
// expo-iap and the deprecated expo-in-app-purchases — see
// lexitap-docs/08-financial-legal/THIRD_PARTY_DEPENDENCY_AUDIT.md. The native
// SDK install is deferred to Phase 3; until then we deliberately ship a no-op
// stub (StubIapService) and add NO real IAP dependency.

// A purchasable product (a paid content tier), surfaced on the paywall.
export interface IapProduct {
  // Store product id, matching content_tiers.sku (e.g. 'com.lexitap.toefl').
  readonly sku: string;
  readonly priceString: string; // localized, store-formatted (e.g. "$14.99")
  readonly title: string;
  readonly description: string;
}

export type PurchaseStatus = 'purchased' | 'cancelled' | 'pending' | 'error';

export interface PurchaseResult {
  readonly sku: string;
  readonly status: PurchaseStatus;
  // Opaque store receipt token, persisted to user_entitlements.receipt_token
  // and re-validated server-side. Absent when the purchase did not complete.
  readonly receiptToken?: string;
}

export interface ReceiptValidation {
  readonly isValid: boolean;
  // SKUs the receipt entitles (a Premium Pass receipt may entitle many).
  readonly entitledSkus: readonly string[];
}

export interface IapService {
  // Fetch store metadata for the given SKUs (pricing is localized by the store).
  getProducts(skus: readonly string[]): Promise<IapProduct[]>;
  // Begin a purchase flow for one SKU; resolves once the store flow settles.
  purchase(sku: string): Promise<PurchaseResult>;
  // Re-grant entitlements the user already owns (App Store / Play requirement).
  restorePurchases(): Promise<PurchaseResult[]>;
  // Validate a store receipt (server-side validation handled by RevenueCat).
  validateReceipt(receiptToken: string): Promise<ReceiptValidation>;
}
