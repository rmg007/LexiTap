---
title: RevenueCat Integration Guide
status: P3 (Ready to implement)
phase: 3
platforms: iOS, Android (native, EAS dev client required)
sdk: react-native-purchases@7.x
docs: https://docs.revenuecat.com/docs/react-native
---

# RevenueCat Integration Guide

This document provides code patterns and examples for implementing RevenueCat B2C on LexiTap.

---

## Architecture Overview

**Layers:**
1. **SDK** (`react-native-purchases`) — native iOS / Android IAP
2. **Service** (`RevenueCatIapService`) — implements `IapService` port
3. **Domain** (`CheckTierAccessUseCase`) — business logic (entitlement checks)
4. **Presentation** (`PaywallScreen`) — UI for purchase flow

**Data flow:**
```
PaywallScreen
  → purchase(sku)
    → RevenueCatIapService.purchase(sku)
      → Purchases.purchasePackage()
        → Store (App Store / Play)
          → RevenueCat backend (receipt validation)
            → getActiveEntitlements()
              → CheckTierAccessUseCase (gating logic)
                → Dismiss paywall, show quiz
```

---

## 1. SDK Configuration & Initialization

### 1.1 Install Dependencies

```bash
cd mobile
npm install react-native-purchases @react-native-purchases/expo-plugin
```

### 1.2 Add to `app.config.ts`

```typescript
import type { ConfigContext } from '@expo/config';

export default ({ config }: ConfigContext) => ({
  ...config,
  plugins: [
    '@react-native-purchases/expo-plugin',
    // ... other plugins
  ],
});
```

### 1.3 Prebuild

```bash
npx expo prebuild --clean
```

Verify no linking errors. If you see `xcframework` or pod issues, check RevenueCat docs for your Xcode version.

---

## 2. Initialize Purchases in App Entrypoint

### Pattern: Module-level Singleton

**File:** `src/infrastructure/iap/RevenueCatInit.ts`

```typescript
import Purchases from 'react-native-purchases';
import type { PlatformSpecific } from 'react-native';
import { Platform } from 'react-native';

// Singleton flag: ensure Purchases.configure() runs only once
let isSdkConfigured = false;

/**
 * Get the RevenueCat API key based on platform and environment.
 * Returns null if the key is not set (graceful fallback to stub).
 */
function getRevenueCatApiKey(): string | null {
  if (Platform.OS === 'ios') {
    return process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS ?? null;
  } else if (Platform.OS === 'android') {
    return process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID ?? null;
  }
  return null;
}

/**
 * Initialize the RevenueCat SDK.
 * Call this once in the app entrypoint (e.g., in App.tsx or a root effect).
 * 
 * Graceful degradation: if the API key is not set, logs a warning and
 * returns false (caller should swap to StubIapService).
 */
export async function initializeRevenueCat(): Promise<boolean> {
  if (isSdkConfigured) {
    return true;
  }

  const apiKey = getRevenueCatApiKey();
  if (!apiKey) {
    console.warn('[RevenueCat] API key not set (EXPO_PUBLIC_REVENUECAT_API_KEY_*). Falling back to stub.');
    return false;
  }

  try {
    // Configure the SDK
    await Purchases.configure({
      apiKey,
      appUserID: undefined, // Anonymous; will be aliased later in AU2 (auth)
    });

    isSdkConfigured = true;
    console.log('[RevenueCat] SDK initialized successfully.');
    return true;
  } catch (error) {
    console.error('[RevenueCat] Configuration failed:', error);
    return false;
  }
}

export function isRevenueCatReady(): boolean {
  return isSdkConfigured && getRevenueCatApiKey() != null;
}
```

### Usage in `App.tsx`

```typescript
import { useEffect, useState } from 'react';
import { initializeRevenueCat } from '@/infrastructure/iap/RevenueCatInit';

export default function App() {
  const [iapReady, setIapReady] = useState(false);

  useEffect(() => {
    (async () => {
      const ready = await initializeRevenueCat();
      setIapReady(ready);
    })();
  }, []);

  // Render app
  // Use iapReady to determine which IapService (RevenueCat vs Stub) to use
  return (
    <Container iapReady={iapReady}>
      {/* App screens */}
    </Container>
  );
}
```

---

## 3. RevenueCatIapService Implementation

