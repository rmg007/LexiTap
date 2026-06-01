// Public surface of the iap infrastructure module.
export type {
  IapService,
  IapProduct,
  PurchaseResult,
  PurchaseStatus,
  ReceiptValidation,
} from '@/infrastructure/iap/IapService';
export { StubIapService } from '@/infrastructure/iap/StubIapService';
export { RevenueCatIapService, createRevenueCatIapService } from '@/infrastructure/iap/RevenueCatIapService';
