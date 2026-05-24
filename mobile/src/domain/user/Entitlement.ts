import type { TierId } from '@/domain/vocabulary/ids';

// Entitlement value object + the access decision shape. The ACCESS DECISION
// itself is application-layer logic (Premium Pass etc.); this is just the data.

export interface Entitlement {
  tierId: TierId;
  purchasedAt: number;
  expiresAt: number | null; // null = one-time, set = annual
  receiptToken?: string;
}

export type TierAccessReason = 'free' | 'purchased' | 'premium_pass' | 'promo' | 'locked';

export interface TierAccess {
  tierId: TierId;
  hasAccess: boolean;
  reason: TierAccessReason;
}

// PORT implemented in infrastructure/db.
export interface EntitlementRepository {
  getAll(): Promise<Entitlement[]>;
  upsert(e: Entitlement): Promise<void>;
}