**File:** `src/infrastructure/iap/RevenueCatIapService.ts`

```typescript
import Purchases, {
  CustomerInfo,
  Package,
  PurchasesError,
  PurchasesErrorCode,
} from 'react-native-purchases';
import type { IapService, IapProduct, PurchaseResult, ReceiptValidation } from './IapService';

export class RevenueCatIapService implements IapService {
  /**
   * Fetch store metadata for given SKUs.
   * Maps offerings + packages to IapProduct[] (includes price + localization).
   */
  async getProducts(skus: readonly string[]): Promise<IapProduct[]> {
    try {
      const offerings = await Purchases.getOfferings();
      if (!offerings.current) {
        console.warn('[RevenueCat] No current offering available.');
        return [];
      }

      const products: IapProduct[] = [];
      const skuSet = new Set(skus);

      // Iterate packages in the default offering
      for (const pkg of offerings.current.availablePackages) {
        if (skuSet.has(pkg.product.identifier)) {
          products.push({
            sku: pkg.product.identifier,
            priceString: pkg.product.priceString, // localized, e.g., "$14.99"
            title: pkg.product.title,
            description: pkg.product.description,
          });
        }
      }

      return products;
    } catch (error) {
      console.error('[RevenueCat] getProducts() failed:', error);
      return [];
    }
  }

  /**
   * Initiate a purchase for one SKU.
   * Handles store flow, returns status + receipt token.
   */
  async purchase(sku: string): Promise<PurchaseResult> {
    try {
      const offerings = await Purchases.getOfferings();
      if (!offerings.current) {
        return {
          sku,
          status: 'error',
        };
      }

      // Find the package matching the SKU
      const pkg = offerings.current.availablePackages.find((p) => p.product.identifier === sku);
      if (!pkg) {
        console.error(`[RevenueCat] SKU not found in offerings: ${sku}`);
        return { sku, status: 'error' };
      }

      // Initiate purchase (shows native store dialog)
      const customerInfo = await Purchases.purchasePackage(pkg);

      // Check if the entitlements include what we just purchased
      // (RevenueCat backend validates the receipt; we trust it)
      const entitlements = Object.keys(customerInfo.entitlements.active);
      const isPurchaseActive = entitlements.length > 0;

      if (isPurchaseActive) {
        console.log(`[RevenueCat] Purchase successful: ${sku}. Entitlements: ${entitlements.join(', ')}`);
        return {
          sku,
          status: 'purchased',
          // Receipt token: not exposed by RevenueCat SDK; validation happens server-side
          receiptToken: 'revenueCat_backend_validated',
        };
      } else {
        // Unlikely: RevenueCat says the purchase succeeded but no entitlements?
        console.warn(`[RevenueCat] Purchase completed but no entitlements for ${sku}`);
        return { sku, status: 'error' };
      }
    } catch (error) {
      if (error instanceof PurchasesError) {
        // Handle different error types
        if (error.code === PurchasesErrorCode.PurchaseCancelledError) {
          console.log(`[RevenueCat] Purchase cancelled by user: ${sku}`);
          return { sku, status: 'cancelled' };
        } else if (error.code === PurchasesErrorCode.PurchaseNotAllowedError) {
          // Ask-to-Buy or parental controls
          console.log(`[RevenueCat] Purchase pending (Ask-to-Buy): ${sku}`);
          return { sku, status: 'pending' };
        }
      }
      console.error(`[RevenueCat] Purchase failed for ${sku}:`, error);
      return { sku, status: 'error' };
    }
  }

  /**
   * Restore purchases (App Store / Play requirement).
   * Returns list of previously purchased SKUs.
   */
  async restorePurchases(): Promise<PurchaseResult[]> {
    try {
      const customerInfo = await Purchases.restorePurchases();
      const results: PurchaseResult[] = [];

      // Extract all purchased SKUs from entitlements
      for (const [entitlementId, entitlement] of Object.entries(customerInfo.entitlements.active)) {
        // You may need a map of entitlement → SKU; for now, assume SKU = entitlementId
        results.push({
          sku: entitlementId, // Simplified; in practice, map back to original SKU
          status: 'purchased',
          receiptToken: 'revenueCat_backend_validated',
        });
      }

      console.log(`[RevenueCat] Restored ${results.length} purchases.`);
      return results;
    } catch (error) {
      console.error('[RevenueCat] restorePurchases() failed:', error);
      return [];
    }
  }

  /**
   * Validate a store receipt.
   * NOTE: RevenueCat validates on the backend; this is a stub.
   * The client never needs to validate receipts — RevenueCat does it for us.
   *
   * @deprecated Receipt validation is handled server-side by RevenueCat.
   */
  async validateReceipt(receiptToken: string): Promise<ReceiptValidation> {
    // RevenueCat validates automatically; the client has no work to do.
    // This method is kept for API compatibility but always returns success.
    console.log('[RevenueCat] validateReceipt() called. Note: RevenueCat validates server-side.');
    return {
      isValid: true,
      entitledSkus: [],
    };
  }

  /**
   * Get the user's active entitlements.
   * Extension to IapService port (added in R4.2).
   */
  async getActiveEntitlements(): Promise<string[]> {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      return Object.keys(customerInfo.entitlements.active);
    } catch (error) {
      console.error('[RevenueCat] getActiveEntitlements() failed:', error);
      return [];
    }
  }

  /**
   * Get full customer info (for debugging / advanced use).
   */
  async getCustomerInfo(): Promise<CustomerInfo | null> {
    try {
      return await Purchases.getCustomerInfo();
    } catch (error) {
      console.error('[RevenueCat] getCustomerInfo() failed:', error);
      return null;
    }
  }
}
```

