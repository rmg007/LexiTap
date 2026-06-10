// Manual Jest mock so tests never load the native RevenueCat SDK.
// Mapped in jest.config.js via moduleNameMapper.

export const mockCustomerInfo = {
  entitlements: {
    active: {} as Record<string, { identifier: string; isActive: boolean }>,
    all: {} as Record<string, { identifier: string; isActive: boolean }>,
  },
  activeSubscriptions: [] as string[],
  allPurchasedProductIdentifiers: [] as string[],
  nonSubscriptionTransactions: [] as unknown[],
  latestExpirationDate: null,
  firstSeen: '2024-01-01T00:00:00Z',
  originalAppUserId: 'anon',
  requestDate: '2024-01-01T00:00:00Z',
  originalApplicationVersion: null,
  originalPurchaseDate: null,
  managementURL: null,
  nonSubscriptions: {},
};

export const mockOfferings = {
  current: {
    identifier: 'default',
    serverDescription: '',
    availablePackages: [] as unknown[],
    lifetime: null,
    annual: null,
    sixMonth: null,
    threeMonth: null,
    twoMonth: null,
    monthly: null,
    weekly: null,
    metadata: {},
  },
  all: {} as Record<string, unknown>,
};

const Purchases = {
  configure: jest.fn(),
  getOfferings: jest.fn().mockResolvedValue(mockOfferings),
  purchasePackage: jest.fn().mockResolvedValue({
    productIdentifier: 'com.lexitap.exam.toefl',
    customerInfo: mockCustomerInfo,
    transaction: { transactionIdentifier: 'txn_mock_123' },
  }),
  restorePurchases: jest.fn().mockResolvedValue(mockCustomerInfo),
  getCustomerInfo: jest.fn().mockResolvedValue(mockCustomerInfo),
  logIn: jest.fn().mockResolvedValue({ customerInfo: mockCustomerInfo, created: false }),
  logOut: jest.fn().mockResolvedValue(mockCustomerInfo),
  addCustomerInfoUpdateListener: jest.fn(),
  removeCustomerInfoUpdateListener: jest.fn(),
};

// Values mirror the REAL enum in @revenuecat/purchases-typescript-internal
// dist/errors.d.ts — a diverging mock would let code pass tests while
// comparing against wrong codes in production.
export const PURCHASES_ERROR_CODE = {
  UNKNOWN_ERROR: '0',
  PURCHASE_CANCELLED_ERROR: '1',
  STORE_PROBLEM_ERROR: '2',
  PURCHASE_NOT_ALLOWED_ERROR: '3',
  PURCHASE_INVALID_ERROR: '4',
  NETWORK_ERROR: '10',
  INVALID_CREDENTIALS_ERROR: '11',
  INVALID_APP_USER_ID_ERROR: '14',
  OPERATION_ALREADY_IN_PROGRESS_ERROR: '15',
  UNKNOWN_BACKEND_ERROR: '16',
  INVALID_APPLE_SUBSCRIPTION_KEY_ERROR: '17',
  INELIGIBLE_ERROR: '18',
  INSUFFICIENT_PERMISSIONS_ERROR: '19',
  PAYMENT_PENDING_ERROR: '20',
  INVALID_SUBSCRIBER_ATTRIBUTES_ERROR: '21',
  LOG_OUT_ANONYMOUS_USER_ERROR: '22',
};

export const LOG_LEVEL = {
  VERBOSE: 'VERBOSE',
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  SILENT: 'SILENT',
};

export default Purchases;
