// Public surface of the iap infrastructure module. The port + types live in
// the domain layer (@/domain/iap/IapPort) — re-exported here for convenience;
// the legacy duplicate infrastructure/iap/IapService.ts was deleted (one port,
// one source of truth).
export type {
  IapPort,
  IapProduct,
  PurchaseResult,
  PurchaseStatus,
  ReceiptValidation,
} from '@/domain/iap/IapPort';
export { StubIapService } from '@/infrastructure/iap/StubIapService';
export { RevenueCatIapService, createRevenueCatIapService } from '@/infrastructure/iap/RevenueCatIapService';