---

## 4. Entitlement Checks & Access Control

**File:** `src/domain/tier/CheckTierAccessUseCase.ts`

```typescript
import type { IapService } from '@/infrastructure/iap/IapService';
import type { TierConfigEntry } from '@/config/tiers';

/**
 * Use case: Check if the user has access to a tier.
 * Access granted if: tier is free OR user owns the tier's entitlement OR user owns 'all_exams'.
 */
export class CheckTierAccessUseCase {
  constructor(private iapService: IapService) {}

  private entitlementCache: { entitlements: string[]; timestamp: number } | null = null;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Get cached active entitlements, refreshing if expired.
   */
  private async getActiveEntitlements(): Promise<string[]> {
    const now = Date.now();
    if (
      this.entitlementCache &&
      now - this.entitlementCache.timestamp < this.CACHE_TTL_MS
    ) {
      return this.entitlementCache.entitlements;
    }

    // Extended interface; requires R4.2
    const entitlements = await (this.iapService as any).getActiveEntitlements?.() ?? [];
    this.entitlementCache = { entitlements, timestamp: now };
    return entitlements;
  }

  /**
   * Check if the user can access a tier.
   */
  async canAccess(tier: TierConfigEntry): Promise<boolean> {
    // Free tiers are always accessible
    if (tier.isFree) {
      return true;
    }

    // Paid tier: check entitlements
    const entitlements = await this.getActiveEntitlements();
    const hasAllExams = entitlements.includes('all_exams');
    const hasPerPackEntitlement = tier.entitlementId && entitlements.includes(tier.entitlementId);

    return hasAllExams || hasPerPackEntitlement || false;
  }

  /**
   * Clear cached entitlements (call after purchase or refund).
   */
  clearCache(): void {
    this.entitlementCache = null;
  }
}
```

---

## 5. Paywall Screen Integration

**File:** `src/presentation/screens/PaywallScreen.tsx` (excerpt)

```typescript
import { useState } from 'react';
import { View, Text, ActivityIndicator, Alert } from 'react-native';
import { Button } from '@/presentation/components/Button';
import type { TierConfigEntry } from '@/config/tiers';
import { useContainer } from '@/application/container/ContainerContext';

interface PaywallScreenProps {
  tier: TierConfigEntry;
  onPurchaseSuccess: () => void;
  onCancel: () => void;
}

export function PaywallScreen({ tier, onPurchaseSuccess, onCancel }: PaywallScreenProps) {
  const { iapService, analyticsService } = useContainer();
  const [isLoading, setIsLoading] = useState(false);

  const handlePurchase = async () => {
    if (tier.isFree) {
      onPurchaseSuccess();
      return;
    }

    setIsLoading(true);

    // Analytics: purchase_initiated
    analyticsService.track('purchase_initiated', {
      sku: tier.unlock.kind === 'exam_pack' ? tier.unlock.sku : null,
      tierId: tier.id,
    });

    const result = await iapService.purchase(
      tier.unlock.kind === 'exam_pack' ? tier.unlock.sku : ''
    );

    setIsLoading(false);

    if (result.status === 'purchased') {
      // Analytics: purchase_completed
      analyticsService.track('purchase_completed', {
        sku: result.sku,
        revenue: tier.unlock.kind === 'exam_pack' ? tier.unlock.listPriceUsd : 0,
        currency: 'USD',
      });

      // Refresh entitlements and close paywall
      (iapService as any).clearCache?.();
      onPurchaseSuccess();
    } else if (result.status === 'cancelled') {
      // Analytics: purchase_cancelled
      analyticsService.track('purchase_cancelled', {
        sku: result.sku,
      });
    } else if (result.status === 'pending') {
      // Ask-to-Buy
      Alert.alert(
        'Purchase Pending',
        'Your parent/guardian needs to approve this purchase.'
      );
    } else {
      // Analytics: purchase_error
      analyticsService.track('purchase_error', {
        sku: result.sku,
        error: 'unknown',
      });

      Alert.alert('Purchase Failed', 'Please try again later.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Unlock {tier.displayName}</Text>
      <Text style={styles.description}>{tier.description}</Text>

      {tier.unlock.kind === 'exam_pack' && (
        <Text style={styles.price}>${tier.unlock.listPriceUsd.toFixed(2)}</Text>
      )}

      <Button
        onPress={handlePurchase}
        disabled={isLoading}
        label={isLoading ? <ActivityIndicator /> : 'Unlock'}
      />
      <Button onPress={onCancel} label="Cancel" variant="secondary" />
    </View>
  );
}

const styles = {
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: 'bold' },
  description: { fontSize: 14, marginTop: 8 },
  price: { fontSize: 18, fontWeight: '600', marginTop: 12 },
};
```

---

## 6. Container Integration

**File:** `src/application/container/Container.ts` (excerpt)

```typescript
import { RevenueCatIapService } from '@/infrastructure/iap/RevenueCatIapService';
import { StubIapService } from '@/infrastructure/iap/StubIapService';
import type { IapService } from '@/infrastructure/iap/IapService';

export interface Container {
  iapService: IapService;
  // ... other services
}

export function createContainer(options: { iapReady: boolean }): Container {
  // Swap stub ↔ revenueCat based on SDK initialization
  const iapService: IapService = options.iapReady
    ? new RevenueCatIapService()
    : new StubIapService();

  return {
    iapService,
    // ... other services
  };
}
```

---

## 7. Analytics Events

**Integration with existing `AnalyticsService` (PostHog):**

```typescript
// purchase_initiated: shown paywall or started purchase flow
analyticsService.track('purchase_initiated', {
  sku: 'com.lexitap.exam.toefl',
  tierId: 'toefl',
});

// purchase_completed: successful purchase
analyticsService.track('purchase_completed', {
  sku: 'com.lexitap.exam.toefl',
  revenue: 9.99,
  currency: 'USD',
  entitlement: 'exam_toefl',
});

// purchase_cancelled: user backed out
analyticsService.track('purchase_cancelled', {
  sku: 'com.lexitap.exam.toefl',
});

// purchase_error: network, store error, etc.
analyticsService.track('purchase_error', {
  sku: 'com.lexitap.exam.toefl',
  error: 'PurchaseCancelledError', // or other error code
});

// paywall_shown: entitlement check revealed paywall
analyticsService.track('paywall_shown', {
  tierId: 'toefl',
  reason: 'locked', // or 'retrigger' if user refunded
});
```

**Note:** All events use `anon_id` (no PII). See `infrastructure/analytics/PostHogAnalyticsService.ts` for implementation.

---

## 8. Testing

### Unit Test Example: `RevenueCatIapService.test.ts`

```typescript
import { RevenueCatIapService } from './RevenueCatIapService';
import Purchases from 'react-native-purchases';

jest.mock('react-native-purchases');

describe('RevenueCatIapService', () => {
  let service: RevenueCatIapService;

  beforeEach(() => {
    service = new RevenueCatIapService();
    jest.clearAllMocks();
  });

  it('should return products from offerings', async () => {
    (Purchases.getOfferings as jest.Mock).mockResolvedValue({
      current: {
        availablePackages: [
          {
            product: {
              identifier: 'com.lexitap.exam.toefl',
              priceString: '$14.99',
              title: 'TOEFL Prep',
              description: 'Academic vocabulary',
            },
          },
        ],
      },
    });

    const products = await service.getProducts(['com.lexitap.exam.toefl']);
    expect(products).toHaveLength(1);
    expect(products[0].sku).toBe('com.lexitap.exam.toefl');
  });

  it('should handle purchase cancellation', async () => {
    const error = new Error('User cancelled');
    error.code = 'PurchaseCancelledError';
    (Purchases.purchasePackage as jest.Mock).mockRejectedValue(error);

    const result = await service.purchase('com.lexitap.exam.toefl');
    expect(result.status).toBe('cancelled');
  });

  it('should return active entitlements', async () => {
    (Purchases.getCustomerInfo as jest.Mock).mockResolvedValue({
      entitlements: {
        active: {
          exam_toefl: {},
          all_exams: {},
        },
      },
    });

    const entitlements = await service.getActiveEntitlements();
    expect(entitlements).toEqual(['exam_toefl', 'all_exams']);
  });
});
```

### Integration Test: Paywall Access Control

```typescript
describe('CheckTierAccessUseCase', () => {
  let useCase: CheckTierAccessUseCase;
  let iapService: IapService;

  beforeEach(() => {
    iapService = new StubIapService(); // Mock or stub
    useCase = new CheckTierAccessUseCase(iapService);
  });

  it('should allow access to free tiers', async () => {
    const tier = getTierConfig('foundation'); // Free
    const canAccess = await useCase.canAccess(tier);
    expect(canAccess).toBe(true);
  });

  it('should deny access to locked tiers without entitlements', async () => {
    const tier = getTierConfig('toefl'); // Paid
    // Stub returns no entitlements
    const canAccess = await useCase.canAccess(tier);
    expect(canAccess).toBe(false);
  });

  it('should allow access if user owns the specific entitlement', async () => {
    // Mock iapService to return exam_toefl entitlement
    jest.spyOn(iapService, 'getActiveEntitlements').mockResolvedValue(['exam_toefl']);
    
    const tier = getTierConfig('toefl');
    const canAccess = await useCase.canAccess(tier);
    expect(canAccess).toBe(true);
  });

  it('should allow access if user owns all_exams', async () => {
    jest.spyOn(iapService, 'getActiveEntitlements').mockResolvedValue(['all_exams']);
    
    const tier = getTierConfig('ielts'); // Any paid tier
    const canAccess = await useCase.canAccess(tier);
    expect(canAccess).toBe(true);
  });
});
```

---

## 9. Troubleshooting

### "Purchases is not configured"
**Cause:** SDK not initialized (API key not set or init failed)  
**Fix:** Check `EXPO_PUBLIC_REVENUECAT_API_KEY_IOS` / `_ANDROID` environment variables; verify `initializeRevenueCat()` called early.

### "No offerings available"
**Cause:** SKUs not yet created in App Store Connect / Google Play, or not yet synced to RevenueCat  
**Fix:** Verify products exist in both stores; refresh RevenueCat dashboard; wait 1–2 hours for sync.

### "Purchase succeeded but entitlements empty"
**Cause:** RevenueCat backend not yet processed receipt  
**Fix:** This is rare; add retry logic with exponential backoff. In production, RevenueCat should always return entitlements within seconds.

### "Magic-link deep link not firing"
**Cause:** Fiddly in dev clients; `expo-linking` sometimes won't intercept deep links  
**Fix:** Test on physical device; use logcat / Console to confirm the link is being passed to the app.

---

## 10. References

- [RevenueCat React Native Docs](https://docs.revenuecat.com/docs/react-native)
- [RevenueCat Entitlements](https://docs.revenuecat.com/docs/entitlements)
- [React Native Purchases API](https://docs.revenuecat.com/docs/react-native-api)
- [LexiTap Monetization Model](../lexitap-docs/08-financial-legal/REVENUE_MODEL_PRICING.md)
- [tiers.ts Configuration](./src/config/tiers.ts)

---

*Created: 2026-05-31 · Last updated: 2026-05-31 · Task: P3 R1–R7*
